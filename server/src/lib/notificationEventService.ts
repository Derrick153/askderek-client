import { prisma } from "./prisma";
import { EventType, OutboxStatus, NotificationCategory } from "@prisma/client";

// -----------------------------------------------------------------------------
//  notificationEventService.ts  (Step 17, Phase C)
//
//  This is the outbox/event layer. A business action (approveBooking,
//  the payment webhook, checkoutStudent, etc.) calls recordEvent() with
//  a real idempotency key AFTER its own transaction has already
//  committed - it never blocks or fails the business transaction.
//
//  DESIGN RULES (same spirit as auditService.ts / notificationService.ts):
//
//  1. Never throw. A failed event write or a failed notification write
//     must never break the caller. Every function here catches its own
//     errors and logs them.
//
//  2. Idempotency is enforced by the DATABASE, not application logic.
//     NotificationEvent.idempotencyKey has a real unique constraint.
//     A P2002 error on that constraint is EXPECTED, normal behaviour
//     for a duplicate event - not a bug, not something to alarm-log.
//
//  3. This file only goes as far as Event -> Notification. Turning a
//     Notification into NotificationDelivery rows per channel is
//     Phase D (delivery architecture) - deliberately not built here.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
//  RECORD EVENT (the outbox write)
//
//  Call this right after a real business transaction commits. Returns
//  the created event, or null if this exact event was already recorded
//  (duplicate idempotencyKey) or if the write genuinely failed - both
//  cases are safe to ignore from the caller's perspective.
// -----------------------------------------------------------------------------
export const recordEvent = async (args: {
  eventType: EventType;
  entityType: string;
  entityId: number;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}) => {
  try {
    const event = await prisma.notificationEvent.create({
      data: {
        eventType: args.eventType,
        entityType: args.entityType,
        entityId: args.entityId,
        idempotencyKey: args.idempotencyKey,
        payload: args.payload as any,
      },
    });
    return event;
  } catch (err: any) {
    if (err.code === "P2002") {
      console.log(`[EVENT] Duplicate event ignored (already recorded): ${args.idempotencyKey}`);
      return null;
    }
    console.error(`[EVENT] Failed to record event "${args.idempotencyKey}":`, err);
    return null;
  }
};

// -----------------------------------------------------------------------------
//  EVENT -> NOTIFICATION TEMPLATE MAP
//
//  Deliberately simple for Phase C: category + title + a message
//  template using {{variable}} placeholders filled from the event's
//  own payload. Real channel-specific (email/SMS) templates come in
//  Phases F/G - this is only the in-app/base notification text.
// -----------------------------------------------------------------------------
const EVENT_TEMPLATES: Record<EventType, { category: NotificationCategory; title: string; message: string }> = {
  BOOKING_SUBMITTED:       { category: "BOOKING",   title: "Booking submitted",        message: "Your booking request for {{hostelName}} has been submitted." },
  BOOKING_APPROVED:        { category: "APPROVAL",  title: "Booking approved",         message: "Your booking has been approved. Please complete payment to confirm your spot." },
  BOOKING_REJECTED:        { category: "APPROVAL",  title: "Booking rejected",         message: "Your booking request was not approved. Reason: {{reason}}" },
  BOOKING_CANCELLED:       { category: "BOOKING",   title: "Booking cancelled",        message: "Your booking has been cancelled." },
  BOOKING_EXPIRED:         { category: "BOOKING",   title: "Booking expired",          message: "Your booking at {{propertyName}} has expired because payment wasn't completed before the deadline. The bed is no longer reserved for you." },
  PAYMENT_SUCCESSFUL:      { category: "PAYMENT",   title: "Payment confirmed",        message: "Your payment of GHS {{amount}} was received. Your booking is now active." },
  RENT_PAYMENT_SUCCESSFUL: { category: "PAYMENT",   title: "Rent payment received",    message: "Your rent payment of GHS {{amount}} was received." },
  RENT_PAYMENT_FAILED:     { category: "PAYMENT",   title: "Rent payment failed",       message: "Your rent payment of GHS {{amount}} could not be processed. Please try again." },
  CASH_PAYMENT_RECORDED:   { category: "PAYMENT",   title: "Cash payment recorded",    message: "Your cash payment of GHS {{amount}} was recorded by {{recordedBy}}. Ref: {{reference}}. Keep your physical receipt." },
  PAYMENT_FAILED:          { category: "PAYMENT",   title: "Payment failed",          message: "Your payment of GHS {{amount}} could not be processed. Please try again." },
  PAYMENT_REQUIRED:        { category: "PAYMENT",   title: "Payment required",         message: "Please complete payment to confirm your booking." },
  BED_ASSIGNMENT_CHANGED:  { category: "BOOKING",   title: "Bed assignment changed",   message: "Your bed assignment has changed to {{bedNumber}}." },
  CHECK_IN_APPROACHING:    { category: "CHECK_IN",  title: "Check-in approaching",     message: "Your check-in is coming up soon." },
  CHECK_IN_COMPLETED:      { category: "CHECK_IN",  title: "Checked in",               message: "You have been checked in successfully." },
  CHECK_OUT_APPROACHING:   { category: "CHECK_OUT", title: "Check-out approaching",    message: "Your check-out date is coming up soon." },
  CHECK_OUT_COMPLETED:     { category: "CHECK_OUT", title: "Stay completed",           message: "Your check-out has been confirmed. Thank you for staying with us." },
  HOSTEL_ANNOUNCEMENT:     { category: "HOSTEL",    title: "Hostel announcement",      message: "{{announcementText}}" },
  SYSTEM_ANNOUNCEMENT:     { category: "SYSTEM",    title: "System announcement",      message: "{{announcementText}}" },
};

const fillTemplate = (template: string, payload: Record<string, unknown>): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => (payload[key] !== undefined ? String(payload[key]) : ""));

// -----------------------------------------------------------------------------
//  RETRY POLICY (events)
//
//  A transient failure (e.g. a database blip) leaves the event PENDING
//  with a nextAttemptAt in the future, so the background processor
//  picks it up again after a backoff. After MAX_EVENT_ATTEMPTS it is
//  marked FAILED and stays visible for investigation. A permanently
//  bad event (no userClerkId) fails immediately - retrying can't fix it.
// -----------------------------------------------------------------------------
const MAX_EVENT_ATTEMPTS = 4;
const EVENT_BACKOFF_MS = [60_000, 300_000, 900_000];
const eventBackoffMs = (attemptsSoFar: number): number =>
  EVENT_BACKOFF_MS[Math.min(attemptsSoFar - 1, EVENT_BACKOFF_MS.length - 1)];

// -----------------------------------------------------------------------------
//  PROCESS EVENT INTO NOTIFICATION
//
//  Turns one NotificationEvent into a real Notification row. The event
//  is claimed (PENDING -> PROCESSED) and the notification is created
//  inside ONE transaction: if the insert fails, the claim rolls back
//  with it, so a retry can never produce a second notification for the
//  same event. If another processor already claimed the event, nothing
//  is created. Never throws.
// -----------------------------------------------------------------------------
export const processEventIntoNotification = async (eventId: number) => {
  try {
    const event = await prisma.notificationEvent.findUnique({ where: { id: eventId } });
    if (!event || event.status !== "PENDING") return null;

    const template = EVENT_TEMPLATES[event.eventType];
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const userClerkId = payload.userClerkId as string | undefined;

    if (!userClerkId) {
      console.error(`[EVENT] Event ${eventId} has no userClerkId in payload - permanent failure`);
      await prisma.notificationEvent.update({
        where: { id: eventId },
        data: {
          status: "FAILED",
          lastError: "Missing userClerkId in payload",
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          nextAttemptAt: null,
        },
      });
      return null;
    }

    const notification = await prisma.$transaction(
      async (tx) => {
        const claimed = await tx.notificationEvent.updateMany({
          where: { id: eventId, status: "PENDING" },
          data: { status: "PROCESSED", processedAt: new Date() },
        });
        if (claimed.count === 0) return null;

        return await tx.notification.create({
          data: {
            userClerkId,
            category: template.category,
            title: template.title,
            message: fillTemplate(template.message, payload),
            bookingId: typeof payload.bookingId === "number" ? payload.bookingId : undefined,
            leaseId: typeof payload.leaseId === "number" ? payload.leaseId : undefined,
            actionUrl: typeof payload.actionUrl === "string" ? payload.actionUrl : undefined,
          },
        });
      },
      { timeout: 15000, maxWait: 10000 }
    );

    return notification;
  } catch (err: any) {
    console.error(`[EVENT] Failed to process event ${eventId} into a notification:`, err);
    try {
      const current = await prisma.notificationEvent.findUnique({
        where: { id: eventId },
        select: { attempts: true },
      });
      const attemptsNow = (current?.attempts ?? 0) + 1;
      const giveUp = attemptsNow >= MAX_EVENT_ATTEMPTS;
      await prisma.notificationEvent.update({
        where: { id: eventId },
        data: {
          status: giveUp ? "FAILED" : "PENDING",
          attempts: attemptsNow,
          lastAttemptAt: new Date(),
          nextAttemptAt: giveUp ? null : new Date(Date.now() + eventBackoffMs(attemptsNow)),
          lastError: String(err?.message ?? err),
        },
      });
    } catch {
      // even recording the failure failed - nothing more we can safely do here
    }
    return null;
  }
};