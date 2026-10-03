import { Request, Response } from "express";
import { prisma }            from "../lib/prisma";
import { streamReceiptPdf }  from "../lib/receiptPdf";

// -----------------------------------------------------------------------------
//  receiptControllers.ts
//
//  Step 18 - Student Receipt Center + Manager Financial Records.
//
//  Every function here reads from the Receipt table - the frozen, historical
//  snapshot taken at the moment a Payment succeeded. Nothing here recalculates
//  amounts, dates, or property names from current data.
//
//  A few fields ARE joined live (current manager contact name/email, the
//  commission breakdown if one exists, the Payment due date, the property's
//  current address for Lease-based receipts). These are display/contact
//  convenience only - never a number that changes what was actually paid or
//  when. The financial facts always come straight off the Receipt row.
//
//  Authorization: identity always comes from the verified req.auth (set by
//  authMiddleware) - never from a client-supplied field. A caller may only see:
//    - their own receipts (recipientClerkId matches),
//    - receipts for a property they manage (managerClerkId matches), or
//    - any receipt, if they are an ADMIN.
// -----------------------------------------------------------------------------

const buildReceiptResponse = async (receipt: {
  paymentId:        number;
  leaseId:          number | null;
  receiptNumber:    string;
  paymentReference: string;
  paymentDate:      Date;
  amountPaid:       number;
  paymentMethod:    string;
  propertyName:     string;
  recipientName:    string;
  recipientClerkId: string;
  managerClerkId:   string;
  generatedAt:      Date;
}) => {
  const [manager, tenantUser, payment, lease] = await Promise.all([
    prisma.user.findUnique({
      where:  { clerkId: receipt.managerClerkId },
      select: { name: true, email: true },
    }),
    prisma.user.findUnique({
      where:  { clerkId: receipt.recipientClerkId },
      select: { email: true },
    }),
    prisma.payment.findUnique({
      where:   { id: receipt.paymentId },
      include: { transactions: { include: { commission: true } } },
    }),
    receipt.leaseId
      ? prisma.lease.findUnique({
          where:   { id: receipt.leaseId },
          include: { property: { include: { location: true } } },
        })
      : Promise.resolve(null),
  ]);

  const commission = payment?.transactions?.[0]?.commission ?? null;
  const location   = lease?.property?.location ?? null;

  return {
    reference:     receipt.paymentReference,
    receiptNumber: receipt.receiptNumber,
    paymentDate:   receipt.paymentDate,
    amountPaid:    receipt.amountPaid,
    paymentStatus: "Paid",
    paymentMethod: receipt.paymentMethod,
    property: {
      name:    receipt.propertyName,
      address: location?.address,
      city:    location?.city,
      region:  location?.region,
      area:    location?.area ?? undefined,
    },
    tenant: {
      name:  receipt.recipientName,
      email: tenantUser?.email ?? "",
    },
    landlord: {
      name:  manager?.name  ?? "AskDerek Landlord",
      email: manager?.email ?? "",
    },
    payment: {
      totalAmount:      String(receipt.amountPaid),
      commissionAmount: String(commission?.commissionAmount ?? 0),
      commissionRate:   `${commission ? (commission.commissionRate * 100).toFixed(0) : 0}%`,
      landlordAmount:   String(commission?.netAmount ?? receipt.amountPaid),
      paymentDate:      receipt.paymentDate,
      dueDate:          payment?.dueDate ?? receipt.paymentDate,
      status:           "Paid",
      method:           receipt.paymentMethod,
    },
    shareLinks: {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(
        `AskDerek Payment Receipt\nReference: ${receipt.paymentReference}\nAmount: GHS ${receipt.amountPaid}\nVerify at: askderek.com/verify/${receipt.paymentReference}`
      )}`,
      receiptUrl: `${process.env.FRONTEND_URL ?? ""}/payment/receipt/${receipt.paymentReference}`,
    },
    generatedAt: receipt.generatedAt,
  };
};

// -- GET A SINGLE RECEIPT BY PAYMENT REFERENCE ------------
export const getReceipt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const callerClerkId = req.auth?.userId;
    if (!callerClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { reference } = req.params;

    const receipt = await prisma.receipt.findFirst({
      where: { paymentReference: reference },
    });

    if (!receipt) {
      res.status(404).json({ message: "Receipt not found" });
      return;
    }

    if (
      callerClerkId !== receipt.recipientClerkId &&
      callerClerkId !== receipt.managerClerkId
    ) {
      const caller = await prisma.user.findUnique({
        where:  { clerkId: callerClerkId },
        select: { role: true },
      });
      if (!caller || caller.role !== "ADMIN") {
        res.status(403).json({ message: "Forbidden" });
        return;
      }
    }

    const data = await buildReceiptResponse(receipt);
    res.status(200).json({ receipt: data });
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching receipt: ${error.message}` });
  }
};

// -- GET ALL RECEIPTS FOR A TENANT -------------------------
export const getTenantReceipts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const callerClerkId = req.auth?.userId;
    if (!callerClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { tenantClerkId } = req.params;

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

    const receipts = await prisma.receipt.findMany({
      where:   { recipientClerkId: tenantClerkId },
      orderBy: { generatedAt: "desc" },
    });

    const data = await Promise.all(receipts.map(buildReceiptResponse));
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching receipts: ${error.message}` });
  }
};

// -- GET ALL RECEIPTS FOR A MANAGER (Phase F) --------------
export const getManagerReceipts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const callerClerkId = req.auth?.userId;
    if (!callerClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { managerClerkId } = req.params;

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

    const receipts = await prisma.receipt.findMany({
      where:   { managerClerkId },
      orderBy: { generatedAt: "desc" },
    });

    const data = await Promise.all(receipts.map(buildReceiptResponse));
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching receipts: ${error.message}` });
  }
};


// -- GET RECEIPT AS A DOWNLOADABLE PDF (Phase G) -----------
export const getReceiptPdf = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const callerClerkId = req.auth?.userId;
    if (!callerClerkId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { reference } = req.params;

    const receipt = await prisma.receipt.findFirst({
      where: { paymentReference: reference },
    });

    if (!receipt) {
      res.status(404).json({ message: "Receipt not found" });
      return;
    }

    if (
      callerClerkId !== receipt.recipientClerkId &&
      callerClerkId !== receipt.managerClerkId
    ) {
      const caller = await prisma.user.findUnique({
        where:  { clerkId: callerClerkId },
        select: { role: true },
      });
      if (!caller || caller.role !== "ADMIN") {
        res.status(403).json({ message: "Forbidden" });
        return;
      }
    }

    const data = await buildReceiptResponse(receipt);
    streamReceiptPdf(data, res);
  } catch (error: any) {
    res.status(500).json({ message: `Error generating receipt PDF: ${error.message}` });
  }
};