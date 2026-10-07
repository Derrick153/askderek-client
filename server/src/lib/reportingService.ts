import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

// -----------------------------------------------------------------------------
//  reportingService.ts
//
//  Step 19 - Reporting & Analytics.
//
//  This is the ONE authoritative source for every reporting metric AskDerek
//  shows anywhere (dashboard cards, exports, drill-downs). A number must mean
//  the same thing everywhere it appears - so nothing outside this file should
//  recompute a metric defined here. Controllers call these functions and
//  format the result; they do not reimplement the math.
//
//  Every function here aggregates in the DATABASE (groupBy / aggregate / count)
//  - never by loading raw rows and reducing them in Node. This matches the
//  pattern already proven in Step 16's getHostelStatistics/getHostelOccupancy.
//
//  AUTHORIZATION IS NOT HANDLED HERE. Every function takes a `ReportScope`
//  that the CALLER (the controller) must have already verified the caller is
//  entitled to see - either a specific propertyId they manage, a managerClerkId
//  equal to their own id, or {} (platform-wide) which only an ADMIN caller may
//  ever construct. This file trusts the scope it is given.
// -----------------------------------------------------------------------------

export interface ReportScope {
  propertyId?: number;
  managerClerkId?: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

// A metric that has no underlying data for the period must say so, not
// report 0 - those are different meanings (Step 19 spec, Phase 20).
export type MetricValue = number | null;

// -----------------------------------------------------------------------------
//  Scope-filter builders
//
//  Lease / Booking / SemesterPlan / Room all store propertyId directly.
//  Payment / Transaction only store leaseId / semesterPlanId - to scope those
//  by property we have to go through the lease or semesterPlan relation.
// -----------------------------------------------------------------------------

function directPropertyScope(scope: ReportScope) {
  if (scope.propertyId !== undefined) {
    return { propertyId: scope.propertyId };
  }
  if (scope.managerClerkId) {
    return { property: { managerClerkId: scope.managerClerkId } };
  }
  return {};
}

function bedPropertyScope(scope: ReportScope) {
  if (scope.propertyId !== undefined) {
    return { room: { propertyId: scope.propertyId } };
  }
  if (scope.managerClerkId) {
    return { room: { property: { managerClerkId: scope.managerClerkId } } };
  }
  return {};
}

function paymentPropertyScope(scope: ReportScope) {
  if (scope.propertyId !== undefined) {
    return {
      OR: [
        { lease: { propertyId: scope.propertyId } },
        { semesterPlan: { propertyId: scope.propertyId } },
      ],
    };
  }
  if (scope.managerClerkId) {
    return {
      OR: [
        { lease: { property: { managerClerkId: scope.managerClerkId } } },
        { semesterPlan: { property: { managerClerkId: scope.managerClerkId } } },
      ],
    };
  }
  return {};
}

// -----------------------------------------------------------------------------
//  OCCUPANCY
//
//  Definition (hostel beds only - this platform has no bed-level concept for
//  plain rental leases):
//    - A retired bed (isRetired = true) is permanently removed from inventory.
//      It is reported separately and excluded from every count below.
//    - totalBeds        = all non-retired beds in scope.
//    - available        = non-retired beds with status AVAILABLE.
//    - reserved         = non-retired beds with status RESERVED
//                          (approved booking, student has not checked in yet).
//    - occupied         = non-retired beds with status OCCUPIED
//                          (student has actually checked in).
//    - maintenance      = non-retired beds with status MAINTENANCE.
//    - occupancyRate    = occupied / totalBeds. Reserved beds are NOT counted
//                          as occupied - a reservation is not an occupancy.
//    - utilizationRate  = (occupied + reserved) / totalBeds - a separate,
//                          explicitly-different number: "how much of my
//                          inventory is spoken for," vs occupancyRate's
//                          "how much is actually in use right now."
// -----------------------------------------------------------------------------

export async function getOccupancyMetrics(scope: ReportScope) {
  const [totalRooms, bedGroups] = await Promise.all([
    prisma.room.count({ where: { ...directPropertyScope(scope), isActive: true } }),
    prisma.bed.groupBy({
      by: ["status", "isRetired"],
      where: bedPropertyScope(scope),
      _count: { _all: true },
    }),
  ]);

  let available = 0, reserved = 0, occupied = 0, maintenance = 0, retired = 0;

  for (const row of bedGroups) {
    if (row.isRetired) {
      retired += row._count._all;
      continue;
    }
    if (row.status === "AVAILABLE") available += row._count._all;
    else if (row.status === "RESERVED") reserved += row._count._all;
    else if (row.status === "OCCUPIED") occupied += row._count._all;
    else if (row.status === "MAINTENANCE") maintenance += row._count._all;
  }

  const totalBeds: number = available + reserved + occupied + maintenance;

  return {
    totalRooms,
    totalBeds,
    retiredBeds: retired,
    available,
    reserved,
    occupied,
    maintenance,
    occupancyRate: totalBeds > 0 ? occupied / totalBeds : (null as MetricValue),
    utilizationRate: totalBeds > 0 ? (occupied + reserved) / totalBeds : (null as MetricValue),
  };
}

// -----------------------------------------------------------------------------
//  REVENUE
//
//  Definition - Payment is the financial source of truth (never recalculated
//  from today's pricing):
//    - bookingValue        = SUM(Payment.amountDue) for Payment rows CREATED
//                             in the period. What was billed, not what came in.
//    - received            = SUM(Payment.amountPaid) for Payment rows whose
//                             paymentDate falls in the period and whose status
//                             is Paid or PartiallyPaid. Actual money collected.
//    - failed               = SUM(Transaction.amount) for Transactions with
//                             status Failed, created in the period.
//    - refunded             = SUM(Transaction.amount) for Transactions with
//                             status Refunded, created in the period. (No
//                             refund flow is wired up anywhere in AskDerek yet,
//                             so this will always read 0 today - that is a
//                             true zero, not a missing metric.)
//    - outstanding           = SUM(amountDue - amountPaid) for Payment rows
//                             with status Pending/PartiallyPaid/Overdue and a
//                             dueDate on or before the end of the period. A
//                             snapshot "as of" figure, not a period total.
// -----------------------------------------------------------------------------

export async function getRevenueMetrics(scope: ReportScope, range: DateRange) {
  const payScope = paymentPropertyScope(scope);

  // received  = money actually collected (payment ledger), with a Hostel / Rent split.
  // outstanding = rent still owed on the ledger + hostel bookings that were approved
  //   but are not paid yet (those have no ledger row until the student pays).
  const [
    bookingValueAgg,
    receivedAgg,
    receivedHostelAgg,
    receivedRentAgg,
    failedAgg,
    refundedAgg,
    ledgerOutstandingAgg,
    hostelAwaitingAgg,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { createdAt: { gte: range.from, lte: range.to }, ...payScope },
      _sum: { amountDue: true },
    }),
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: range.from, lte: range.to },
        paymentStatus: { in: ["Paid", "PartiallyPaid"] },
        ...payScope,
      },
      _sum: { amountPaid: true },
    }),
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: range.from, lte: range.to },
        paymentStatus: { in: ["Paid", "PartiallyPaid"] },
        ...payScope,
        semesterPlan: { isNot: null },
      },
      _sum: { amountPaid: true },
    }),
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: range.from, lte: range.to },
        paymentStatus: { in: ["Paid", "PartiallyPaid"] },
        ...payScope,
        lease: { isNot: null },
      },
      _sum: { amountPaid: true },
    }),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: range.from, lte: range.to }, status: "Failed", ...payScope },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: range.from, lte: range.to }, status: "Refunded", ...payScope },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        dueDate: { lte: range.to },
        paymentStatus: { in: ["Pending", "PartiallyPaid", "Overdue"] },
        ...payScope,
      },
      _sum: { amountDue: true, amountPaid: true },
    }),
    prisma.semesterPlan.aggregate({
      where: {
        status: "AWAITING_PAYMENT",
        createdAt: { lte: range.to },
        ...directPropertyScope(scope),
      },
      _sum: { amountPaid: true },
    }),
  ]);

  const received = receivedAgg._sum.amountPaid ?? 0;
  const receivedHostel = receivedHostelAgg._sum.amountPaid ?? 0;
  const receivedRent = receivedRentAgg._sum.amountPaid ?? 0;

  const ledgerOutstanding =
    (ledgerOutstandingAgg._sum.amountDue ?? 0) - (ledgerOutstandingAgg._sum.amountPaid ?? 0);
  const hostelAwaitingPayment = hostelAwaitingAgg._sum.amountPaid ?? 0;

  return {
    bookingValue: bookingValueAgg._sum.amountDue ?? 0,
    received,
    receivedByProduct: {
      hostel: receivedHostel,
      rent: receivedRent,
      other: received - receivedHostel - receivedRent,
    },
    failed: failedAgg._sum.amount ?? 0,
    refunded: refundedAgg._sum.amount ?? 0,
    outstanding: ledgerOutstanding + hostelAwaitingPayment,
    outstandingBreakdown: {
      ledger: ledgerOutstanding,
      hostelAwaitingPayment,
    },
  };
}

// -----------------------------------------------------------------------------
//  COLLECTION RATE
//
//  Definition - of everything that came DUE within the period (by dueDate,
//  regardless of when or whether it was eventually paid), what fraction of
//  that amount has actually been collected so far.
//    numerator   = SUM(Payment.amountPaid) for Payment rows with a dueDate
//                  in the period.
//    denominator = SUM(Payment.amountDue) for the same rows.
//  Returns null (not 0) when there was nothing due in the period at all -
//  "no data" and "collected nothing of what was due" are different facts.
// -----------------------------------------------------------------------------

export async function getCollectionRate(scope: ReportScope, range: DateRange): Promise<MetricValue> {
  const agg = await prisma.payment.aggregate({
    where: { dueDate: { gte: range.from, lte: range.to }, ...paymentPropertyScope(scope) },
    _sum: { amountDue: true, amountPaid: true },
  });

  const due = agg._sum.amountDue ?? 0;
  if (due <= 0) return null;

  return (agg._sum.amountPaid ?? 0) / due;
}

// -----------------------------------------------------------------------------
//  BOOKINGS
//
//  Combines all three booking types AskDerek has (Lease = long-term rental,
//  Booking = short-stay, SemesterPlan = hostel), counted by CREATED date
//  within the period. Each domain keeps its own native status values rather
//  than being forced into one shared enum, since they are not equivalent
//  (e.g. a short-stay Booking has no "awaiting payment" concept the way a
//  hostel SemesterPlan does).
// -----------------------------------------------------------------------------

export async function getBookingMetrics(scope: ReportScope, range: DateRange) {
  const dateScope = directPropertyScope(scope);
  const createdIn = { createdAt: { gte: range.from, lte: range.to } };

  const [leaseGroups, bookingGroups, semesterGroups] = await Promise.all([
    prisma.lease.groupBy({
      by: ["status"],
      where: { ...createdIn, ...dateScope },
      _count: { _all: true },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      where: { ...createdIn, ...dateScope },
      _count: { _all: true },
    }),
    prisma.semesterPlan.groupBy({
      by: ["status"],
      where: { ...createdIn, ...dateScope },
      _count: { _all: true },
    }),
  ]);

  const toMap = (rows: { status: string; _count: { _all: number } }[]) =>
    Object.fromEntries(rows.map((r) => [r.status, r._count._all]));

  const lease    = toMap(leaseGroups as any);
  const shortStay = toMap(bookingGroups as any);
  const hostel   = toMap(semesterGroups as any);

  const total =
    leaseGroups.reduce((n, r) => n + r._count._all, 0) +
    bookingGroups.reduce((n, r) => n + r._count._all, 0) +
    semesterGroups.reduce((n, r) => n + r._count._all, 0);

  return { total, lease, shortStay, hostel };
}

// -----------------------------------------------------------------------------
//  CANCELLATION RATE
//
//  Lease has no CANCELLED status in this platform, so cancellation is only a
//  meaningful concept for the two booking domains that do have one:
//    - hostel:    COUNT(SemesterPlan.status = CANCELLED, created in period)
//                 / COUNT(SemesterPlan created in period)
//    - shortStay: COUNT(Booking.status = CANCELLED, created in period)
//                 / COUNT(Booking created in period)
//  Each is counted against ALL bookings created in the period for that domain,
//  not just decided ones - a cancellation rate answers "of everything started,
//  how much fell through," which includes bookings still pending a decision.
// -----------------------------------------------------------------------------

export async function getCancellationRates(scope: ReportScope, range: DateRange) {
  const dateScope = directPropertyScope(scope);
  const createdIn = { createdAt: { gte: range.from, lte: range.to } };

  const [hostelTotal, hostelCancelled, shortStayTotal, shortStayCancelled] = await Promise.all([
    prisma.semesterPlan.count({ where: { ...createdIn, ...dateScope } }),
    prisma.semesterPlan.count({ where: { ...createdIn, ...dateScope, status: "CANCELLED" } }),
    prisma.booking.count({ where: { ...createdIn, ...dateScope } }),
    prisma.booking.count({ where: { ...createdIn, ...dateScope, status: "CANCELLED" } }),
  ]);

  return {
    hostel: {
      total: hostelTotal,
      cancelled: hostelCancelled,
      rate: hostelTotal > 0 ? hostelCancelled / hostelTotal : (null as MetricValue),
    },
    shortStay: {
      total: shortStayTotal,
      cancelled: shortStayCancelled,
      rate: shortStayTotal > 0 ? shortStayCancelled / shortStayTotal : (null as MetricValue),
    },
  };
}

// -----------------------------------------------------------------------------
//  APPROVAL RATE
//
//  Two separate approval gates exist in this product - they are not the same
//  decision and are reported separately, never blended into one number:
//    - hostel:          SemesterPlan.status leaves PENDING_APPROVAL -> either
//                        REJECTED (not approved) or anything else (approved,
//                        e.g. AWAITING_PAYMENT). Still-pending plans (status
//                        still PENDING_APPROVAL) are excluded from both the
//                        numerator and denominator - they have not been
//                        decided yet, so they are not part of a rate.
//    - leaseApplication: Application.status leaves Pending -> either Approved
//                        or Denied. Same exclusion for still-pending ones.
//  Population is every record CREATED in the period, not every record ever.
// -----------------------------------------------------------------------------

export async function getApprovalRates(scope: ReportScope, range: DateRange) {
  const dateScope = directPropertyScope(scope);
  const createdInByCreatedAt = { createdAt: { gte: range.from, lte: range.to } };
  const createdInByAppDate   = { applicationDate: { gte: range.from, lte: range.to } };

  const [hostelDecidedGroups, applicationGroups] = await Promise.all([
    prisma.semesterPlan.groupBy({
      by: ["status"],
      where: { ...createdInByCreatedAt, ...dateScope, status: { not: "PENDING_APPROVAL" } },
      _count: { _all: true },
    }),
    prisma.application.groupBy({
      by: ["status"],
      where: { ...createdInByAppDate, ...dateScope, status: { not: "Pending" } },
      _count: { _all: true },
    }),
  ]);

  const hostelRejected = hostelDecidedGroups.find((g) => g.status === "REJECTED")?._count._all ?? 0;
  const hostelDecided  = hostelDecidedGroups.reduce((n, g) => n + g._count._all, 0);
  const hostelApproved = hostelDecided - hostelRejected;

  const appApproved = applicationGroups.find((g) => g.status === "Approved")?._count._all ?? 0;
  const appDenied    = applicationGroups.find((g) => g.status === "Denied")?._count._all ?? 0;
  const appDecided   = appApproved + appDenied;

  return {
    hostel: {
      decided: hostelDecided,
      approved: hostelApproved,
      rejected: hostelRejected,
      rate: hostelDecided > 0 ? hostelApproved / hostelDecided : (null as MetricValue),
    },
    leaseApplication: {
      decided: appDecided,
      approved: appApproved,
      denied: appDenied,
      rate: appDecided > 0 ? appApproved / appDecided : (null as MetricValue),
    },
  };
}

// -----------------------------------------------------------------------------
//  ROOM UTILIZATION
//
//  Bed-level availability is getOccupancyMetrics() above - this is the
//  ROOM-level view: how full is each room, bucketed by its occupied-bed count
//  against its capacity. A room can only be in one of atCapacity /
//  partiallyOccupied / unoccupied; underutilized is a documented SUBSET of
//  partiallyOccupied (below 50% of capacity occupied), not a fourth exclusive
//  bucket, so totals of the first three always equal totalRooms while
//  underutilized overlaps partiallyOccupied.
//    - atCapacity          = occupiedBeds >= room.capacity
//    - partiallyOccupied   = 0 < occupiedBeds < room.capacity
//    - underutilized       = partiallyOccupied AND occupiedBeds / capacity < 0.5
//    - unoccupied          = occupiedBeds === 0
//  Only active rooms with capacity > 0 are counted.
// -----------------------------------------------------------------------------

const UNDERUTILIZED_THRESHOLD = 0.5;

export async function getRoomUtilization(scope: ReportScope) {
  const rooms = await prisma.room.findMany({
    where: { ...directPropertyScope(scope), isActive: true },
    select: { id: true, capacity: true },
  });

  if (rooms.length === 0) {
    return { totalRooms: 0, atCapacity: 0, partiallyOccupied: 0, underutilized: 0, unoccupied: 0 };
  }

  const occupiedCounts = await prisma.bed.groupBy({
    by: ["roomId"],
    where: { status: "OCCUPIED", isRetired: false, roomId: { in: rooms.map((r) => r.id) } },
    _count: { _all: true },
  });

  const occupiedByRoom = new Map(occupiedCounts.map((r) => [r.roomId, r._count._all]));

  let atCapacity = 0, partiallyOccupied = 0, underutilized = 0, unoccupied = 0;

  for (const room of rooms) {
    if (room.capacity <= 0) continue;
    const occupied = occupiedByRoom.get(room.id) ?? 0;

    if (occupied === 0) { unoccupied++; continue; }
    if (occupied >= room.capacity) { atCapacity++; continue; }

    partiallyOccupied++;
    if (occupied / room.capacity < UNDERUTILIZED_THRESHOLD) underutilized++;
  }

  return { totalRooms: rooms.length, atCapacity, partiallyOccupied, underutilized, unoccupied };
}

// =============================================================================
//  TRENDS  (Step 19, Phase 6)
//
//  The same money / booking / occupancy definitions as the overview, but split
//  into day, week (Monday start) or month buckets so a manager can see
//  direction, not just a total. Aggregation happens in the DATABASE
//  (GROUP BY date_trunc); empty buckets are filled with zeros here so a chart
//  has no holes. Buckets are in UTC, which equals Ghana time (no daylight saving).
//
//  Authorization is NOT handled here - the controller passes in a scope it has
//  already verified (same rule as every other function in this file).
// =============================================================================

export type TrendGranularity = "day" | "week" | "month";

const MAX_TREND_BUCKETS = 400;

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function dayKey(d: Date): string {
  return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate());
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// First day of the bucket that contains d: the day itself, the Monday of its week, or the 1st of its month.
function bucketStart(d: Date, g: TrendGranularity): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (g === "week") {
    const dow = (x.getUTCDay() + 6) % 7; // Monday = 0
    x.setUTCDate(x.getUTCDate() - dow);
  } else if (g === "month") {
    x.setUTCDate(1);
  }
  return x;
}

function nextBucket(d: Date, g: TrendGranularity): Date {
  const x = new Date(d.getTime());
  if (g === "month") x.setUTCMonth(x.getUTCMonth() + 1);
  else x.setUTCDate(x.getUTCDate() + (g === "week" ? 7 : 1));
  return x;
}

// Every bucket label ("YYYY-MM-DD" of the bucket start) inside the range. Stops just past the cap.
export function trendBucketKeys(range: DateRange, g: TrendGranularity): string[] {
  const keys: string[] = [];
  let cur = bucketStart(range.from, g);
  const last = bucketStart(range.to, g);
  while (cur.getTime() <= last.getTime() && keys.length <= MAX_TREND_BUCKETS) {
    keys.push(dayKey(cur));
    cur = nextBucket(cur, g);
  }
  return keys;
}

// null = platform-wide (admin only). Otherwise the property ids the caller is allowed to see.
async function resolvePropertyIds(scope: ReportScope): Promise<number[] | null> {
  if (scope.propertyId !== undefined) return [scope.propertyId];
  if (scope.managerClerkId) {
    const props = await prisma.property.findMany({
      where: { managerClerkId: scope.managerClerkId },
      select: { id: true },
    });
    return props.map((p) => p.id);
  }
  return null;
}

// Only these three constant strings ever reach the SQL - never user input.
function unitSql(g: TrendGranularity) {
  return Prisma.raw(g === "month" ? "'month'" : g === "week" ? "'week'" : "'day'");
}

// Money actually collected (same rule as the overview "received"): Paid / PartiallyPaid payments by paymentDate.
async function moneyTrend(ids: number[] | null, range: DateRange, g: TrendGranularity) {
  const unit = unitSql(g);
  const scopeSql =
    ids === null
      ? Prisma.sql`TRUE`
      : Prisma.sql`COALESCE(l."propertyId", sp."propertyId") = ANY(${ids}::int[])`;

  return prisma.$queryRaw<{ bucket: string; hostel: number; rent: number; total: number }[]>(Prisma.sql`
    SELECT to_char(date_trunc(${unit}, p."paymentDate"), 'YYYY-MM-DD') AS bucket,
           COALESCE(SUM(p."amountPaid") FILTER (WHERE p."semesterPlanId" IS NOT NULL), 0)::float8 AS hostel,
           COALESCE(SUM(p."amountPaid") FILTER (WHERE p."leaseId" IS NOT NULL), 0)::float8 AS rent,
           COALESCE(SUM(p."amountPaid"), 0)::float8 AS total
    FROM "Payment" p
    LEFT JOIN "Lease" l ON l."id" = p."leaseId"
    LEFT JOIN "SemesterPlan" sp ON sp."id" = p."semesterPlanId"
    WHERE p."paymentDate" >= ${range.from}
      AND p."paymentDate" <= ${range.to}
      AND p."paymentStatus" IN ('Paid', 'PartiallyPaid')
      AND ${scopeSql}
    GROUP BY 1
    ORDER BY 1
  `);
}

// New bookings (same rule as the overview): rows CREATED in the period, per product table.
async function countTrend(
  table: "Lease" | "Booking" | "SemesterPlan",
  ids: number[] | null,
  range: DateRange,
  g: TrendGranularity
) {
  const unit = unitSql(g);
  const tbl = Prisma.raw('"' + table + '"');
  const scopeSql = ids === null ? Prisma.sql`TRUE` : Prisma.sql`"propertyId" = ANY(${ids}::int[])`;

  return prisma.$queryRaw<{ bucket: string; n: number }[]>(Prisma.sql`
    SELECT to_char(date_trunc(${unit}, "createdAt"), 'YYYY-MM-DD') AS bucket,
           COUNT(*)::int AS n
    FROM ${tbl}
    WHERE "createdAt" >= ${range.from}
      AND "createdAt" <= ${range.to}
      AND ${scopeSql}
    GROUP BY 1
    ORDER BY 1
  `);
}

export async function getTrends(scope: ReportScope, range: DateRange, g: TrendGranularity) {
  const keys = trendBucketKeys(range, g);
  const ids = await resolvePropertyIds(scope);

  // One after another, never together: the free database allows only a few connections.
  const money = await moneyTrend(ids, range, g);
  const hostel = await countTrend("SemesterPlan", ids, range, g);
  const shortStay = await countTrend("Booking", ids, range, g);
  const lease = await countTrend("Lease", ids, range, g);

  const snaps = await prisma.occupancySnapshot.groupBy({
    by: ["snapshotDate"],
    where: { ...directPropertyScope(scope), snapshotDate: { gte: range.from, lte: range.to } },
    _sum: { totalBeds: true, occupied: true, reserved: true, available: true, maintenance: true },
    orderBy: { snapshotDate: "asc" },
  });

  const moneyBy = new Map(money.map((r) => [r.bucket, r]));
  const hostelBy = new Map(hostel.map((r) => [r.bucket, r.n]));
  const shortBy = new Map(shortStay.map((r) => [r.bucket, r.n]));
  const leaseBy = new Map(lease.map((r) => [r.bucket, r.n]));

  const buckets = keys.map((date) => {
    const m = moneyBy.get(date);
    const h = hostelBy.get(date) ?? 0;
    const s = shortBy.get(date) ?? 0;
    const l = leaseBy.get(date) ?? 0;
    return {
      date,
      moneyHostel: m ? round2(m.hostel) : 0,
      moneyRent: m ? round2(m.rent) : 0,
      moneyTotal: m ? round2(m.total) : 0,
      bookingsHostel: h,
      bookingsShortStay: s,
      bookingsLease: l,
      bookingsTotal: h + s + l,
    };
  });

  // Occupancy history comes from the nightly snapshots, so it only goes back to when the job first ran.
  const occupancy = snaps.map((s) => {
    const totalBeds = s._sum.totalBeds ?? 0;
    const occupied = s._sum.occupied ?? 0;
    return {
      date: dayKey(s.snapshotDate),
      totalBeds,
      occupied,
      reserved: s._sum.reserved ?? 0,
      available: s._sum.available ?? 0,
      maintenance: s._sum.maintenance ?? 0,
      occupancyRate: totalBeds > 0 ? occupied / totalBeds : (null as MetricValue),
    };
  });

  return { granularity: g, bucketCount: keys.length, buckets, occupancy };
}

// =============================================================================
//  HOSTEL INSIGHTS  (Step 19, Phase 6b)
//
//  SEMESTER PERFORMANCE, grouped by ACADEMIC YEAR
//    - There is no academic-year field, so it is derived from the check-in date:
//      August to December -> that year / next year (Sep 2026 = 2026/2027);
//      January to July    -> last year / this year (Feb 2027 = 2026/2027).
//    - Semester names are free text typed at booking time, so names are merged only when
//      they match after lower-casing and tidying spaces around "/". Different spellings
//      stay separate rows. Every booking is counted, whatever its status.
//    - Not limited by the report date range: it lists every booking in scope, newest year first.
//    - received        = money collected on those bookings (Paid / PartiallyPaid payments)
//      awaitingPayment = approved bookings still unpaid (status AWAITING_PAYMENT)
//
//  MAINTENANCE  (BedStatusHistory + current bed status)
//    - Retiring a bed is logged as a move to MAINTENANCE too, so history rows whose action is
//      HOSTEL_BED_RETIRED are NOT counted as maintenance.
//    - entered   = beds that went into maintenance during the period
//      fixed     = of those, came back into use (the next change was not a retirement)
//      retired   = of those, were later retired instead of repaired
//      stillOpen = of those, no later change yet
//      avgDaysToFix = average days until back in use (null when none were fixed)
//    - inMaintenanceNow / openBeds = beds in MAINTENANCE right now (a snapshot, not the period).
//      since = date of the last recorded maintenance entry. sinceRecorded = false means no entry exists
//      (a bed set before history was logged, or changed by hand), so since is only the bed's last update.
// =============================================================================

type StatusCounts = { [status: string]: number };

interface SemesterRow {
  key: string;
  name: string;
  total: number;
  byStatus: StatusCounts;
  received: number;
  awaitingPayment: number;
}

const AY_START_SQL = Prisma.sql`CASE WHEN EXTRACT(MONTH FROM sp."checkIn") >= 8 THEN EXTRACT(YEAR FROM sp."checkIn")::int ELSE EXTRACT(YEAR FROM sp."checkIn")::int - 1 END`;
const SEM_KEY_SQL = Prisma.sql`COALESCE(NULLIF(lower(btrim(regexp_replace(regexp_replace(sp."semesterName", '[[:space:]]+', ' ', 'g'), '[[:space:]]*/[[:space:]]*', '/', 'g'))), ''), '(no name)')`;

const MAX_SEMESTERS_PER_YEAR = 40;

export async function getHostelInsights(scope: ReportScope, range: DateRange) {
  const ids = await resolvePropertyIds(scope);
  const spScope = ids === null ? Prisma.sql`TRUE` : Prisma.sql`sp."propertyId" = ANY(${ids}::int[])`;
  const roomScope = ids === null ? Prisma.sql`TRUE` : Prisma.sql`r."propertyId" = ANY(${ids}::int[])`;

  // One query after another, never together: the free database allows only a few connections.
  const bookingRows = await prisma.$queryRaw<{ ayStart: number; key: string; label: string; status: string; n: number; amount: number }[]>(Prisma.sql`
    SELECT ${AY_START_SQL} AS "ayStart",
           ${SEM_KEY_SQL} AS "key",
           MIN(btrim(sp."semesterName")) AS "label",
           sp."status"::text AS "status",
           COUNT(*)::int AS "n",
           COALESCE(SUM(sp."amountPaid"), 0)::float8 AS "amount"
    FROM "SemesterPlan" sp
    WHERE ${spScope}
    GROUP BY 1, 2, 4
  `);

  const receivedRows = await prisma.$queryRaw<{ ayStart: number; key: string; received: number }[]>(Prisma.sql`
    SELECT ${AY_START_SQL} AS "ayStart",
           ${SEM_KEY_SQL} AS "key",
           COALESCE(SUM(p."amountPaid"), 0)::float8 AS "received"
    FROM "Payment" p
    JOIN "SemesterPlan" sp ON sp."id" = p."semesterPlanId"
    WHERE p."paymentStatus" IN ('Paid', 'PartiallyPaid')
      AND ${spScope}
    GROUP BY 1, 2
  `);

  const years = new Map<number, Map<string, SemesterRow>>();
  const rowFor = (ay: number, key: string, label: string): SemesterRow => {
    let sems = years.get(ay);
    if (!sems) {
      sems = new Map<string, SemesterRow>();
      years.set(ay, sems);
    }
    let row = sems.get(key);
    if (!row) {
      row = { key, name: label || key, total: 0, byStatus: {}, received: 0, awaitingPayment: 0 };
      sems.set(key, row);
    }
    return row;
  };

  for (const r of bookingRows) {
    const row = rowFor(r.ayStart, r.key, r.label);
    row.total += r.n;
    row.byStatus[r.status] = (row.byStatus[r.status] || 0) + r.n;
    if (r.status === "AWAITING_PAYMENT") row.awaitingPayment += r.amount;
  }
  for (const r of receivedRows) {
    rowFor(r.ayStart, r.key, "").received += r.received;
  }

  const academicYears = Array.from(years.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([ayStart, sems]) => {
      const all = Array.from(sems.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
      const totals = all.reduce(
        (t, s) => {
          t.total += s.total;
          t.received += s.received;
          t.awaitingPayment += s.awaitingPayment;
          Object.keys(s.byStatus).forEach((k) => {
            t.byStatus[k] = (t.byStatus[k] || 0) + s.byStatus[k];
          });
          return t;
        },
        { total: 0, received: 0, awaitingPayment: 0, byStatus: {} as StatusCounts }
      );
      return {
        label: ayStart + "/" + (ayStart + 1),
        start: ayStart,
        totals: { ...totals, received: round2(totals.received), awaitingPayment: round2(totals.awaitingPayment) },
        semesters: all
          .slice(0, MAX_SEMESTERS_PER_YEAR)
          .map((s) => ({ ...s, received: round2(s.received), awaitingPayment: round2(s.awaitingPayment) })),
        hiddenSemesters: Math.max(0, all.length - MAX_SEMESTERS_PER_YEAR),
      };
    });

  const openRows = await prisma.$queryRaw<{ bedId: number; bedNumber: string; roomNumber: string; propertyId: number; propertyName: string; since: Date; recorded: boolean; total: number }[]>(Prisma.sql`
    SELECT b."id" AS "bedId",
           b."bedNumber" AS "bedNumber",
           r."roomNumber" AS "roomNumber",
           r."propertyId" AS "propertyId",
           pr."name" AS "propertyName",
           COALESCE(m."since", b."updatedAt") AS "since",
           (m."since" IS NOT NULL) AS "recorded",
           (COUNT(*) OVER ())::int AS "total"
    FROM "Bed" b
    JOIN "Room" r ON r."id" = b."roomId"
    JOIN "Property" pr ON pr."id" = r."propertyId"
    LEFT JOIN LATERAL (
      SELECT MAX(h."createdAt") AS "since"
      FROM "BedStatusHistory" h
      WHERE h."bedId" = b."id"
        AND h."newStatus" = 'MAINTENANCE'
        AND h."action" <> 'HOSTEL_BED_RETIRED'
    ) m ON TRUE
    WHERE b."status" = 'MAINTENANCE'
      AND b."isRetired" = false
      AND ${roomScope}
    ORDER BY COALESCE(m."since", b."updatedAt") ASC
    LIMIT 20
  `);

  const periodRows = await prisma.$queryRaw<{ entered: number; fixed: number; retired: number; stillOpen: number; avgDaysToFix: number | null }[]>(Prisma.sql`
    WITH ev AS (
      SELECT h."bedId", h."newStatus", h."action", h."createdAt",
             LEAD(h."createdAt") OVER w AS "nextAt",
             LEAD(h."action") OVER w AS "nextAction"
      FROM "BedStatusHistory" h
      JOIN "Bed" b ON b."id" = h."bedId"
      JOIN "Room" r ON r."id" = b."roomId"
      WHERE ${roomScope}
      WINDOW w AS (PARTITION BY h."bedId" ORDER BY h."createdAt", h."id")
    )
    SELECT COUNT(*)::int AS "entered",
           COUNT(*) FILTER (WHERE "nextAt" IS NOT NULL AND "nextAction" IS DISTINCT FROM 'HOSTEL_BED_RETIRED')::int AS "fixed",
           COUNT(*) FILTER (WHERE "nextAction" = 'HOSTEL_BED_RETIRED')::int AS "retired",
           COUNT(*) FILTER (WHERE "nextAt" IS NULL)::int AS "stillOpen",
           (AVG(EXTRACT(EPOCH FROM ("nextAt" - "createdAt")) / 86400.0)
              FILTER (WHERE "nextAt" IS NOT NULL AND "nextAction" IS DISTINCT FROM 'HOSTEL_BED_RETIRED'))::float8 AS "avgDaysToFix"
    FROM ev
    WHERE "newStatus" = 'MAINTENANCE'
      AND "action" <> 'HOSTEL_BED_RETIRED'
      AND "createdAt" >= ${range.from}
      AND "createdAt" <= ${range.to}
  `);

  const p = periodRows[0];
  const now = Date.now();
  const maintenance = {
    inMaintenanceNow: openRows.length > 0 ? openRows[0].total : 0,
    openBeds: openRows.map((r) => {
      const since = new Date(r.since);
      return {
        bedId: r.bedId,
        bedNumber: r.bedNumber,
        roomNumber: r.roomNumber,
        propertyId: r.propertyId,
        propertyName: r.propertyName,
        since: since.toISOString(),
        sinceRecorded: r.recorded,
        days: Math.max(0, Math.floor((now - since.getTime()) / 86400000)),
      };
    }),
    period: {
      entered: p ? p.entered : 0,
      fixed: p ? p.fixed : 0,
      retired: p ? p.retired : 0,
      stillOpen: p ? p.stillOpen : 0,
      avgDaysToFix: p && p.avgDaysToFix !== null ? Math.round(p.avgDaysToFix * 10) / 10 : (null as MetricValue),
    },
  };

  return {
    academicYearRule: "Academic year runs August to July, counted from the check-in date.",
    academicYears,
    maintenance,
  };
}

// =============================================================================
//  DRILL-DOWN RECORDS  (Step 19, Phase 7)
//
//  "Click a number, see the records behind it." Each list below uses the SAME filters as
//  the headline number it explains (getRevenueMetrics, getBookingMetrics, getApprovalRates,
//  getCancellationRates, getOccupancyMetrics) and returns that headline's own figure as
//  summary.value, so the two can be compared. test-records.ts checks they always agree.
//  Rows come one page at a time (skip / take) - the whole table is never loaded.
//
//  metric                                     the list                                   summary.value
//  received, received_hostel, received_rent   Paid + PartiallyPaid payments by           money received
//                                             paymentDate in the range
//  outstanding_ledger                         Pending / PartiallyPaid / Overdue          money still owed
//                                             payments due on or before the range end
//  outstanding_hostel                         hostel bookings AWAITING_PAYMENT           money awaiting
//  bookings_hostel, bookings_short_stay,      bookings created in the range              number of bookings
//  bookings_lease                             (optional status)
//  approvals_*                                decided hostel bookings / lease            number of records
//                                             applications created in the range
//  beds (+ status)                            non-retired beds in that status now        number of beds
//  hostel_semester (+ ay, semester)           every booking of one semester row          number of bookings
//                                             (NOT limited by the date range)
//
//  Authorization is NOT handled here - the controller passes in a scope it has verified.
// =============================================================================

export const REPORT_RECORD_METRICS = [
  "received",
  "received_hostel",
  "received_rent",
  "outstanding_ledger",
  "outstanding_hostel",
  "bookings_hostel",
  "bookings_short_stay",
  "bookings_lease",
  "approvals_hostel_approved",
  "approvals_hostel_rejected",
  "approvals_application_approved",
  "approvals_application_denied",
  "beds",
  "hostel_semester",
] as const;

export type ReportRecordMetric = (typeof REPORT_RECORD_METRICS)[number];

export interface ReportRecordsQuery {
  metric: ReportRecordMetric;
  status?: string;
  ay?: number;
  semester?: string;
  page: number;
  pageSize: number;
}

export interface ReportRecordRow {
  id: number;
  kind: "payment" | "hostel_booking" | "short_stay_booking" | "lease" | "application" | "bed";
  title: string;
  subtitle: string;
  status: string;
  amount: number | null;
  date: string | null;
  property: string;
}

export const MAX_RECORDS_PAGE_SIZE = 50;

const RECORD_STATUSES: { [metric: string]: string[] } = {
  bookings_hostel: ["ACTIVE", "EXPIRING", "COMPLETED", "EXTENDED", "EXPIRED", "PENDING_APPROVAL", "AWAITING_PAYMENT", "REJECTED", "CANCELLED"],
  bookings_short_stay: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "NO_SHOW", "CANCELLED"],
  bookings_lease: ["ACTIVE", "EXPIRING_SOON", "EXPIRING_URGENT", "EXPIRED", "RENEWED", "FROZEN", "TERMINATED"],
  beds: ["AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE"],
};

const RECORD_TITLES: { [metric: string]: string } = {
  received: "Money received",
  received_hostel: "Money received - hostel",
  received_rent: "Money received - rent",
  outstanding_ledger: "Ledger balances still owed",
  outstanding_hostel: "Hostel bookings awaiting payment",
  bookings_hostel: "Hostel bookings",
  bookings_short_stay: "Short-stay bookings",
  bookings_lease: "Rental leases",
  approvals_hostel_approved: "Hostel bookings approved",
  approvals_hostel_rejected: "Hostel bookings rejected",
  approvals_application_approved: "Lease applications approved",
  approvals_application_denied: "Lease applications denied",
  beds: "Beds",
  hostel_semester: "Hostel bookings in this semester",
};

// Returns a plain-words problem with the request, or null when it is fine.
export function recordsQueryProblem(q: { metric: string; status?: string; ay?: number; semester?: string; page: number; pageSize: number }): string | null {
  if (!(REPORT_RECORD_METRICS as readonly string[]).includes(q.metric)) return "Unknown metric";
  if (!Number.isInteger(q.page) || q.page < 1 || q.page > 1000) return "page must be a whole number from 1 to 1000";
  if (!Number.isInteger(q.pageSize) || q.pageSize < 1 || q.pageSize > MAX_RECORDS_PAGE_SIZE) {
    return "pageSize must be a whole number from 1 to " + MAX_RECORDS_PAGE_SIZE;
  }
  const allowed: string[] | undefined = RECORD_STATUSES[q.metric];
  if (q.metric === "beds" && !q.status) return "status is required for beds";
  if (q.status !== undefined) {
    if (!allowed) return "This metric does not take a status";
    if (!allowed.includes(q.status)) return "Unknown status for this metric";
  }
  if (q.metric === "hostel_semester") {
    if (q.ay === undefined || !Number.isInteger(q.ay) || q.ay < 2000 || q.ay > 2100) {
      return "ay (the year the academic year starts) must be a year between 2000 and 2100";
    }
    if (!q.semester || q.semester.length > 200) return "semester is required (200 characters at most)";
  }
  return null;
}

function recStatusWord(s: string): string {
  const w = s.toLowerCase().replace(/_/g, " ");
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function recIso(d: Date | string | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null;
}

function recDay(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

const REC_PAYMENT_SELECT = {
  id: true,
  amountDue: true,
  amountPaid: true,
  dueDate: true,
  paymentDate: true,
  paymentStatus: true,
  leaseId: true,
  paystackReference: true,
  semesterPlan: { select: { reference: true, semesterName: true, property: { select: { name: true } } } },
  lease: { select: { property: { select: { name: true } } } },
};

const REC_HOSTEL_SELECT = {
  id: true,
  semesterName: true,
  reference: true,
  roomNumber: true,
  status: true,
  amountPaid: true,
  createdAt: true,
  property: { select: { name: true } },
};

const REC_SHORT_SELECT = {
  id: true,
  reference: true,
  status: true,
  totalAmount: true,
  checkIn: true,
  checkOut: true,
  createdAt: true,
  property: { select: { name: true } },
};

const REC_LEASE_SELECT = {
  id: true,
  status: true,
  rent: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  property: { select: { name: true } },
};

const REC_APPLICATION_SELECT = {
  id: true,
  name: true,
  status: true,
  applicationDate: true,
  property: { select: { name: true } },
};

const REC_BED_SELECT = {
  id: true,
  bedNumber: true,
  status: true,
  updatedAt: true,
  room: { select: { roomNumber: true, block: true, floor: true, property: { select: { name: true } } } },
};

function recPaymentRow(p: any, mode: "received" | "owed"): ReportRecordRow {
  const hostel = !!p.semesterPlan;
  const rent = !hostel && !!p.leaseId;
  return {
    id: p.id,
    kind: "payment",
    title: hostel ? "Hostel payment" : rent ? "Rent payment" : "Payment",
    subtitle: hostel
      ? String(p.semesterPlan.semesterName) + " - " + String(p.semesterPlan.reference)
      : p.paystackReference
        ? String(p.paystackReference)
        : "Payment " + p.id,
    status: String(p.paymentStatus),
    amount: mode === "received" ? p.amountPaid : round2(p.amountDue - p.amountPaid),
    date: recIso(mode === "received" ? p.paymentDate : p.dueDate),
    property: p.semesterPlan?.property?.name ?? p.lease?.property?.name ?? "",
  };
}

function recHostelRow(s: any): ReportRecordRow {
  return {
    id: s.id,
    kind: "hostel_booking",
    title: String(s.semesterName),
    subtitle: String(s.reference) + (s.roomNumber ? " - Room " + s.roomNumber : ""),
    status: String(s.status),
    amount: s.amountPaid,
    date: recIso(s.createdAt),
    property: s.property?.name ?? "",
  };
}

function recShortRow(b: any): ReportRecordRow {
  return {
    id: b.id,
    kind: "short_stay_booking",
    title: "Short stay",
    subtitle: String(b.reference) + " - " + recDay(b.checkIn) + " to " + recDay(b.checkOut),
    status: String(b.status),
    amount: b.totalAmount,
    date: recIso(b.createdAt),
    property: b.property?.name ?? "",
  };
}

function recLeaseRow(l: any): ReportRecordRow {
  return {
    id: l.id,
    kind: "lease",
    title: "Lease " + l.id,
    subtitle: recDay(l.startDate) + " to " + recDay(l.endDate),
    status: String(l.status),
    amount: l.rent,
    date: recIso(l.createdAt),
    property: l.property?.name ?? "",
  };
}

function recApplicationRow(a: any): ReportRecordRow {
  return {
    id: a.id,
    kind: "application",
    title: String(a.name),
    subtitle: "Application " + a.id,
    status: String(a.status),
    amount: null,
    date: recIso(a.applicationDate),
    property: a.property?.name ?? "",
  };
}

function recBedRow(b: any): ReportRecordRow {
  const where = [b.room?.block ? "Block " + b.room.block : "", b.room?.floor ? "Floor " + b.room.floor : ""].filter(Boolean).join(" - ");
  return {
    id: b.id,
    kind: "bed",
    title: "Room " + (b.room?.roomNumber ?? "?") + " - Bed " + b.bedNumber,
    subtitle: where,
    status: String(b.status),
    amount: null,
    date: recIso(b.updatedAt),
    property: b.room?.property?.name ?? "",
  };
}

export async function getReportRecords(scope: ReportScope, range: DateRange, q: ReportRecordsQuery) {
  const skip = (q.page - 1) * q.pageSize;
  const take = q.pageSize;
  const payScope = paymentPropertyScope(scope);
  const dateScope = directPropertyScope(scope);
  const createdIn = { createdAt: { gte: range.from, lte: range.to } };

  let total = 0;
  let value = 0;
  let valueLabel = "Records";
  let money = false;
  let rows: ReportRecordRow[] = [];

  // Count, then sum, then one page - one after another, never together (free database).
  switch (q.metric) {
    case "received":
    case "received_hostel":
    case "received_rent": {
      const where: any = {
        paymentDate: { gte: range.from, lte: range.to },
        paymentStatus: { in: ["Paid", "PartiallyPaid"] },
        ...payScope,
        ...(q.metric === "received_hostel" ? { semesterPlan: { isNot: null } } : {}),
        ...(q.metric === "received_rent" ? { lease: { isNot: null } } : {}),
      };
      total = await prisma.payment.count({ where });
      const agg = await prisma.payment.aggregate({ where, _sum: { amountPaid: true } });
      value = agg._sum.amountPaid ?? 0;
      money = true;
      valueLabel = "Total received";
      const list = await prisma.payment.findMany({
        where,
        select: REC_PAYMENT_SELECT,
        orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
        skip,
        take,
      });
      rows = list.map((p: any) => recPaymentRow(p, "received"));
      break;
    }

    case "outstanding_ledger": {
      const where: any = {
        dueDate: { lte: range.to },
        paymentStatus: { in: ["Pending", "PartiallyPaid", "Overdue"] },
        ...payScope,
      };
      total = await prisma.payment.count({ where });
      const agg = await prisma.payment.aggregate({ where, _sum: { amountDue: true, amountPaid: true } });
      value = (agg._sum.amountDue ?? 0) - (agg._sum.amountPaid ?? 0);
      money = true;
      valueLabel = "Total still owed";
      const list = await prisma.payment.findMany({
        where,
        select: REC_PAYMENT_SELECT,
        orderBy: [{ dueDate: "asc" }, { id: "asc" }],
        skip,
        take,
      });
      rows = list.map((p: any) => recPaymentRow(p, "owed"));
      break;
    }

    case "outstanding_hostel": {
      const where: any = { status: "AWAITING_PAYMENT", createdAt: { lte: range.to }, ...dateScope };
      total = await prisma.semesterPlan.count({ where });
      const agg = await prisma.semesterPlan.aggregate({ where, _sum: { amountPaid: true } });
      value = agg._sum.amountPaid ?? 0;
      money = true;
      valueLabel = "Total awaiting payment";
      const list = await prisma.semesterPlan.findMany({
        where,
        select: REC_HOSTEL_SELECT,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip,
        take,
      });
      rows = list.map((s: any) => recHostelRow(s));
      break;
    }

    case "bookings_hostel":
    case "approvals_hostel_approved":
    case "approvals_hostel_rejected": {
      const where: any = { ...createdIn, ...dateScope };
      if (q.metric === "approvals_hostel_approved") where.status = { notIn: ["PENDING_APPROVAL", "REJECTED"] };
      else if (q.metric === "approvals_hostel_rejected") where.status = "REJECTED";
      else if (q.status) where.status = q.status;
      total = await prisma.semesterPlan.count({ where });
      value = total;
      const list = await prisma.semesterPlan.findMany({
        where,
        select: REC_HOSTEL_SELECT,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take,
      });
      rows = list.map((s: any) => recHostelRow(s));
      break;
    }

    case "bookings_short_stay": {
      const where: any = { ...createdIn, ...dateScope };
      if (q.status) where.status = q.status;
      total = await prisma.booking.count({ where });
      value = total;
      const list = await prisma.booking.findMany({
        where,
        select: REC_SHORT_SELECT,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take,
      });
      rows = list.map((b: any) => recShortRow(b));
      break;
    }

    case "bookings_lease": {
      const where: any = { ...createdIn, ...dateScope };
      if (q.status) where.status = q.status;
      total = await prisma.lease.count({ where });
      value = total;
      const list = await prisma.lease.findMany({
        where,
        select: REC_LEASE_SELECT,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take,
      });
      rows = list.map((l: any) => recLeaseRow(l));
      break;
    }

    case "approvals_application_approved":
    case "approvals_application_denied": {
      const where: any = {
        applicationDate: { gte: range.from, lte: range.to },
        ...dateScope,
        status: q.metric === "approvals_application_approved" ? "Approved" : "Denied",
      };
      total = await prisma.application.count({ where });
      value = total;
      const list = await prisma.application.findMany({
        where,
        select: REC_APPLICATION_SELECT,
        orderBy: [{ applicationDate: "desc" }, { id: "desc" }],
        skip,
        take,
      });
      rows = list.map((a: any) => recApplicationRow(a));
      break;
    }

    case "beds": {
      const where: any = { ...bedPropertyScope(scope), isRetired: false, status: q.status };
      total = await prisma.bed.count({ where });
      value = total;
      valueLabel = "Beds";
      const list = await prisma.bed.findMany({
        where,
        select: REC_BED_SELECT,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip,
        take,
      });
      rows = list.map((b: any) => recBedRow(b));
      break;
    }

    case "hostel_semester": {
      const ids = await resolvePropertyIds(scope);
      const spScope = ids === null ? Prisma.sql`TRUE` : Prisma.sql`sp."propertyId" = ANY(${ids}::int[])`;
      const ay = q.ay as number;
      const semKey = q.semester as string;
      const countRows = await prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS "n"
        FROM "SemesterPlan" sp
        WHERE ${spScope}
          AND (${AY_START_SQL}) = ${ay}::int
          AND (${SEM_KEY_SQL}) = ${semKey}
      `);
      total = countRows.length > 0 ? countRows[0].n : 0;
      value = total;
      valueLabel = "Bookings";
      const idRows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        SELECT sp."id" AS "id"
        FROM "SemesterPlan" sp
        WHERE ${spScope}
          AND (${AY_START_SQL}) = ${ay}::int
          AND (${SEM_KEY_SQL}) = ${semKey}
        ORDER BY sp."createdAt" DESC, sp."id" DESC
        LIMIT ${take} OFFSET ${skip}
      `);
      const wanted = idRows.map((r) => r.id);
      const list = wanted.length > 0
        ? await prisma.semesterPlan.findMany({ where: { id: { in: wanted } }, select: REC_HOSTEL_SELECT })
        : [];
      const byId = new Map<number, any>(list.map((s: any) => [s.id, s]));
      rows = wanted.filter((id) => byId.has(id)).map((id) => recHostelRow(byId.get(id)));
      break;
    }

    default:
      throw new Error("Unknown metric");
  }

  const baseTitle = RECORD_TITLES[q.metric];
  return {
    metric: q.metric,
    title: q.status ? baseTitle + " (" + recStatusWord(q.status) + ")" : baseTitle,
    status: q.status ?? null,
    page: q.page,
    pageSize: q.pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / q.pageSize)),
    summary: { label: valueLabel, value: money ? round2(value) : value, money },
    rows,
  };
}

// =============================================================================
//  ATTENTION CENTER  (Step 19, Phase 8)
//
//  "What needs me right now?" - one list across hostel, rent, short-stay and enquiries.
//  Every item comes from ONE written rule (below), is counted in the database (never loaded
//  and counted in code), and is scoped inside the query itself. Properties that have been
//  removed (deletedAt) never produce items. Each item carries its rule in plain words, so
//  a manager can always see WHY it is on the list. A rule with nothing to show is listed as
//  "clear" (so a quiet card still says what was checked). A rule that cannot be checked
//  (database hiccup) is listed as "failed" - it is never silently shown as 0.
//
//  Time is "now" (the call time), not the page's date range. Wording of "grace" below:
//  the platform's own background jobs already close these things automatically (short stays
//  every 10 minutes, hostel stays and payment deadlines on their schedules), so an item on a
//  "missed" rule usually means the automatic clean-up has not run yet.
//
//  The 19 rules are written out in plain words in attRules() below (each item carries its own
//  rule text). Urgent = money overdue, or something that has waited too long. Soon = something
//  the system should have closed by itself, or that is stuck. Info = a heads-up, nothing wrong.
//
//  Authorization is NOT handled here - the controller passes in a scope it has verified.
// =============================================================================

export const ATTENTION_LIMITS = {
  approvalUrgentDays: 3,
  hostelGraceHours: 24,
  shortStayGraceHours: 3,
  soonWindowDays: 3,
  leaseWindowDays: 30,
  leaseUrgentDays: 7,
  maintenanceStaleDays: 30,
  examplesPerItem: 5,
} as const;

export type AttentionSeverity = "urgent" | "soon" | "info";
export type AttentionArea = "hostel" | "rent" | "short_stay" | "enquiries";
export type AttentionPage = "applications" | "hostel" | "hostel_occupancy" | "payments" | "bookings" | "enquiries";

export interface AttentionExample {
  id: number;
  label: string;
  detail: string;
  date: string | null;
  amount: number | null;
  property: string;
}

export interface AttentionItem {
  key: string;
  area: AttentionArea;
  severity: AttentionSeverity;
  title: string;
  rule: string;
  count: number;
  amount: number | null;
  page: AttentionPage | null;
  examples: AttentionExample[];
}

export interface AttentionResult {
  asOf: string;
  summary: { urgent: number; soon: number; info: number; items: number; records: number };
  items: AttentionItem[];
  clear: { key: string; area: AttentionArea; title: string; rule: string }[];
  failed: { key: string; area: AttentionArea; title: string }[];
  rulesChecked: number;
}

const ATT_HOUR = 60 * 60 * 1000;
const ATT_DAY = 24 * ATT_HOUR;

// Properties that were removed never produce items.
function attProperty(scope: ReportScope): any {
  const w: any = { deletedAt: null };
  if (scope.propertyId !== undefined) w.id = scope.propertyId;
  else if (scope.managerClerkId) w.managerClerkId = scope.managerClerkId;
  return w;
}

function attDirect(scope: ReportScope): any {
  return { property: attProperty(scope) };
}

function attBed(scope: ReportScope): any {
  return { room: { isActive: true, property: attProperty(scope) } };
}

function attIso(d: Date | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null;
}

function attPlural(n: number, word: string): string {
  return n + " " + word + (n === 1 ? "" : "s");
}

// "3 days ago" / "in 2 days" / "2 hours ago" / "just now"
function attWhen(d: Date | string, now: Date): string {
  const diff = new Date(d).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const days = Math.floor(abs / ATT_DAY);
  const hours = Math.floor(abs / ATT_HOUR);
  let span: string;
  if (days >= 1) span = attPlural(days, "day");
  else if (hours >= 1) span = attPlural(hours, "hour");
  else return diff < 0 ? "just now" : "within the hour";
  return diff < 0 ? span + " ago" : "in " + span;
}

// "ends in 2 days" / "ended 18 hours ago" - the wording follows whether the moment is ahead or behind.
function attEvent(d: Date | string, now: Date, ahead: string, behind: string): string {
  return (new Date(d).getTime() < now.getTime() ? behind : ahead) + " " + attWhen(d, now);
}

function attDay(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

async function attList(delegate: any, where: any, orderBy: any, select: any, sum?: { [field: string]: true }) {
  const [count, rows, agg] = await Promise.all([
    delegate.count({ where }),
    delegate.findMany({ where, orderBy, select, take: ATTENTION_LIMITS.examplesPerItem }),
    sum ? delegate.aggregate({ where, _sum: sum }) : Promise.resolve(null),
  ]);
  return { count: count as number, rows: rows as any[], sums: (agg && agg._sum) || ({} as any) };
}

const ATT_HOSTEL_SELECT = {
  id: true,
  semesterName: true,
  reference: true,
  roomNumber: true,
  amountPaid: true,
  createdAt: true,
  checkIn: true,
  fixedEndDate: true,
  paymentDueAt: true,
  property: { select: { name: true } },
};

const ATT_SHORT_SELECT = {
  id: true,
  reference: true,
  totalAmount: true,
  checkIn: true,
  checkOut: true,
  property: { select: { name: true } },
};

const ATT_LEASE_SELECT = {
  id: true,
  rent: true,
  startDate: true,
  endDate: true,
  frozenAt: true,
  property: { select: { name: true } },
};

interface AttRuleResult {
  severity: AttentionSeverity;
  count: number;
  amount: number | null;
  examples: AttentionExample[];
}

interface AttRule {
  key: string;
  area: AttentionArea;
  title: string;
  rule: string;
  page: AttentionPage | null;
  run: () => Promise<AttRuleResult>;
}

function attRules(scope: ReportScope, now: Date): AttRule[] {
  const L = ATTENTION_LIMITS;
  const t = now.getTime();
  const hostelGrace = new Date(t - L.hostelGraceHours * ATT_HOUR);
  const stayGrace = new Date(t - L.shortStayGraceHours * ATT_HOUR);
  const soon = new Date(t + L.soonWindowDays * ATT_DAY);
  const leaseEnd = new Date(t + L.leaseWindowDays * ATT_DAY);
  const leaseUrgent = new Date(t + L.leaseUrgentDays * ATT_DAY);
  const staleBed = new Date(t - L.maintenanceStaleDays * ATT_DAY);
  const urgentWait = new Date(t - L.approvalUrgentDays * ATT_DAY);
  const direct = attDirect(scope);
  const liveProperty = attProperty(scope);
  const STAY_STATUSES = ["ACTIVE", "EXTENDED", "EXPIRING"];
  const LEASE_LIVE = ["ACTIVE", "EXPIRING_SOON", "EXPIRING_URGENT"];
  const UNPAID = ["Pending", "PartiallyPaid", "Overdue"];

  const hostelLine = (s: any): string => {
    const name = String(s.semesterName ?? "").trim();
    return (name || "Semester") + (s.roomNumber ? " - Room " + s.roomNumber : "");
  };
  const hostelEx = (s: any, detail: string, date: Date | null | undefined): AttentionExample => ({
    id: s.id,
    label: String(s.reference),
    detail: hostelLine(s) + " - " + detail,
    date: attIso(date),
    amount: s.amountPaid ?? null,
    property: s.property?.name ?? "",
  });
  const shortEx = (b: any, detail: string, date: Date | null | undefined): AttentionExample => ({
    id: b.id,
    label: String(b.reference),
    detail: attDay(b.checkIn) + " to " + attDay(b.checkOut) + " - " + detail,
    date: attIso(date),
    amount: b.totalAmount ?? null,
    property: b.property?.name ?? "",
  });
  const leaseEx = (l: any, detail: string, date: Date | null | undefined): AttentionExample => ({
    id: l.id,
    label: "Lease " + l.id,
    detail: attDay(l.startDate) + " to " + attDay(l.endDate) + " - " + detail,
    date: attIso(date),
    amount: l.rent ?? null,
    property: l.property?.name ?? "",
  });
  const payEx = (p: any, label: string): AttentionExample => ({
    id: p.id,
    label,
    detail: "due " + attWhen(p.dueDate, now) + " (" + attDay(p.dueDate) + ")",
    date: attIso(p.dueDate),
    amount: Math.round((p.amountDue - p.amountPaid) * 100) / 100,
    property: p.semesterPlan?.property?.name ?? p.lease?.property?.name ?? "",
  });
  const ascBy = (field: string) => [{ [field]: "asc" }, { id: "asc" }];

  const rules: AttRule[] = [];

  // ---------------------------------------------------------------- HOSTEL
  rules.push({
    key: "hostel_pending_approval",
    area: "hostel",
    title: "Hostel bookings waiting for your approval",
    rule: "Hostel booking requests still waiting for approval. Marked urgent when the oldest has waited more than " + L.approvalUrgentDays + " days.",
    page: "hostel",
    run: async () => {
      const where = { status: "PENDING_APPROVAL", ...direct };
      const r = await attList(prisma.semesterPlan, where, ascBy("createdAt"), ATT_HOSTEL_SELECT);
      const oldest = r.rows[0]?.createdAt as Date | undefined;
      return {
        severity: oldest && new Date(oldest).getTime() < urgentWait.getTime() ? "urgent" : "soon",
        count: r.count,
        amount: null,
        examples: r.rows.map((s) => hostelEx(s, "requested " + attWhen(s.createdAt, now), s.createdAt)),
      };
    },
  });

  rules.push({
    key: "hostel_payment_window_missed",
    area: "hostel",
    title: "Approved hostel bookings past their payment deadline",
    rule: "Approved hostel bookings whose 24-hour payment deadline has passed but which are still open. The system normally closes these within minutes and frees the bed, so a booking here means that clean-up has not run.",
    page: "hostel",
    run: async () => {
      const where = { status: "AWAITING_PAYMENT", paymentDueAt: { lt: now }, ...direct };
      const r = await attList(prisma.semesterPlan, where, ascBy("paymentDueAt"), ATT_HOSTEL_SELECT, { amountPaid: true });
      return {
        severity: "soon",
        count: r.count,
        amount: r.sums.amountPaid ?? 0,
        examples: r.rows.map((s) => hostelEx(s, "payment was due " + attWhen(s.paymentDueAt, now), s.paymentDueAt)),
      };
    },
  });

  rules.push({
    key: "hostel_awaiting_payment",
    area: "hostel",
    title: "Approved hostel bookings waiting for payment",
    rule: "Approved hostel bookings where the student still has time to pay (they get 24 hours). The bed is held for them until then.",
    page: "hostel",
    run: async () => {
      const where = { status: "AWAITING_PAYMENT", OR: [{ paymentDueAt: null }, { paymentDueAt: { gte: now } }], ...direct };
      const order = [{ paymentDueAt: { sort: "asc", nulls: "last" } }, { id: "asc" }];
      const r = await attList(prisma.semesterPlan, where, order, ATT_HOSTEL_SELECT, { amountPaid: true });
      return {
        severity: "info",
        count: r.count,
        amount: r.sums.amountPaid ?? 0,
        examples: r.rows.map((s) =>
          hostelEx(s, s.paymentDueAt ? "pay " + attWhen(s.paymentDueAt, now) : "no deadline set", s.paymentDueAt)
        ),
      };
    },
  });

  rules.push({
    key: "hostel_no_show_risk",
    area: "hostel",
    title: "Hostel students who have not checked in",
    rule: "Paid hostel bookings where the check-in date passed more than " + L.hostelGraceHours + " hours ago, the student has not been checked in, and the booking has not been marked no-show.",
    page: "hostel",
    run: async () => {
      const where = {
        status: { in: ["ACTIVE", "EXTENDED"] },
        checkedInAt: null,
        noShowMarkedAt: null,
        actualEndDate: null,
        checkIn: { lt: hostelGrace },
        OR: [{ fixedEndDate: null }, { fixedEndDate: { gte: now } }],
        ...direct,
      };
      const r = await attList(prisma.semesterPlan, where, ascBy("checkIn"), ATT_HOSTEL_SELECT);
      return {
        severity: "soon",
        count: r.count,
        amount: null,
        examples: r.rows.map((s) => hostelEx(s, "check-in was " + attWhen(s.checkIn, now), s.checkIn)),
      };
    },
  });

  rules.push({
    key: "hostel_checkins_soon",
    area: "hostel",
    title: "Hostel check-ins coming up",
    rule: "Paid hostel bookings not yet checked in whose check-in date is from " + L.hostelGraceHours + " hours ago up to " + L.soonWindowDays + " days from now.",
    page: "hostel",
    run: async () => {
      const where = {
        status: { in: ["ACTIVE", "EXTENDED"] },
        checkedInAt: null,
        checkIn: { gte: hostelGrace, lte: soon },
        ...direct,
      };
      const r = await attList(prisma.semesterPlan, where, ascBy("checkIn"), ATT_HOSTEL_SELECT);
      return {
        severity: "info",
        count: r.count,
        amount: null,
        examples: r.rows.map((s) => hostelEx(s, attEvent(s.checkIn, now, "check-in due", "check-in was due"), s.checkIn)),
      };
    },
  });

  rules.push({
    key: "hostel_checkouts_soon",
    area: "hostel",
    title: "Hostel check-outs coming up",
    rule: "Hostel stays with a fixed end date from " + L.hostelGraceHours + " hours ago up to " + L.soonWindowDays + " days from now, not yet checked out.",
    page: "hostel",
    run: async () => {
      const where = {
        status: { in: STAY_STATUSES },
        actualEndDate: null,
        closingType: "FIXED",
        fixedEndDate: { gte: hostelGrace, lte: soon },
        ...direct,
      };
      const r = await attList(prisma.semesterPlan, where, ascBy("fixedEndDate"), ATT_HOSTEL_SELECT);
      return {
        severity: "info",
        count: r.count,
        amount: null,
        examples: r.rows.map((s) => hostelEx(s, attEvent(s.fixedEndDate, now, "ends", "ended"), s.fixedEndDate)),
      };
    },
  });

  rules.push({
    key: "hostel_stays_overdue",
    area: "hostel",
    title: "Hostel stays past their end date",
    rule: "Hostel stays with a fixed end date more than " + L.hostelGraceHours + " hours ago that are still open (not checked out). The system normally expires these overnight.",
    page: "hostel",
    run: async () => {
      const where = {
        status: { in: STAY_STATUSES },
        actualEndDate: null,
        closingType: "FIXED",
        fixedEndDate: { lt: hostelGrace },
        ...direct,
      };
      const r = await attList(prisma.semesterPlan, where, ascBy("fixedEndDate"), ATT_HOSTEL_SELECT);
      return {
        severity: "soon",
        count: r.count,
        amount: null,
        examples: r.rows.map((s) => hostelEx(s, "ended " + attWhen(s.fixedEndDate, now), s.fixedEndDate)),
      };
    },
  });

  rules.push({
    key: "hostel_payments_overdue",
    area: "hostel",
    title: "Hostel payments overdue",
    rule: "Hostel payments past their due date and not fully paid, on bookings that are active, extended, expiring or completed. Bookings still waiting for approval or first payment are not counted here.",
    page: "payments",
    run: async () => {
      const where = {
        paymentStatus: { in: UNPAID },
        dueDate: { lt: now },
        semesterPlan: { status: { in: ["ACTIVE", "EXTENDED", "EXPIRING", "COMPLETED"] }, property: liveProperty },
      };
      const select = {
        id: true,
        amountDue: true,
        amountPaid: true,
        dueDate: true,
        semesterPlan: { select: { reference: true, property: { select: { name: true } } } },
        lease: { select: { property: { select: { name: true } } } },
      };
      const r = await attList(prisma.payment, where, ascBy("dueDate"), select, { amountDue: true, amountPaid: true });
      return {
        severity: "urgent",
        count: r.count,
        amount: Math.round(((r.sums.amountDue ?? 0) - (r.sums.amountPaid ?? 0)) * 100) / 100,
        examples: r.rows.map((p) => payEx(p, p.semesterPlan?.reference ? String(p.semesterPlan.reference) : "Payment " + p.id)),
      };
    },
  });

  rules.push({
    key: "beds_maintenance_stale",
    area: "hostel",
    title: "Beds in maintenance for 30+ days",
    rule: "Beds in maintenance that have not changed for more than " + L.maintenanceStaleDays + " days (by last-updated time). Retired beds and inactive rooms are ignored.",
    page: "hostel_occupancy",
    run: async () => {
      const where = { status: "MAINTENANCE", isRetired: false, updatedAt: { lt: staleBed }, ...attBed(scope) };
      const select = {
        id: true,
        bedNumber: true,
        updatedAt: true,
        room: { select: { roomNumber: true, block: true, property: { select: { name: true } } } },
      };
      const r = await attList(prisma.bed, where, ascBy("updatedAt"), select);
      return {
        severity: "soon",
        count: r.count,
        amount: null,
        examples: r.rows.map((b) => ({
          id: b.id,
          label: "Room " + (b.room?.roomNumber ?? "?") + " - Bed " + b.bedNumber,
          detail: (b.room?.block ? "Block " + b.room.block + " - " : "") + "last changed " + attWhen(b.updatedAt, now),
          date: attIso(b.updatedAt),
          amount: null,
          property: b.room?.property?.name ?? "",
        })),
      };
    },
  });

  // ------------------------------------------------------------------ RENT
  rules.push({
    key: "rent_applications_pending",
    area: "rent",
    title: "Rental applications waiting for a decision",
    rule: "Rental applications still marked Pending. Marked urgent when the oldest has waited more than " + L.approvalUrgentDays + " days.",
    page: "applications",
    run: async () => {
      const where = { status: "Pending", ...direct };
      const select = { id: true, name: true, applicationDate: true, property: { select: { name: true } } };
      const r = await attList(prisma.application, where, ascBy("applicationDate"), select);
      const oldest = r.rows[0]?.applicationDate as Date | undefined;
      return {
        severity: oldest && new Date(oldest).getTime() < urgentWait.getTime() ? "urgent" : "soon",
        count: r.count,
        amount: null,
        examples: r.rows.map((a) => ({
          id: a.id,
          label: String(a.name),
          detail: "applied " + attWhen(a.applicationDate, now),
          date: attIso(a.applicationDate),
          amount: null,
          property: a.property?.name ?? "",
        })),
      };
    },
  });

  rules.push({
    key: "rent_payments_overdue",
    area: "rent",
    title: "Rent payments overdue",
    rule: "Rent payments past their due date and not fully paid (Pending, Partly paid or Overdue), on leases of properties you manage.",
    page: "payments",
    run: async () => {
      const where = {
        paymentStatus: { in: UNPAID },
        dueDate: { lt: now },
        lease: { property: liveProperty },
      };
      const select = {
        id: true,
        amountDue: true,
        amountPaid: true,
        dueDate: true,
        semesterPlan: { select: { reference: true, property: { select: { name: true } } } },
        lease: { select: { id: true, property: { select: { name: true } } } },
      };
      const r = await attList(prisma.payment, where, ascBy("dueDate"), select, { amountDue: true, amountPaid: true });
      return {
        severity: "urgent",
        count: r.count,
        amount: Math.round(((r.sums.amountDue ?? 0) - (r.sums.amountPaid ?? 0)) * 100) / 100,
        examples: r.rows.map((p) => payEx(p, p.lease?.id ? "Lease " + p.lease.id : "Payment " + p.id)),
      };
    },
  });

  rules.push({
    key: "rent_leases_ending",
    area: "rent",
    title: "Leases ending soon",
    rule: "Leases that end within the next " + L.leaseWindowDays + " days and have not been renewed or closed. Marked urgent when one ends within " + L.leaseUrgentDays + " days.",
    page: null,
    run: async () => {
      const where = { status: { in: LEASE_LIVE }, endDate: { gte: now, lte: leaseEnd }, ...direct };
      const r = await attList(prisma.lease, where, ascBy("endDate"), ATT_LEASE_SELECT);
      const first = r.rows[0]?.endDate as Date | undefined;
      return {
        severity: first && new Date(first).getTime() <= leaseUrgent.getTime() ? "urgent" : "soon",
        count: r.count,
        amount: null,
        examples: r.rows.map((l) => leaseEx(l, "ends " + attWhen(l.endDate, now), l.endDate)),
      };
    },
  });

  rules.push({
    key: "rent_leases_ended_open",
    area: "rent",
    title: "Leases past their end date",
    rule: "Leases whose end date has passed but which are still marked live (not renewed, expired or terminated). The system normally expires these overnight.",
    page: null,
    run: async () => {
      const where = { status: { in: LEASE_LIVE }, endDate: { lt: now }, ...direct };
      const r = await attList(prisma.lease, where, ascBy("endDate"), ATT_LEASE_SELECT);
      return {
        severity: "soon",
        count: r.count,
        amount: null,
        examples: r.rows.map((l) => leaseEx(l, "ended " + attWhen(l.endDate, now), l.endDate)),
      };
    },
  });

  rules.push({
    key: "rent_leases_frozen",
    area: "rent",
    title: "Frozen leases",
    rule: "Leases that are currently frozen.",
    page: null,
    run: async () => {
      const where = { status: "FROZEN", ...direct };
      const order = [{ frozenAt: { sort: "asc", nulls: "last" } }, { id: "asc" }];
      const r = await attList(prisma.lease, where, order, ATT_LEASE_SELECT);
      return {
        severity: "info",
        count: r.count,
        amount: null,
        examples: r.rows.map((l) =>
          leaseEx(l, l.frozenAt ? "frozen " + attWhen(l.frozenAt, now) : "frozen", l.frozenAt)
        ),
      };
    },
  });

  // ------------------------------------------------------------ SHORT STAY
  rules.push({
    key: "short_stay_no_show_risk",
    area: "short_stay",
    title: "Short-stay guests who have not arrived",
    rule: "Confirmed short stays whose check-in time passed more than " + L.shortStayGraceHours + " hours ago and the guest is not checked in. The system normally marks these no-show within minutes.",
    page: "bookings",
    run: async () => {
      const where = { status: "CONFIRMED", checkIn: { lt: stayGrace }, ...direct };
      const r = await attList(prisma.booking, where, ascBy("checkIn"), ATT_SHORT_SELECT);
      return {
        severity: "soon",
        count: r.count,
        amount: null,
        examples: r.rows.map((b) => shortEx(b, "check-in was " + attWhen(b.checkIn, now), b.checkIn)),
      };
    },
  });

  rules.push({
    key: "short_stay_arrivals_soon",
    area: "short_stay",
    title: "Short-stay arrivals coming up",
    rule: "Confirmed short stays with check-in from " + L.shortStayGraceHours + " hours ago up to " + L.soonWindowDays + " days from now.",
    page: "bookings",
    run: async () => {
      const where = { status: "CONFIRMED", checkIn: { gte: stayGrace, lte: soon }, ...direct };
      const r = await attList(prisma.booking, where, ascBy("checkIn"), ATT_SHORT_SELECT);
      return {
        severity: "info",
        count: r.count,
        amount: null,
        examples: r.rows.map((b) => shortEx(b, attEvent(b.checkIn, now, "arrives", "was due"), b.checkIn)),
      };
    },
  });

  rules.push({
    key: "short_stay_departures_soon",
    area: "short_stay",
    title: "Short-stay departures coming up",
    rule: "Guests currently checked in whose check-out is from " + L.shortStayGraceHours + " hours ago up to " + L.soonWindowDays + " days from now.",
    page: "bookings",
    run: async () => {
      const where = { status: "CHECKED_IN", checkOut: { gte: stayGrace, lte: soon }, ...direct };
      const r = await attList(prisma.booking, where, ascBy("checkOut"), ATT_SHORT_SELECT);
      return {
        severity: "info",
        count: r.count,
        amount: null,
        examples: r.rows.map((b) => shortEx(b, attEvent(b.checkOut, now, "leaves", "check-out was"), b.checkOut)),
      };
    },
  });

  rules.push({
    key: "short_stay_checkout_overdue",
    area: "short_stay",
    title: "Short-stay guests past their check-out",
    rule: "Guests still marked checked in more than " + L.shortStayGraceHours + " hours after their check-out time. The system normally checks these out automatically within minutes.",
    page: "bookings",
    run: async () => {
      const where = { status: "CHECKED_IN", checkOut: { lt: stayGrace }, ...direct };
      const r = await attList(prisma.booking, where, ascBy("checkOut"), ATT_SHORT_SELECT);
      return {
        severity: "soon",
        count: r.count,
        amount: null,
        examples: r.rows.map((b) => shortEx(b, "check-out was " + attWhen(b.checkOut, now), b.checkOut)),
      };
    },
  });

  // ------------------------------------------------------------- ENQUIRIES
  rules.push({
    key: "enquiries_unread",
    area: "enquiries",
    title: "Enquiries nobody has opened",
    rule: "New enquiries you have not opened yet (not archived). Oldest first, by last activity.",
    page: "enquiries",
    run: async () => {
      const where = { status: "NEW", isRead: false, isArchived: false, ...direct };
      const select = { id: true, enquiryType: true, updatedAt: true, property: { select: { name: true } } };
      const r = await attList(prisma.enquiry, where, ascBy("updatedAt"), select);
      return {
        severity: "info",
        count: r.count,
        amount: null,
        examples: r.rows.map((e) => ({
          id: e.id,
          label: "Enquiry " + e.id,
          detail: String(e.enquiryType) + " - last activity " + attWhen(e.updatedAt, now),
          date: attIso(e.updatedAt),
          amount: null,
          property: e.property?.name ?? "",
        })),
      };
    },
  });

  return rules;
}

// The written rules, without running any of them (used by tests and documentation).
export function getAttentionRuleCatalog() {
  return attRules({}, new Date()).map((r) => ({ key: r.key, area: r.area, title: r.title, rule: r.rule, page: r.page }));
}

const ATT_SEVERITY_RANK: { [s: string]: number } = { urgent: 0, soon: 1, info: 2 };
const ATT_AREA_RANK: { [a: string]: number } = { hostel: 0, rent: 1, short_stay: 2, enquiries: 3 };

export async function getAttentionItems(scope: ReportScope, now: Date = new Date()): Promise<AttentionResult> {
  const rules = attRules(scope, now);
  const items: (AttentionItem & { order: number })[] = [];
  const clear: AttentionResult["clear"] = [];
  const failed: AttentionResult["failed"] = [];

  // One rule at a time (each rule fires its own small group of queries) - kind to the free database.
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    let res: AttRuleResult | null = null;
    for (let attempt = 1; attempt <= 2 && !res; attempt++) {
      try {
        res = await r.run();
      } catch (error: any) {
        if (attempt === 2) console.error("Attention rule failed:", r.key, error?.message ?? error);
        else await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    if (!res) {
      failed.push({ key: r.key, area: r.area, title: r.title });
      continue;
    }
    if (res.count === 0) {
      clear.push({ key: r.key, area: r.area, title: r.title, rule: r.rule });
      continue;
    }
    items.push({
      key: r.key,
      area: r.area,
      severity: res.severity,
      title: r.title,
      rule: r.rule,
      count: res.count,
      amount: res.amount === null ? null : Math.round(res.amount * 100) / 100,
      page: r.page,
      examples: res.examples,
      order: i,
    });
  }

  items.sort(
    (a, b) =>
      ATT_SEVERITY_RANK[a.severity] - ATT_SEVERITY_RANK[b.severity] ||
      ATT_AREA_RANK[a.area] - ATT_AREA_RANK[b.area] ||
      a.order - b.order
  );

  const summary = { urgent: 0, soon: 0, info: 0, items: items.length, records: 0 };
  for (const it of items) {
    summary[it.severity] += 1;
    summary.records += it.count;
  }

  return {
    asOf: now.toISOString(),
    summary,
    items: items.map(({ order, ...rest }) => rest),
    clear,
    failed,
    rulesChecked: rules.length,
  };
}
