import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { logPaymentAction } from "./auditService";

// -----------------------------------------------------------------------------
//  receiptService.ts
//
//  Step 18. Turns a verified, Paid Payment into an official Receipt.
//
//  Called from every place a Payment becomes "Paid":
//    - webhookControllers.handleChargeSuccess       (rent webhook)
//    - webhookControllers.handleHostelChargeSuccess  (hostel webhook)
//    - paymentControllers.verifyPayment            (direct rent verify)
//    - adminPaymentControllers.recordCashPayment     (cash payment)
//    - advancePaymentControllers.splitAdvancePayment (one call per month)
//
//  Idempotent: Receipt.paymentId is unique. Calling this twice for the same
//  payment never creates a second receipt - the second call just returns
//  the first one. Safe to call inside an existing prisma.$transaction (pass
//  the tx client) or standalone (omit the second argument).
//
//  Every snapshot field is read ONCE, here, at creation time, and frozen.
//  Nothing about a receipt is ever recalculated from current pricing or
//  current profile data after this point.
// -----------------------------------------------------------------------------

type Db = PrismaClient | Prisma.TransactionClient;

interface CreateReceiptResult {
  receipt: Prisma.ReceiptGetPayload<{}>;
  created: boolean; // false if a receipt for this payment already existed
}

const pad = (n: number, width: number): string => String(n).padStart(width, "0");

export const createReceiptForPayment = async (
  paymentId: number,
  db: Db = prisma
): Promise<CreateReceiptResult> => {
  // -- Idempotency fast path --
  const existing = await db.receipt.findUnique({ where: { paymentId } });
  if (existing) {
    return { receipt: existing, created: false };
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      lease: {
        include: {
          tenant:   { include: { user: true } },
          property: true,
        },
      },
      semesterPlan: {
        include: {
          property: true,
          bed:      true,
        },
      },
      transactions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!payment) {
    throw new Error(`createReceiptForPayment: Payment #${paymentId} not found`);
  }

  if (payment.paymentStatus !== "Paid") {
    throw new Error(
      `createReceiptForPayment: Payment #${paymentId} is not Paid (status: ${payment.paymentStatus})`
    );
  }

  const latestTransaction = payment.transactions[0];
  const isCash = (payment.paystackReference ?? "").startsWith("CASH-");

  let recipientName:     string;
  let recipientClerkId:  string;
  let managerClerkId:    string | null = null;
  let propertyName:      string;
  let roomNumber:        string | null = null;
  let bedNumber:         string | null = null;
  let semesterName:      string | null = null;
  let bookingReference:  string | null = null;

  if (payment.lease) {
    recipientName    = payment.lease.tenant.user.name;
    recipientClerkId = payment.lease.tenantClerkId;
    managerClerkId   = payment.lease.property.managerClerkId;
    propertyName     = payment.lease.property.name;
  } else if (payment.semesterPlan) {
    const sp = payment.semesterPlan;
    // SemesterPlan only stores studentClerkId - name is looked up separately.
    const student = await db.user.findUnique({ where: { clerkId: sp.studentClerkId } });
    recipientName    = student?.name ?? sp.studentClerkId;
    recipientClerkId = sp.studentClerkId;
    managerClerkId   = sp.property.managerClerkId;
    propertyName     = sp.property.name;
    roomNumber       = sp.roomNumber;
    bedNumber        = sp.bed?.bedNumber ?? null;
    semesterName     = sp.semesterName;
    bookingReference = sp.reference;
  } else {
    throw new Error(
      `createReceiptForPayment: Payment #${paymentId} has neither leaseId nor semesterPlanId`
    );
  }

  const year = (payment.paymentDate ?? new Date()).getFullYear();
  const receiptNumber = `RCT-${year}-${pad(payment.id, 6)}`;

  try {
    const receipt = await db.receipt.create({
      data: {
        receiptNumber,
        paymentId:        payment.id,
        leaseId:          payment.leaseId,
        semesterPlanId:   payment.semesterPlanId,
        amountPaid:       payment.amountPaid,
        currency:         "GHS",
        paymentDate:      payment.paymentDate ?? new Date(),
        paymentMethod:    isCash ? "Cash" : (latestTransaction?.channel ?? "Paystack"),
        paymentReference: payment.paystackReference ?? "",
        recipientName,
        recipientClerkId,
        managerClerkId,
        propertyName,
        roomNumber,
        bedNumber,
        semesterName,
        bookingReference,
      },
    });

    // Step 18 Phase H: audit trail entry. logPaymentAction already catches
    // and logs its own errors internally - it will never throw or block
    // receipt creation.
    await logPaymentAction({
      paymentId:   payment.id,
      action:      "RECEIPT_GENERATED",
      performedBy: "system",
      notes:       `Receipt ${receiptNumber} generated`,
    });

    return { receipt, created: true };
  } catch (err: any) {
    // Race: a concurrent call created it between our check and our write.
    if (err.code === "P2002") {
      const race = await db.receipt.findUnique({ where: { paymentId } });
      if (race) return { receipt: race, created: false };
    }
    throw err;
  }
};
