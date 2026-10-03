import { Request, Response }                           from "express";
import { prisma }                                       from "../lib/prisma";
import { Webhook }                                      from "svix";
import { verifyPaystackSignature, calculateCommission } from "../lib/paymentUtils";
import { logSystemEvent }                               from "../lib/auditService";
import { transitionBooking } from "../lib/bookingTransitionService";
import { createNotification } from "../lib/inAppNotificationService";
import { recordEvent } from "../lib/notificationEventService";
import { runNotificationProcessorOnce } from "../lib/notificationProcessor";
import { createReceiptForPayment } from "../lib/receiptService";

// ── Extend Express Request to include rawBody ──────────────
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  webhookControllers.ts
//
//  Handles ALL incoming webhooks for AskDerek in one file.
//
//  ┌─────────────────────────────────────────────────────────┐
//  │  POST /webhooks/clerk     → handleClerkWebhook          │
//  │  POST /webhooks/paystack  → handlePaystackWebhook        │
//  └─────────────────────────────────────────────────────────┘
//
//  SHARED DESIGN RULES:
//    1. Verify signature FIRST — reject anything that fails, log it
//    2. req.rawBody for ALL signature verification — never JSON.stringify(req.body)
//    3. Respond early for Paystack — 200 before processing (5s timeout rule)
//    4. Never let a failed notification crash a confirmed payment
// ─────────────────────────────────────────────────────────────────────────────

// ── SAFE COMMISSION RATE ───────────────────────────────────
const getCommissionPercent = (): number => {
  const raw = Number(process.env.COMMISSION_PERCENTAGE);
  return Number.isFinite(raw) && raw > 0 ? raw : 5;
};

// ═════════════════════════════════════════════════════════════════════════════
//  CLERK WEBHOOK
// ═════════════════════════════════════════════════════════════════════════════

export const handleClerkWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      res.status(500).json({ error: "Clerk webhook secret not configured" });
      return;
    }

    const svix_id        = req.headers["svix-id"]        as string;
    const svix_timestamp = req.headers["svix-timestamp"] as string;
    const svix_signature = req.headers["svix-signature"] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
      res.status(400).json({ error: "Missing svix headers" });
      return;
    }

    if (!req.rawBody) {
      console.error("[CLERK] ❌ Missing raw body — rawBodyMiddleware not applied to this route");
      res.status(400).json({ error: "Missing raw body" });
      return;
    }

    const wh  = new Webhook(WEBHOOK_SECRET);
    let evt: any;

    try {
      evt = wh.verify(req.rawBody.toString(), {
        "svix-id":        svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("[CLERK] ❌ Signature verification failed:", err);
      res.status(400).json({ error: "Webhook verification failed" });
      return;
    }

    const { type, data } = evt;
    console.log(`[CLERK] 📩 Received: ${type}`);

    switch (type) {
      case "user.created": await handleUserCreated(data); break;
      case "user.updated": await handleUserUpdated(data); break;
      case "user.deleted": await handleUserDeleted(data); break;
      default:
        console.log(`[CLERK] ℹ️ Unhandled event type: ${type}`);
    }

    res.status(200).json({ success: true, type });
  } catch (error) {
    console.error("[CLERK] ❌ Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── user.created ───────────────────────────────────────────
async function handleUserCreated(data: any): Promise<void> {
  const {
    id,
    email_addresses,
    first_name,
    last_name,
    phone_numbers,
    public_metadata,
  } = data;

  const email       = email_addresses?.[0]?.email_address || "";
  const name        = `${first_name || ""} ${last_name || ""}`.trim() || "User";
  const phoneNumber = phone_numbers?.[0]?.phone_number   || "";
  const userType    = (public_metadata?.userType as string) || "tenant";

  const user = await prisma.user.upsert({
    where:  { clerkId: id },
    update: { email, name, phoneNumber },
    create: {
      clerkId:     id,
      email,
      name,
      phoneNumber,
      role: userType === "admin"
        ? "ADMIN"
        : userType === "manager"
        ? "MANAGER"
        : "TENANT",
    },
  });

  console.log(`[CLERK] ✅ User created/updated: ${user.name} (${user.role})`);

  if (user.role === "ADMIN") return;

  if (user.role === "TENANT") {
    const existing = await prisma.tenant.findUnique({ where: { userId: user.id } });
    if (!existing) {
      await prisma.tenant.create({
        data: { clerkId: id, userId: user.id, phoneNumber },
      });
      console.log(`[CLERK] ✅ Tenant profile created: ${user.name}`);
    }
  }

  if (user.role === "MANAGER") {
    const existing = await prisma.manager.findUnique({ where: { userId: user.id } });
    if (!existing) {
      await prisma.manager.create({
        data: { clerkId: id, userId: user.id },
      });
      console.log(`[CLERK] ✅ Manager profile created: ${user.name}`);
    }
  }
}

// ── user.updated ───────────────────────────────────────────
async function handleUserUpdated(data: any): Promise<void> {
  const { id, email_addresses, first_name, last_name, phone_numbers } = data;

  const email       = email_addresses?.[0]?.email_address || "";
  const name        = `${first_name || ""} ${last_name || ""}`.trim();
  const phoneNumber = phone_numbers?.[0]?.phone_number || "";

  const user = await prisma.user.findUnique({ where: { clerkId: id } });

  if (!user) {
    console.warn(`[CLERK] ⚠️ User not found for update — clerkId: ${id}`);
    return;
  }

  await prisma.user.update({
    where: { clerkId: id },
    data:  {
      ...(name        && { name }),
      ...(email       && { email }),
      ...(phoneNumber && { phoneNumber }),
    },
  });

  console.log(`[CLERK] ✅ User updated: ${id}`);
}

// ── user.deleted ───────────────────────────────────────────
async function handleUserDeleted(data: any): Promise<void> {
  const { id } = data;
  try {
    await prisma.user.delete({ where: { clerkId: id } });
    console.log(`[CLERK] ✅ User deleted: ${id}`);
  } catch (err) {
    console.warn(`[CLERK] ⚠️ Could not delete user ${id}:`, err);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAYSTACK WEBHOOK
// ═════════════════════════════════════════════════════════════════════════════

export const handlePaystackWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  // ✅ Respond 200 immediately — Paystack retries if no response within 5s
  res.sendStatus(200);

  try {
    const signature = req.headers["x-paystack-signature"] as string;
    const rawBody   = req.rawBody;

    if (!rawBody || !signature) {
      console.error("[PAYSTACK] ❌ Missing raw body or signature");
      return;
    }

    const isValid = verifyPaystackSignature(
      rawBody,
      signature,
      process.env.PAYSTACK_SECRET_KEY!
    );

    if (!isValid) {
      console.error("[PAYSTACK] ❌ Invalid signature — possible fraud attempt");
      await logSystemEvent({
        action:  "WEBHOOK_REJECTED",
        target:  "Paystack Webhook",
        details: "HMAC-SHA512 signature verification failed",
      });
      return;
    }

    await logSystemEvent({
      action:  "WEBHOOK_VERIFIED",
      target:  "Paystack Webhook",
      details: `Event: ${req.body?.event}`,
    });

    const event = req.body;
    console.log(`[PAYSTACK] 📦 Received: ${event.event}`);

    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(event.data);
        break;
      case "charge.failed":
        await handleChargeFailed(event.data);
        break;
      default:
        console.log(`[PAYSTACK] ℹ️ Unhandled event type: ${event.event}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[PAYSTACK] ❌ Processing error:", message);
  }
};

// ── charge.success ─────────────────────────────────────────
const handleChargeSuccess = async (data: any): Promise<void> => {
  if (data.metadata?.semesterPlanId) {
    await handleHostelChargeSuccess(data);
    return;
  }

  const reference     = data.reference  as string;
  const amountPesewas = data.amount     as number;
  const amountGHS     = amountPesewas / 100;
  const channel       = data.channel    as string;
  const paidAt        = new Date(data.paid_at);

  const metadata       = data.metadata       || {};
  const leaseId        = Number(metadata.leaseId);
  const managerClerkId = metadata.managerClerkId as string | undefined;

  console.log(`[PAYSTACK] ✅ charge.success — ref: ${reference}, amount: GH₵ ${amountGHS}`);

  // ── Idempotency check ──
  const existing = await prisma.payment.findFirst({
    where: { paystackReference: reference },
  });

  if (existing?.paymentStatus === "Paid") {
    console.log(`[PAYSTACK] ℹ️ Already processed — skipping: ${reference}`);
    return;
  }

  // ── Fetch lease for notification context ──
  const lease = await prisma.lease.findUnique({
    where:   { id: leaseId },
    include: {
      tenant:   { include: { user: true } },
      property: {
        include: { manager: { include: { user: true } } },
      },
    },
  });

  // ── ✅ FIX: use paidAt for dueDate — lease has no nextDueDate field ──
  const payment = existing
    ? await prisma.payment.update({
        where: { id: existing.id },
        data:  {
          amountPaid:    amountGHS,
          paymentDate:   paidAt,
          paymentStatus: "Paid",
        },
      })
    : await prisma.payment.create({
        data: {
          leaseId,
          amountDue:         amountGHS,
          amountPaid:        amountGHS,
          dueDate:           paidAt,
          paymentDate:       paidAt,
          paymentStatus:     "Paid",
          paystackReference: reference,
        },
      });

  // ── Update Transaction ──
  await prisma.transaction.updateMany({
    where: { paystackReference: reference },
    data:  {
      status:    "Success",
      channel,
      paidAt,
      paymentId: payment.id,
    },
  });

  // ── Record Commission ──
  const transaction = await prisma.transaction.findFirst({
    where: { paystackReference: reference },
  });

  if (transaction && managerClerkId) {
    const existingCommission = await prisma.commission.findUnique({
      where: { transactionId: transaction.id },
    });

    if (!existingCommission) {
      // ✅ FIX: calculateCommission returns { commissionAmount, landlordAmount }
      const commission = calculateCommission(amountGHS, getCommissionPercent());

      await prisma.commission.create({
        data: {
          transactionId:    transaction.id,
          managerClerkId,
          grossAmount:      amountGHS,
          commissionRate:   getCommissionPercent() / 100,
          commissionAmount: commission.commissionAmount,
          netAmount:        commission.landlordAmount,
        },
      });
    }
  }

  // ── Audit log ──
  await logSystemEvent({
    action:  "PAYMENT_SUCCESS",
    target:  `Payment #${payment.id}`,
    details: `ref: ${reference}, amount: GH₵ ${amountGHS}, channel: ${channel}`,
  });

  // ── Step 17: RENT_PAYMENT_SUCCESSFUL event (the sole Lease/Rent payment-success notification path — the legacy notifyPaymentSuccess() call was removed from here after this path was proven with real webhook test evidence) ──
  if (lease) {
    try {
      await recordEvent({
        eventType:      "RENT_PAYMENT_SUCCESSFUL",
        entityType:     "Lease",
        entityId:       leaseId,
        idempotencyKey: `RENT_PAYMENT_SUCCESSFUL:${reference}`,
        payload: {
          userClerkId: lease.tenantClerkId,
          leaseId:     leaseId,
          amount:      amountGHS,
          reference,
        },
      });
      void runNotificationProcessorOnce();
    } catch (err) {
      console.error("[PAYSTACK] RENT_PAYMENT_SUCCESSFUL event error:", err);
    }

    // Step 18: create the official Receipt for this payment - additive, never
    // blocks the webhook if it fails.
    try {
      await createReceiptForPayment(payment.id);
    } catch (err) {
      console.error("[PAYSTACK] Receipt creation error:", err);
    }
  }
};

// ── charge.failed ──────────────────────────────────────────
// Hostel charge.success - same proven idempotency/commission pattern as
// the Rent handler above, extended for SemesterPlan instead of Lease.
// Payment, Transaction, Commission, Booking status, and Bed status all
// move together in ONE atomic transaction - never partially.
const handleHostelChargeSuccess = async (data: any): Promise<void> => {
  const reference     = data.reference  as string;
  const amountPesewas = data.amount     as number;
  const amountGHS     = amountPesewas / 100;
  const channel       = data.channel    as string;
  const paidAt        = new Date(data.paid_at);

  const metadata       = data.metadata       || {};
  const semesterPlanId = Number(metadata.semesterPlanId);
  const managerClerkId = metadata.managerClerkId as string | undefined;

  console.log("[PAYSTACK] HOSTEL charge.success - ref: " + reference + ", amount: GHS " + amountGHS);

  const existing = await prisma.payment.findFirst({
    where: { paystackReference: reference },
  });

  if (existing?.paymentStatus === "Paid") {
    console.log("[PAYSTACK] Already processed - skipping: " + reference);
    return;
  }

  const booking = await prisma.semesterPlan.findUnique({
    where:   { id: semesterPlanId },
    include: { property: { include: { manager: { include: { user: true } } } } },
  });

  if (!booking) {
    console.error("[PAYSTACK] SemesterPlan not found - ref " + reference + ", semesterPlanId " + semesterPlanId);
    return;
  }

  // Amount + currency verification - AskDerek's authoritative price
  // snapshot (booking.amountPaid, which traces to Step 8's real
  // PaymentStructure resolution at booking-creation time, never
  // request-body-supplied) must match what Paystack actually confirms
  // was paid, in the correct currency, before ANYTHING is processed.
  // A payment provider confirming money was received does not by
  // itself mean this specific booking should be activated for it -
  // AskDerek must independently verify the amount corresponds to the
  // exact financial obligation it created. Rejected before the
  // transaction even starts, so zero mutation is ever attempted.
  const expectedAmountPesewas = Math.round(booking.amountPaid * 100);
  const receivedCurrency = (data.currency as string) || "";

  if (amountPesewas !== expectedAmountPesewas) {
    console.error(
      "[PAYSTACK] AMOUNT MISMATCH - ref " + reference +
      " - expected " + expectedAmountPesewas + " pesewas, received " + amountPesewas + " pesewas"
    );
    await logSystemEvent({
      action:  "HOSTEL_PAYMENT_AMOUNT_MISMATCH",
      target:  "SemesterPlan #" + semesterPlanId,
      details: "ref: " + reference + ". Expected " + expectedAmountPesewas + " pesewas, received " + amountPesewas + " pesewas. Payment rejected - booking not activated.",
    });
    return;
  }

  if (receivedCurrency && receivedCurrency !== "GHS") {
    console.error(
      "[PAYSTACK] CURRENCY MISMATCH - ref " + reference + " - expected GHS, received " + receivedCurrency
    );
    await logSystemEvent({
      action:  "HOSTEL_PAYMENT_CURRENCY_MISMATCH",
      target:  "SemesterPlan #" + semesterPlanId,
      details: "ref: " + reference + ". Expected GHS, received " + receivedCurrency + ". Payment rejected - booking not activated.",
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    let payment;
    try {
      payment = existing
        ? await tx.payment.update({
            where: { id: existing.id },
            data:  { amountPaid: amountGHS, paymentDate: paidAt, paymentStatus: "Paid" },
          })
        : await tx.payment.create({
            data: {
              semesterPlanId,
              amountDue:         amountGHS,
              amountPaid:        amountGHS,
              dueDate:           paidAt,
              paymentDate:       paidAt,
              paymentStatus:     "Paid",
              paystackReference: reference,
            },
          });
    } catch (err: any) {
      if (err.code === "P2002") {
        console.log("[PAYSTACK] Concurrent request already recorded this payment - safely skipped: " + reference);
        throw new Error("Payment already being processed by a concurrent request");
      }
      throw err;
    }

    await tx.transaction.updateMany({
      where: { paystackReference: reference },
      data:  { status: "Success", channel, paidAt, paymentId: payment.id },
    });

    const transaction = await tx.transaction.findFirst({
      where: { paystackReference: reference },
    });

    if (transaction && managerClerkId) {
      const existingCommission = await tx.commission.findUnique({
        where: { transactionId: transaction.id },
      });

      if (!existingCommission) {
        const commission = calculateCommission(amountGHS, getCommissionPercent());
        await tx.commission.create({
          data: {
            transactionId:    transaction.id,
            managerClerkId,
            grossAmount:      amountGHS,
            commissionRate:   getCommissionPercent() / 100,
            commissionAmount: commission.commissionAmount,
            netAmount:        commission.landlordAmount,
          },
        });
      }
    }

    await transitionBooking(tx, {
      bookingId: semesterPlanId,
      toStatus: "ACTIVE",
      actorClerkId: "system",
      actorRole: "SYSTEM",
      reason: "Payment verified via Paystack webhook",
    });

    if (booking.bedId) {
      await tx.bed.update({
        where: { id: booking.bedId },
        data:  { status: "OCCUPIED" },
      });

      await tx.bedStatusHistory.create({
        data: {
          bedId:            booking.bedId,
          bookingId:        booking.id,
          bookingReference: booking.reference,
          oldStatus:        "RESERVED",
          newStatus:        "OCCUPIED",
          action:           "HOSTEL_PAYMENT_CONFIRMED",
          performedBy:      "paystack_webhook",
        },
      });
    }

    try {
      await createReceiptForPayment(payment.id, tx);
    } catch (err) {
      console.error("[PAYSTACK] Hostel receipt creation error:", err);
    }
  }, { timeout: 15000, maxWait: 10000 });

  await logSystemEvent({
    action:  "HOSTEL_PAYMENT_SUCCESS",
    target:  "SemesterPlan #" + semesterPlanId,
    details: "ref: " + reference + ", amount: GHS " + amountGHS + ", channel: " + channel,
  });

  // ── Step 17: PAYMENT_SUCCESSFUL event (additive only — nothing above this is changed) ──
  try {
    await recordEvent({
      eventType:      "PAYMENT_SUCCESSFUL",
      entityType:     "SemesterPlan",
      entityId:       semesterPlanId,
      idempotencyKey: `PAYMENT_SUCCESSFUL:${reference}`,
      payload: {
        userClerkId: booking.studentClerkId,
        bookingId:   semesterPlanId,
        amount:      amountGHS,
        reference,
        actionUrl:   `/tenants/bookings/${semesterPlanId}`,
      },
    });
    void runNotificationProcessorOnce();
  } catch (err) {
    console.error("[PAYSTACK] PAYMENT_SUCCESSFUL event error:", err);
  }
};
const handleChargeFailed = async (data: any): Promise<void> => {
  const reference      = data.reference  as string;
  const amountGHS      = ((data.amount as number) || 0) / 100;
  const metadata       = data.metadata   || {};
  const leaseId        = Number(metadata.leaseId);
  const semesterPlanId = Number(metadata.semesterPlanId);

  console.log(`[PAYSTACK] ❌ charge.failed — ref: ${reference}`);

  await prisma.transaction.updateMany({
    where: { paystackReference: reference },
    data:  { status: "Failed" },
  });

  await logSystemEvent({
    action:  "PAYMENT_FAILED",
    target:  `Ref: ${reference}`,
    details: "charge.failed event received from Paystack",
  });

  // ── Step 17: Hostel detection, mirroring handleChargeSuccess's semesterPlanId branch —
  //     additive only, the Lease path below is completely untouched and unreached when
  //     this fires (early return), exactly as handleChargeSuccess already does for success ──
  if (data.metadata?.semesterPlanId) {
    try {
      const booking = await prisma.semesterPlan.findUnique({ where: { id: semesterPlanId } });
      if (booking) {
        await recordEvent({
          eventType:      "PAYMENT_FAILED",
          entityType:     "SemesterPlan",
          entityId:       semesterPlanId,
          idempotencyKey: `PAYMENT_FAILED:${reference}`,
          payload: {
            userClerkId: booking.studentClerkId,
            bookingId:   semesterPlanId,
            amount:      amountGHS,
            reference,
            actionUrl:   `/tenants/bookings/${semesterPlanId}`,
          },
        });
        void runNotificationProcessorOnce();
      }
    } catch (err) {
      console.error("[PAYSTACK] PAYMENT_FAILED (Hostel) event error:", err);
    }
    return;
  }

  // ── Step 17: RENT_PAYMENT_FAILED event (the sole Lease/Rent payment-failure notification path — the legacy notifyPaymentFailed() call was removed from here after this path was proven with real webhook test evidence) ──
  if (metadata.leaseId) {
    try {
      const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
      if (lease) {
        await recordEvent({
          eventType:      "RENT_PAYMENT_FAILED",
          entityType:     "Lease",
          entityId:       leaseId,
          idempotencyKey: `RENT_PAYMENT_FAILED:${reference}`,
          payload: {
            userClerkId: lease.tenantClerkId,
            leaseId:     leaseId,
            amount:      amountGHS,
            reference,
          },
        });
        void runNotificationProcessorOnce();
      }
    } catch (err) {
      console.error("[PAYSTACK] RENT_PAYMENT_FAILED event error:", err);
    }
  }
};