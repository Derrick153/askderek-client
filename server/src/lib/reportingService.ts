import { prisma } from "./prisma";

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

  const [bookingValueAgg, receivedAgg, failedAgg, refundedAgg, outstandingAgg] =
    await Promise.all([
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
    ]);

  const outstandingDue  = outstandingAgg._sum.amountDue  ?? 0;
  const outstandingPaid = outstandingAgg._sum.amountPaid ?? 0;

  return {
    bookingValue: bookingValueAgg._sum.amountDue ?? 0,
    received:     receivedAgg._sum.amountPaid ?? 0,
    failed:       failedAgg._sum.amount ?? 0,
    refunded:     refundedAgg._sum.amount ?? 0,
    outstanding:  outstandingDue - outstandingPaid,
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
