import { prisma } from "./prisma";

// -----------------------------------------------------------------------------
//  inAppNotificationService.ts
//
//  In-app notifications for students (Step 15, Phase 8). A notification
//  tells a student something changed about their accommodation - their
//  booking was approved, payment came through, a check-out was confirmed.
//
//  This is deliberately named separately from notificationService.ts,
//  which is the existing SMS/email dispatch system for Rent payments
//  (notifyPaymentSuccess, notifyPaymentFailed, etc.) - a different,
//  already-working system this file does not touch or duplicate.
//
//  Phase 8 scope is intentionally simple: store it, list it, mark it
//  read. No push, no email, no websockets - those are separate future work.
//
//  Like auditService, this never throws. A failed notification write
//  should never break the real action (approval, payment, checkout) that
//  triggered it - the booking state change is what matters; the
//  notification is a courtesy on top of it.
// -----------------------------------------------------------------------------

export type NotificationCategory =
  | "BOOKING"
  | "APPROVAL"
  | "PAYMENT"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "HOSTEL"
  | "SEMESTER"
  | "SYSTEM";

interface CreateNotificationArgs {
  userClerkId: string;
  category:    NotificationCategory;
  title:       string;
  message:     string;
  bookingId?:  number;
  actionUrl?:  string;
}

// -----------------------------------------------------------------------------
//  CREATE NOTIFICATION
//
//  Called from the same success path as logSystemEvent/logUserEvent -
//  after a real state change has already committed (booking approved,
//  payment verified, checkout confirmed). Callers rely on the
//  transition's own state guard for idempotency: if the same event is
//  retried after the booking has already moved on, the guard rejects
//  the retry before this function is ever reached, so no duplicate
//  notification gets created.
// -----------------------------------------------------------------------------
export const createNotification = async (
  args: CreateNotificationArgs
): Promise<void> => {
  try {
    await prisma.notification.create({
      data: {
        userClerkId: args.userClerkId,
        category:    args.category,
        title:       args.title,
        message:     args.message,
        bookingId:   args.bookingId ?? null,
        actionUrl:   args.actionUrl ?? null,
      },
    });
  } catch (err) {
    console.error(
      `[IN-APP NOTIFICATION] Failed to create notification "${args.title}" for ${args.userClerkId}:`,
      err
    );
  }
};