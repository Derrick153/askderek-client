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
