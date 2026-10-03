import { prisma } from "./prisma";
import { processEventIntoNotification } from "./notificationEventService";
import { createDeliveriesForNotification } from "./notificationDeliveryService";
import { processEmailDelivery } from "./notificationEmailChannel";
import { processSmsDelivery } from "./notificationSmsChannel";

// -----------------------------------------------------------------------------
//  notificationProcessor.ts  (Step 17, Phase I)
//
//  One tick of the background processor:
//    1. PENDING events that are due  -> Notification -> delivery rows
//    2. Repair: recent notifications that ended up with no delivery rows
//    3. Due EMAIL/SMS deliveries     -> send, with retry/backoff
//
//  Deliberately small: a plain function a cron job can call, so it can
//  later move to a real queue/worker without rewriting the logic.
//  Never throws.
// -----------------------------------------------------------------------------

const EVENT_BATCH = 20;
const DELIVERY_BATCH = 10;
const MAX_DELIVERY_ATTEMPTS = 4;
const DELIVERY_BACKOFF_MS = [60000, 300000, 900000];
const MIN_BACKOFF_MS = DELIVERY_BACKOFF_MS[0];
const STUCK_PROCESSING_MS = 10 * 60 * 1000;
const REPAIR_WINDOW_MS = 60 * 60 * 1000;
// OFF until Phase J: legacy direct createNotification() calls (approve/reject/payment/checkout)
// produce notifications with no event, and the sweep cannot tell them from event-born ones.
const REPAIR_ORPHANS = false;

// Failures that retrying can never fix.
const PERMANENT_ERRORS = ["No email on file for user", "No phone number on file for user"];

const backoffMs = (attempts: number): number =>
  DELIVERY_BACKOFF_MS[Math.min(Math.max(attempts, 1) - 1, DELIVERY_BACKOFF_MS.length - 1)];

let running = false;

export const processPendingEvents = async () => {
  const now = new Date();
  const events = await prisma.notificationEvent.findMany({
    where: {
      status: "PENDING",
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: EVENT_BATCH,
    select: { id: true },
  });

  let created = 0;
  for (const { id } of events) {
    const notification = await processEventIntoNotification(id);
    if (notification) {
      await createDeliveriesForNotification(notification.id, notification.userClerkId, notification.category);
      created++;
    }
  }

  // Repair sweep: a notification with no delivery rows (crash between the two
  // steps above). createDeliveriesForNotification is idempotent, so this is safe.
  const orphans = !REPAIR_ORPHANS ? [] : await prisma.notification.findMany({
    where: {
      deliveries: { none: {} },
      createdAt: { gte: new Date(Date.now() - REPAIR_WINDOW_MS) },
    },
    orderBy: { createdAt: "asc" },
    take: EVENT_BATCH,
    select: { id: true, userClerkId: true, category: true },
  });
  for (const o of orphans) {
    await createDeliveriesForNotification(o.id, o.userClerkId, o.category);
  }

  return { eventsFound: events.length, notificationsCreated: created, orphansRepaired: orphans.length };
};

export const processDueDeliveries = async () => {
  const now = Date.now();
  const candidates = await prisma.notificationDelivery.findMany({
    where: {
      channel: { in: ["EMAIL", "SMS"] },
      OR: [
        { status: "QUEUED" },
        { status: "RETRYING", lastAttemptAt: { lte: new Date(now - MIN_BACKOFF_MS) } },
        { status: "PROCESSING", lastAttemptAt: { lte: new Date(now - STUCK_PROCESSING_MS) } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: DELIVERY_BATCH * 3,
  });

  // Exact backoff check (the query above only pre-filters by the minimum).
  const due = candidates
    .filter((d) => {
      if (d.status !== "RETRYING") return true;
      return !!d.lastAttemptAt && d.lastAttemptAt.getTime() + backoffMs(d.attempts) <= now;
    })
    .slice(0, DELIVERY_BATCH);

  let sent = 0;
  let failed = 0;
  let retrying = 0;

  for (const d of due) {
    // Claim with an optimistic lock so two processors cannot send the same delivery.
    const claim = await prisma.notificationDelivery.updateMany({
      where: { id: d.id, status: d.status, attempts: d.attempts, lastAttemptAt: d.lastAttemptAt },
      data: { status: "PROCESSING", lastAttemptAt: new Date() },
    });
    if (claim.count === 0) continue;

    const result = d.channel === "EMAIL" ? await processEmailDelivery(d.id) : await processSmsDelivery(d.id);
    if (!result) continue; // unexpected error: stays PROCESSING, recovered after STUCK_PROCESSING_MS

    if (result.status === "SENT") {
      sent++;
    } else if (result.status === "FAILED") {
      const permanent = PERMANENT_ERRORS.includes(result.lastError ?? "");
      if (!permanent && result.attempts < MAX_DELIVERY_ATTEMPTS) {
        await prisma.notificationDelivery.update({ where: { id: d.id }, data: { status: "RETRYING" } });
        retrying++;
      } else {
        failed++;
      }
    }
  }

  return { candidates: candidates.length, attempted: due.length, sent, retrying, failed };
};

export const runNotificationProcessorOnce = async () => {
  if (running) {
    console.log("[NOTIFICATION PROCESSOR] Previous tick still running - skipping this one");
    return null;
  }
  running = true;
  try {
    const events = await processPendingEvents();
    const deliveries = await processDueDeliveries();
    return { events, deliveries };
  } catch (err) {
    console.error("[NOTIFICATION PROCESSOR] Tick failed:", err);
    return null;
  } finally {
    running = false;
  }
};