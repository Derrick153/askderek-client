import { Request, Response }  from "express";
import { prisma }             from "../lib/prisma";
import {
  paystackInitialize,
  paystackVerify,
  generateReference,
} from "../lib/paystack";
import {
  verifyPaystackSignature,
  calculateCommission,
} from "../lib/paymentUtils";
import {
  notifyPaymentSuccess,
  notifyPaymentFailed,
} from "../lib/notificationService";
import { logSystemEvent } from "../lib/auditService";
import { createReceiptForPayment } from "../lib/receiptService";

// ── COMMISSION RATE ────────────────────────────────────────────────────────────
const getCommissionRate = (): number => {
  const raw = Number(process.env.COMMISSION_PERCENTAGE);
  return Number.isFinite(raw) && raw > 0 ? raw : 5;
};

// ── INITIALIZE PAYMENT ────────────────────────────────────────────────────────

export const initializePayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { leaseId, amount, email } = req.body;
    const callerClerkId = req.auth?.userId;

    if (!callerClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!leaseId || !amount || !email) {
      res.status(400).json({ message: "leaseId, amount, and email are required" });
      return;
    }

    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ message: "amount must be a positive number" });
      return;
    }

    const lease = await prisma.lease.findUnique({
      where:   { id: Number(leaseId) },
      include: { property: true, tenant: true },
    });

    if (!lease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }

    if (lease.tenantClerkId !== callerClerkId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    const reference = generateReference(Number(leaseId));

    const data = await paystackInitialize({
      email,
      amount,
      reference,
      metadata: {
        leaseId:        Number(leaseId),
        propertyId:     lease.propertyId,
        tenantClerkId:  lease.tenantClerkId,
        propertyName:   lease.property?.name          ?? "Property",
        managerClerkId: lease.property?.managerClerkId ?? "",
      },
    });

    // Create pending Transaction record immediately
    await prisma.transaction.create({
      data: {
        paystackReference: reference,
        amount,
        currency:          "GHS",
        status:            "Pending",
        type:              "RentPayment",
        tenantClerkId:     lease.tenantClerkId,
        leaseId:           Number(leaseId),
        metadata:          { leaseId: Number(leaseId), propertyId: lease.propertyId },
      },
    });

    await logSystemEvent({
      action:  "PAYMENT_INITIALIZED",
      target:  `Lease #${leaseId}`,
      details: `ref: ${reference}, amount: GHS ${amount}`,
    });

    res.status(200).json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to initialize payment";
    console.error("❌ Payment initialization error:", message);
    res.status(500).json({ message });
  }
};

// ── VERIFY PAYMENT ────────────────────────────────────────────────────────────

export const verifyPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { reference } = req.params;
    const callerClerkId = req.auth?.userId;

    if (!callerClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!reference) {
      res.status(400).json({ message: "Payment reference is required" });
      return;
    }

    const paystackData = await paystackVerify(reference);

    if (paystackData.status !== "success") {
      await prisma.transaction.updateMany({
        where: { paystackReference: reference },
        data:  { status: "Failed" },
      });
      res.status(400).json({
        success: false,
        message: `Payment status is: ${paystackData.status}`,
      });
      return;
    }

    // Idempotency — skip if already processed
    const existing = await prisma.payment.findFirst({
      where: { paystackReference: reference },
    });

    if (existing) {
      res.status(200).json({
        success: true,
        message: "Payment already recorded",
        data:    paystackData,
      });
      return;
    }

   const { leaseId, managerClerkId } = paystackData.metadata as {
      leaseId:        number;
      managerClerkId: string;
    };

    const lease = await prisma.lease.findUnique({
      where:  { id: Number(leaseId) },
      select: { tenantClerkId: true },
    });

    if (!lease || lease.tenantClerkId !== callerClerkId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const amountGHS = paystackData.amount / 100;

    const payment = await prisma.payment.create({
      data: {
        leaseId:           Number(leaseId),
        amountDue:         amountGHS,
        amountPaid:        amountGHS,
        dueDate:           new Date(),
        paymentDate:       new Date(paystackData.paidAt),
        paymentStatus:     "Paid",
        paystackReference: reference,
      },
    });

    await prisma.transaction.updateMany({
      where: { paystackReference: reference },
      data:  {
        status:    "Success",
        channel:   paystackData.channel,
        paidAt:    new Date(paystackData.paidAt),
        paymentId: payment.id,
      },
    });

    // Commission
    const transaction = await prisma.transaction.findFirst({
      where: { paystackReference: reference },
    });

    if (transaction && managerClerkId) {
      const { commissionAmount, landlordAmount } = calculateCommission(
        amountGHS,
        getCommissionRate()
      );

      await prisma.commission.create({
        data: {
          transactionId:    transaction.id,
          managerClerkId,
          grossAmount:      amountGHS,
          commissionRate:   getCommissionRate() / 100,
          commissionAmount,
          netAmount:        landlordAmount,
        },
      });
    }

    await logSystemEvent({
      action:  "PAYMENT_SUCCESS",
      target:  `Payment #${payment.id}`,
      details: `ref: ${reference}, amount: GHS ${amountGHS}`,
    });

    // Step 18: create the official Receipt for this payment - additive, never
    // blocks the response if it fails.
    try {
      await createReceiptForPayment(payment.id);
    } catch (err) {
      console.error("[PAYMENT_VERIFY] Receipt creation error:", err);
    }

    res.status(200).json({
      success: true,
      message: "Payment verified and recorded",
      payment,
      data:    paystackData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify payment";
    console.error("❌ Payment verification error:", message);
    res.status(500).json({ message });
  }
};

// ── GET PAYMENTS BY LEASE ─────────────────────────────────────────────────────

export const getPaymentsByLease = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { leaseId } = req.params;
    const callerClerkId = req.auth?.userId;

    if (!callerClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const lease = await prisma.lease.findUnique({
      where:  { id: Number(leaseId) },
      include: { property: { select: { managerClerkId: true } } },
    });

    if (!lease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }

    const isTenant  = lease.tenantClerkId === callerClerkId;
    const isManager = lease.property?.managerClerkId === callerClerkId;

    if (!isTenant && !isManager) {
      const caller = await prisma.user.findUnique({
        where:  { clerkId: callerClerkId },
        select: { role: true },
      });
      if (!caller || caller.role !== "ADMIN") {
        res.status(403).json({ message: "Forbidden" });
        return;
      }
    }

    const payments = await prisma.payment.findMany({
      where:   { leaseId: Number(leaseId) },
      orderBy: { dueDate: "desc" },
    });
    res.status(200).json(payments);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch payments";
    res.status(500).json({ message });
  }
};

// ── GET TRANSACTIONS BY TENANT ────────────────────────────────────────────────

export const getTransactionsByTenant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tenantClerkId } = req.params;
    const callerClerkId = req.auth?.userId;

    if (!callerClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (callerClerkId !== tenantClerkId) {
      const caller = await prisma.user.findUnique({
        where:  { clerkId: callerClerkId },
        select: { role: true },
      });
      if (!caller || caller.role !== "ADMIN") {
        res.status(403).json({ message: "Forbidden" });
        return;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where:   { tenantClerkId },
      include: { lease: { include: { property: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(transactions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch transactions";
    res.status(500).json({ message });
  }
};

// ── GET EARNINGS BY MANAGER ───────────────────────────────────────────────────

export const getEarningsByManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { managerClerkId } = req.params;
    const callerClerkId = req.auth?.userId;

    if (!callerClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (callerClerkId !== managerClerkId) {
      const caller = await prisma.user.findUnique({
        where:  { clerkId: callerClerkId },
        select: { role: true },
      });
      if (!caller || caller.role !== "ADMIN") {
        res.status(403).json({ message: "Forbidden" });
        return;
      }
    }

    // Real payments across this manager's Lease-based properties - not
    // just the ones that happen to have a Commission record. This is what
    // actually powers the Payment History table and the stat cards.
    // (Hostel SemesterPlan payments aren't included yet - SemesterPlan
    // doesn't carry a direct property link the same way Lease does.)
    const payments = await prisma.payment.findMany({
      where: { lease: { property: { managerClerkId } } },
      include: {
        lease: {
          include: {
            property: { include: { location: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Commission totals still come from the real Commission ledger -
    // that is the actual money-movement record, and correctly shows
    // zero commission on payments (like cash) where none was charged.
    // Phase 15: the database adds the totals up and sends one small answer, instead of sending
    // every commission row to this server to be added here.
    const commissionTotals = await prisma.commission.aggregate({
      where: { managerClerkId },
      _sum: { grossAmount: true, commissionAmount: true, netAmount: true },
      _count: { _all: true },
    });

    const totalGross      = Math.round((commissionTotals._sum.grossAmount      ?? 0) * 100) / 100;
    const totalCommission = Math.round((commissionTotals._sum.commissionAmount ?? 0) * 100) / 100;
    const totalNet        = Math.round((commissionTotals._sum.netAmount        ?? 0) * 100) / 100;

    res.status(200).json({
      payments,
      summary: {
        totalGross,
        totalCommission,
        totalNet,
        totalTransactions: commissionTotals._count._all,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch earnings";
    res.status(500).json({ message });
  }
};

// ── GET PAYMENT STATUS ────────────────────────────────────────────────────────

export const getPaymentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { reference } = req.params;
    const callerClerkId = req.auth?.userId;

    if (!callerClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const payment = await prisma.payment.findFirst({
      where: { paystackReference: reference },
      include: { lease: { include: { property: { select: { managerClerkId: true } } } } },
    });

    if (!payment) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }

    const isTenant  = payment.lease?.tenantClerkId === callerClerkId;
    const isManager = payment.lease?.property?.managerClerkId === callerClerkId;

    if (!isTenant && !isManager) {
      const caller = await prisma.user.findUnique({
        where:  { clerkId: callerClerkId },
        select: { role: true },
      });
      if (!caller || caller.role !== "ADMIN") {
        res.status(403).json({ message: "Forbidden" });
        return;
      }
    }

    res.status(200).json({ status: payment.paymentStatus, payment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch payment status";
    res.status(500).json({ message });
  }
};