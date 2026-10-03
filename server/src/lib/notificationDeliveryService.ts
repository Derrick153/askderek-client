import { prisma } from "./prisma";
import { NotificationCategory, NotificationChannel } from "@prisma/client";

// -----------------------------------------------------------------------------
//  notificationDeliveryService.ts  (Step 17, Phase D)
//
//  This is the delivery/channel-router layer: Notification ->
//  NotificationDelivery rows -> (later) Provider Adapter.
//
//  Deliberately scoped narrow for Phase D, per Derrick's explicit
//  instruction: create the delivery rows and decide which channels
//  they belong on, but do NOT call any real provider here. Every
//  delivery is created in QUEUED status - actually sending it is
//  Phases F (email)/G (SMS)/I (background processor).
//
//  Active channels for the current scope: IN_APP, EMAIL, SMS.
//  WHATSAPP stays in the schema/enum for future readiness but is
//  deliberately excluded from ACTIVE_CHANNELS below - no WhatsApp
//  delivery row is ever created until that channel is actually built.
// -----------------------------------------------------------------------------

const ACTIVE_CHANNELS: NotificationChannel[] = ["IN_APP", "EMAIL", "SMS"];

// -----------------------------------------------------------------------------
//  CHANNEL ROUTER
//
//  Decides which channels a user should receive a delivery on for a
//  given category. Defaults to enabled=true when no preference row
//  exists yet (nobody has set preferences in Phase D) - the safe
//  default for transactional notifications. An explicit disabled
//  preference (built in a later phase) is respected here already,
//  since the query already checks for it.
// -----------------------------------------------------------------------------
const resolveEnabledChannels = async (
  userClerkId: string,
  category: NotificationCategory
): Promise<NotificationChannel[]> => {
  const preferences = await prisma.notificationPreference.findMany({
    where: { userClerkId, category, channel: { in: ACTIVE_CHANNELS } },
  });

  return ACTIVE_CHANNELS.filter((channel) => {
    const pref = preferences.find((p) => p.channel === channel);
    return pref ? pref.enabled : true;
  });
};

const providerFor = (channel: NotificationChannel): string | null => {
  if (channel === "EMAIL") return "resend";
  if (channel === "SMS") return "arkesel";
  return null; // IN_APP has no external provider
};

// -----------------------------------------------------------------------------
//  CREATE DELIVERIES FOR NOTIFICATION
//
//  Creates one NotificationDelivery row per enabled channel. Idempotent
//  via deliveryKey's real database unique constraint - calling this
//  twice for the same notification never creates duplicate delivery
//  rows; it safely skips whatever already exists. Never throws - a
//  delivery-row failure must not break whatever called this.
// -----------------------------------------------------------------------------
export const createDeliveriesForNotification = async (
  notificationId: number,
  userClerkId: string,
  category: NotificationCategory
) => {
  const channels = await resolveEnabledChannels(userClerkId, category);
  const created: any[] = [];

  for (const channel of channels) {
    const deliveryKey = `${notificationId}:${channel}`;
    try {
      const delivery = await prisma.notificationDelivery.create({
        data: {
          notificationId,
          channel,
          deliveryKey,
          provider: providerFor(channel),
        },
      });
      created.push(delivery);
      if (channel === "IN_APP") {
        await processInAppDelivery(delivery.id);
      }
    } catch (err: any) {
      if (err.code === "P2002") {
        console.log(`[DELIVERY] Delivery already exists, skipping: ${deliveryKey}`);
      } else {
        console.error(`[DELIVERY] Failed to create delivery "${deliveryKey}":`, err);
      }
    }
  }

  return created;
};

// -----------------------------------------------------------------------------
//  PROCESS IN-APP DELIVERY  (Step 17, Phase E)
//
//  In-app has no external provider - the Notification row itself,
//  once it exists, IS the delivery (the student's notification list
//  already reads directly from Notification). So there is nothing to
//  "send": this simply marks the delivery DELIVERED immediately,
//  giving in-app the same consistent status/monitoring shape as every
//  other channel, per the architecture Derrick approved in Phase B.
// -----------------------------------------------------------------------------
export const processInAppDelivery = async (deliveryId: number) => {
  try {
    return await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "DELIVERED",
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`[DELIVERY] Failed to mark in-app delivery ${deliveryId} as delivered:`, err);
    return null;
  }
};