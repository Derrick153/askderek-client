import { Request, Response } from "express";
import { prisma }            from "../lib/prisma";
import { formatGHS, generateCashReference } from "../lib/paymentUtils";
import { logSystemEvent }    from "../lib/auditService";
import { recordEvent } from "../lib/notificationEventService";
import { runNotificationProcessorOnce } from "../lib/notificationProcessor";
import { createReceiptForPayment } from "../lib/receiptService";

// ─────────────────────────────────────────────────────────────────────────────
//  adminPaymentControllers.ts
//
//  Full admin visibility and control over all payments.
//  Only accessible by Admin role.
//
//  Functions:
//  - getAllPayments       — paginated list of all payments
//  - getPaymentByRef     — single payment full detail
//  - getPlatformRevenue  — total commission earned
//  - overrideStatus      — manually change payment status
//  - recordCashPayment   — record offline cash payment
//
//  Admin identity for audit logs comes from the verified req.auth
//  (set by authMiddleware/requireAdmin) — never from client-supplied input.
// ─────────────────────────────────────────────────────────────────────────────

// ── GET ALL PAYMENTS ──────────────────────────────────────
export const getAllPayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page   = Number(req.query.page)   || 1;
    const limit  = Number(req.query.limit)  || 20;
    const status = req.query.status as string | undefined;
    const skip   = (page - 1) * limit;

    const where: any = {};
    if (status) where.paymentStatus = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          lease: {
            include: {
              property: { include: { location: true } },
              tenant:   { include: { user: true } },
            },
          },
          transactions: true,
          logs:         true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    res.status(200).json({
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching payments: ${error.message}` });
  }
};

// ── GET SINGLE PAYMENT BY REFERENCE ──────────────────────
export const getPaymentByRef = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { reference } = req.params;

    const payment = await prisma.payment.findFirst({
      where: { paystackReference: reference },
      include: {
        lease: {
          include: {
            property: {
              include: {
                location: true,
                manager: { include: { user: true } },
              },
            },
            tenant: { include: { user: true } },
          },
        },
        transactions: { include: { commission: true } },
        logs:         true,
      },
    });

    if (!payment) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }

    res.status(200).json(payment);
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching payment: ${error.message}` });
  }
};

// ── GET PLATFORM REVENUE ──────────────────────────────────
export const getPlatformRevenue = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const commissions = await prisma.commission.findMany();
    const payments    = await prisma.payment.findMany({
      where: { paymentStatus: "Paid" },
    });

    const totalRevenue    = commissions.reduce((s, c) => s + c.commissionAmount, 0);
    const totalGross      = commissions.reduce((s, c) => s + c.grossAmount,      0);
    const totalNetPaid    = commissions.reduce((s, c) => s + c.netAmount,        0);
    const totalPayments   = payments.length;
    const averagePayment  = totalPayments > 0
      ? totalGross / totalPayments
      : 0;

    res.status(200).json({
      revenue: {
        totalCommissionEarned: formatGHS(totalRevenue),
        totalRentProcessed:    formatGHS(totalGross),
        totalPaidToLandlords:  formatGHS(totalNetPaid),
        totalSuccessPayments:  totalPayments,
        averagePaymentAmount:  formatGHS(averagePayment),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching revenue: ${error.message}` });
  }
};

// ── OVERRIDE PAYMENT STATUS ───────────────────────────────
export const overridePaymentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Identity comes from the verified session — never from req.body.
    // authMiddleware()/requireAdmin already confirmed this user is an
    // active admin before this handler runs.
    const adminClerkId = req.auth?.userId;
    if (!adminClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { reference }        = req.params;
    const { newStatus, reason } = req.body;

    if (!newStatus || !reason) {
      res.status(400).json({
        message: "newStatus and reason are required",
      });
      return;
    }

    const payment = await prisma.payment.findFirst({
      where: { paystackReference: reference },
    });

    if (!payment) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }

    const previousStatus = payment.paymentStatus;

    await prisma.payment.update({
      where: { id: payment.id },
      data:  { paymentStatus: newStatus as any },
    });

    await prisma.paymentLog.create({
      data: {
        paymentId:      payment.id,
        action:         "ADMIN_OVERRIDE",
        previousStatus,
        newStatus,
        performedBy:    adminClerkId,
        notes:          reason,
      },
    });

    await logSystemEvent({
      action:  "ADMIN_OVERRIDE",
      target:  `Payment ref: ${reference}`,
      details: `${previousStatus} → ${newStatus} by ${adminClerkId}. Reason: ${reason}`,
    });

    res.status(200).json({
      message:         "Payment status updated successfully",
      reference,
      previousStatus,
      newStatus,
    });
  } catch (error: any) {
    res.status(500).json({ message: `Error overriding payment: ${error.message}` });
  }
};

// ── RECORD CASH PAYMENT ───────────────────────────────────
export const recordCashPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Identity comes from the verified session — never from req.body.
    const adminClerkId = req.auth?.userId;
    if (!adminClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const {
      leaseId,
      amountPaid,
      dueDate,
      notes,
    } = req.body;

    if (!leaseId || !amountPaid || !dueDate) {
      res.status(400).json({
        message: "leaseId, amountPaid and dueDate are required",
      });
      return;
    }

    const lease = await prisma.lease.findUnique({
      where:   { id: Number(leaseId) },
      include: {
        tenant:   { include: { user: true } },
        property: true,
      },
    });

    if (!lease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }

    const reference = generateCashReference();

    // ── Create payment record ──
    const payment = await prisma.payment.create({
      data: {
        leaseId:           Number(leaseId),
        amountDue:         Number(amountPaid),
        amountPaid:        Number(amountPaid),
        dueDate:           new Date(dueDate),
        paymentDate:       new Date(),
        paymentStatus:     "Paid",
        paystackReference: reference,
      },
    });

    // ── Audit log ──
    await prisma.paymentLog.create({
      data: {
        paymentId:   payment.id,
        action:      "CASH_PAYMENT_RECORDED",
        newStatus:   "Paid",
        performedBy: adminClerkId,
        notes:       notes || "Cash payment recorded by admin",
      },
    });

    await logSystemEvent({
      action:  "CASH_PAYMENT_RECORDED",
      target:  `Lease #${leaseId}`,
      details: `Cash payment of ${formatGHS(Number(amountPaid))} recorded. Ref: ${reference}`,
    });

    // ── Look up admin's display name for the tenant-facing message ──
    const admin = await prisma.user.findUnique({ where: { clerkId: adminClerkId } });
    const recordedByName = admin?.name ?? adminClerkId;

    // ── Step 17: CASH_PAYMENT_RECORDED event — sole notification path now.
    //     The legacy notifyCashPaymentRecorded() call has been removed: this
    //     event path is proven (fires IN_APP + EMAIL + SMS via
    //     NotificationDelivery), and running both caused tenants to receive
    //     duplicate emails and SMS for the same cash payment. ──
    try {
      await recordEvent({
        eventType:      "CASH_PAYMENT_RECORDED",
        entityType:     "Lease",
        entityId:       Number(leaseId),
        idempotencyKey: `CASH_PAYMENT_RECORDED:${payment.id}`,
        payload: {
          userClerkId: lease.tenantClerkId,
          leaseId:     Number(leaseId),
          amount:      Number(amountPaid),
          reference,
          recordedBy:  recordedByName,
        },
      });
      void runNotificationProcessorOnce();
    } catch (err) {
      console.error("[CASH_PAYMENT] CASH_PAYMENT_RECORDED event error:", err);
    }

    // Step 18: create the official Receipt for this payment - additive, never
    // blocks the response if it fails.
    try {
      await createReceiptForPayment(payment.id);
    } catch (err) {
      console.error("[CASH_PAYMENT] Receipt creation error:", err);
    }

    res.status(201).json({
      message:   "Cash payment recorded successfully",
      reference,
      payment,
    });
  } catch (error: any) {
    res.status(500).json({ message: `Error recording cash payment: ${error.message}` });
  }
};