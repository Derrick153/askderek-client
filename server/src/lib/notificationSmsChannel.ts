import { sendSMS } from "./sms";
import { prisma } from "./prisma";

// -----------------------------------------------------------------------------
//  notificationSmsChannel.ts  (Step 17, Phase G)
//
//  SMS delivery for the notification architecture. Reuses the
//  EXISTING Arkesel integration (sendSMS from sms.ts) - no new SMS
//  provider. sendSMS already returns a real boolean (its own internal
//  error handling already distinguishes success/failure correctly,
//  unlike Resend's soft-failure-object pattern found in Phase F), so
//  that boolean is trusted directly here.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
//  PROCESS SMS DELIVERY
//
//  Takes one SMS NotificationDelivery row, looks up the real
//  student's phone number, sends via the existing sendSMS(), and
//  updates the delivery status (SENT or FAILED). Never throws.
// -----------------------------------------------------------------------------
export const processSmsDelivery = async (deliveryId: number) => {
  try {
    const delivery = await prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: { notification: true },
    });
    if (!delivery || delivery.channel !== "SMS") return null;

    const user = await prisma.user.findUnique({
      where: { clerkId: delivery.notification.userClerkId },
      select: { phoneNumber: true },
    });

    if (!user?.phoneNumber) {
      return await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "FAILED",
          lastError: "No phone number on file for user",
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });
    }

    const message = `AskDerek: ${delivery.notification.message}`;
    const sent = await sendSMS(user.phoneNumber, message);

    if (sent) {
      return await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "SENT",
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });
    }

    return await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        lastError: "SMS provider (Arkesel) reported failure - see server logs for details",
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error(`[SMS] Failed to process delivery ${deliveryId}:`, err);
    return null;
  }
};