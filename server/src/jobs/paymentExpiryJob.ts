import cron             from "node-cron";
import { prisma }       from "../lib/prisma";
import { isPaymentExpired } from "../lib/paymentUtils";
import { logSystemEvent }   from "../lib/auditService";
import { transitionBooking, BookingTxError } from "../lib/bookingTransitionService";
import { notifyTenantPaymentExpired } from "../lib/notificationService";
import { recordEvent } from "../lib/notificationEventService";
import { runNotificationProcessorOnce } from "../lib/notificationProcessor";

// ─────────────────────────────────────────────────────────────────────────────
//  paymentExpiryJob.ts
//
//  Runs every 10 minutes.
//  Finds INIT or PENDING payments older than 30 minutes.
//  Marks them EXPIRED and frees the payment slot.
//  Notifies tenant to retry.
// ─────────────────────────────────────────────────────────────────────────────

// Hostel booking payment deadline expiry. Distinct from the transaction-
// session expiry above: this expires the actual SemesterPlan booking
// itself once its 24-hour paymentDueAt has passed unpaid, atomically
// releasing the bed back to AVAILABLE - the two must move together.
const expireOverdueHostelBookings = async (): Promise<void> => {
  const now = new Date();

  try {
    const overdue = await prisma.semesterPlan.findMany({
      where: {
        status:       "AWAITING_PAYMENT",
        paymentDueAt: { lt: now },
      },
      select: { id: true, bedId: true, propertyId: true, studentClerkId: true,
                property: { select: { name: true } } },
    });

    if (overdue.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const booking of overdue) {
      try {
        await prisma.$transaction(async (tx) => {
          await transitionBooking(tx, {
            bookingId: booking.id,
            toStatus: "EXPIRED",
            actorClerkId: "system",
            actorRole: "SYSTEM",
            reason: "Payment deadline passed unpaid",
          });

          if (booking.bedId) {
            await tx.bed.update({
              where: { id: booking.bedId },
              data:  { status: "AVAILABLE", currentBookingId: null },
            });

            await tx.bedStatusHistory.create({
              data: {
                bedId:            booking.bedId,
                bookingId:        booking.id,
                oldStatus:        "RESERVED",
                newStatus:        "AVAILABLE",
                action:           "HOSTEL_PAYMENT_DEADLINE_EXPIRED",
                performedBy:      "system",
              },
            });
          }
        });

        await logSystemEvent({
          action:  "HOSTEL_PAYMENT_DEADLINE_EXPIRED",
          target:  "SemesterPlan #" + booking.id,
          details: "Payment deadline passed unpaid. Student: " + booking.studentClerkId + ". Property #" + booking.propertyId + ". Bed released.",
        });

        try {
          await recordEvent({
            eventType:      "BOOKING_EXPIRED",
            entityType:     "SemesterPlan",
            entityId:       booking.id,
            idempotencyKey: `BOOKING_EXPIRED:${booking.id}`,
            payload: {
              userClerkId:  booking.studentClerkId,
              bookingId:    booking.id,
              propertyName: booking.property.name,
            },
          });
          void runNotificationProcessorOnce();
        } catch (err) {
          console.error("[EXPIRY JOB] BOOKING_EXPIRED event error:", err);
        }

        successCount++;
      } catch (err) {
        failCount++;
        console.error("[paymentExpiryJob] Failed to expire SemesterPlan #" + booking.id, {
          error: err instanceof Error ? err.message : err,
        });
      }
    }

    console.log("[paymentExpiryJob] Expired " + successCount + " overdue hostel booking(s). Failed: " + failCount);
  } catch (error) {
    console.error("[paymentExpiryJob.expireOverdueHostelBookings] Fatal error", {
      error: error instanceof Error ? error.message : error,
    });
  }
};
export const startPaymentExpiryJob = (): void => {
  cron.schedule("*/10 * * * *", async () => {
    console.log("⏰ [EXPIRY JOB] Checking for expired payments...");

    try {
      const expiryMinutes = parseInt(
        process.env.PAYMENT_EXPIRY_MINUTES || "30"
      );

      const cutoffTime = new Date(
        Date.now() - expiryMinutes * 60 * 1000
      );

      // ── Find old PENDING transactions ──
      const expiredTransactions = await prisma.transaction.findMany({
        where: {
          status:    "Pending",
          createdAt: { lt: cutoffTime },
        },
        include: {
          lease: {
            include: {
              tenant:   { include: { user: true } },
              property: true,
            },
          },
          payment: true,
        },
      });

      console.log(
        `[EXPIRY JOB] Found ${expiredTransactions.length} expired transactions`
      );

      for (const transaction of expiredTransactions) {
        try {
          // ── Mark transaction expired ──
          await prisma.transaction.update({
            where: { id: transaction.id },
            data:  { status: "Failed" },
          });

          // ── Mark payment expired if exists ──
          if (transaction.payment) {
            await prisma.payment.update({
              where: { id: transaction.payment.id },
              data:  { paymentStatus: "Pending" },
            });

            await prisma.paymentLog.create({
              data: {
                paymentId:      transaction.payment.id,
                action:         "PAYMENT_EXPIRED",
                previousStatus: "Pending",
                newStatus:      "Expired",
                performedBy:    "system",
                notes:          `Payment session expired after ${expiryMinutes} minutes`,
              },
            });
          }

          // ── Notify tenant ──
          const tenant   = transaction.lease?.tenant?.user;
          const property = transaction.lease?.property;

          if (tenant && property) {
            await notifyTenantPaymentExpired({
              tenantName:      tenant.name,
              tenantPhone:     tenant.phoneNumber || undefined,
              propertyAddress: property.name,
              amountDue:       transaction.amount,
            });
          }

          await logSystemEvent({
            action:  "PAYMENT_EXPIRED",
            target:  `Transaction ${transaction.id}`,
            details: `Expired after ${expiryMinutes} minutes`,
          });

          console.log(`✅ [EXPIRY JOB] Expired transaction ${transaction.id}`);
        } catch (err) {
          console.error(
            `❌ [EXPIRY JOB] Failed for transaction ${transaction.id}:`,
            err
          );
        }
      }

      await expireOverdueHostelBookings();

      console.log("✅ [EXPIRY JOB] Complete");
    } catch (err) {
      console.error("❌ [EXPIRY JOB] Fatal error:", err);
    }
  });

  console.log("✅ Payment expiry job scheduled — runs every 10 minutes");
};