import { HostelBookingStatus } from "@prisma/client";

// -----------------------------------------------------------------------------
//  bookingTransitionService.ts
//
//  THE single authoritative source for hostel booking status transitions.
//  No controller should ever write "data: { status: X }" on a SemesterPlan
//  directly - every transition goes through transitionBooking() here, which
//  validates the transition is legal, validates the actor is allowed to make
//  it, performs the update, and records it in BookingTransitionHistory -
//  all atomically, inside the caller's own transaction (tx).
//
//  Throws BookingTxError on any invalid transition or unauthorized actor -
//  callers catch this the same way they catch any other transaction error,
//  which correctly rolls back everything in the same transaction.
// -----------------------------------------------------------------------------

export class BookingTxError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export type BookingActor = "STUDENT" | "MANAGER" | "ADMIN" | "SYSTEM";

interface TransitionRule {
  from: HostelBookingStatus[];
  to: HostelBookingStatus;
  allowedActors: BookingActor[];
}

const TRANSITION_RULES: TransitionRule[] = [
  { from: ["PENDING_APPROVAL"], to: "AWAITING_PAYMENT", allowedActors: ["MANAGER"] },
  { from: ["PENDING_APPROVAL"], to: "REJECTED", allowedActors: ["MANAGER"] },
  { from: ["PENDING_APPROVAL", "AWAITING_PAYMENT"], to: "CANCELLED", allowedActors: ["STUDENT", "MANAGER", "ADMIN"] },
  { from: ["ACTIVE"], to: "CANCELLED", allowedActors: ["MANAGER", "ADMIN"] },
  { from: ["AWAITING_PAYMENT"], to: "ACTIVE", allowedActors: ["SYSTEM"] },
  { from: ["AWAITING_PAYMENT"], to: "EXPIRED", allowedActors: ["SYSTEM"] },
  { from: ["ACTIVE", "EXTENDED"], to: "COMPLETED", allowedActors: ["MANAGER"] },
];

export async function transitionBooking(
  tx: any,
  params: {
    bookingId: number;
    toStatus: HostelBookingStatus;
    actorClerkId: string;
    actorRole: BookingActor;
    reason?: string;
    extraData?: Record<string, any>;
  }
) {
  const booking = await tx.semesterPlan.findUnique({ where: { id: params.bookingId } });
  if (!booking) {
    throw new BookingTxError(404, "Booking not found");
  }

  const rule = TRANSITION_RULES.find(
    (r) => r.to === params.toStatus && r.from.includes(booking.status)
  );
  if (!rule) {
    throw new BookingTxError(
      400,
      "Cannot transition booking from " + booking.status + " to " + params.toStatus
    );
  }

  if (!rule.allowedActors.includes(params.actorRole)) {
    throw new BookingTxError(
      403,
      params.actorRole + " is not authorized to make this transition"
    );
  }

  const updated = await tx.semesterPlan.update({
    where: { id: params.bookingId },
    data: { status: params.toStatus, ...(params.extraData ?? {}) },
  });

  await tx.bookingTransitionHistory.create({
    data: {
      bookingId: params.bookingId,
      fromStatus: booking.status,
      toStatus: params.toStatus,
      actorClerkId: params.actorClerkId,
      actorRole: params.actorRole,
      reason: params.reason ?? null,
    },
  });

  return updated;
}