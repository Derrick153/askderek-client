import PDFDocument    from "pdfkit";
import { Response }   from "express";

// -----------------------------------------------------------------------------
//  receiptPdf.ts
//
//  Step 18 - Phase G.
//
//  Renders an already-built receipt (the same enriched snapshot object
//  returned by buildReceiptResponse in receiptControllers.ts) as a PDF,
//  streamed directly to the HTTP response. No data fetching here - this
//  is presentation only, on data that has already been authorized.
// -----------------------------------------------------------------------------

interface ReceiptPdfData {
  reference:     string;
  receiptNumber: string;
  property: {
    name:    string;
    address?: string;
    city?:    string;
    region?:  string;
    area?:    string;
  };
  tenant:   { name: string; email: string };
  landlord: { name: string; email: string };
  payment: {
    totalAmount:      string;
    commissionAmount: string;
    commissionRate:   string;
    landlordAmount:   string;
    paymentDate:      Date | string;
    dueDate:          Date | string;
    status:           string;
    method:           string;
  };
  generatedAt: Date | string;
}

const formatGHS = (amount: number | string) =>
  `GHS ${Number(amount).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("en-GB", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });

export const streamReceiptPdf = (data: ReceiptPdfData, res: Response): void => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${data.receiptNumber}.pdf"`);

  doc.pipe(res);

  const divider = () => {
    doc.strokeColor("#E5E7EB").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);
  };

  const row = (label: string, value: string) => {
    doc
      .fillColor("#6B7280").fontSize(10).text(label, 50, doc.y, { continued: true, width: 250 })
      .fillColor("#111827").fontSize(10).text(value, { align: "right" });
    doc.moveDown(0.6);
  };

  // Header
  doc.fillColor("#EA580C").fontSize(22).text("AskDerek");
  doc.fillColor("#6B7280").fontSize(10).text("Ghana's #1 Real Estate Platform").moveDown(0.6);
  doc.fillColor("#059669").fontSize(12).text("PAYMENT RECEIPT");
  doc.fillColor("#9CA3AF").fontSize(9).text(data.receiptNumber).moveDown(1);
  divider();

  // Property
  doc.fillColor("#9CA3AF").fontSize(9).text("PROPERTY").moveDown(0.3);
  doc.fillColor("#111827").fontSize(12).text(data.property.name).moveDown(0.1);
  const addressLine = [data.property.area, data.property.city, data.property.region]
    .filter(Boolean).join(", ");
  if (addressLine) doc.fillColor("#6B7280").fontSize(10).text(addressLine);
  doc.moveDown(1);

  // Tenant / Landlord
  doc.fillColor("#9CA3AF").fontSize(9).text("TENANT").moveDown(0.2);
  doc.fillColor("#111827").fontSize(10).text(data.tenant.name);
  doc.fillColor("#6B7280").fontSize(9).text(data.tenant.email || "-").moveDown(0.8);

  doc.fillColor("#9CA3AF").fontSize(9).text("LANDLORD").moveDown(0.2);
  doc.fillColor("#111827").fontSize(10).text(data.landlord.name);
  doc.fillColor("#6B7280").fontSize(9).text(data.landlord.email || "-").moveDown(1);
  divider();

  // Breakdown
  doc.fillColor("#9CA3AF").fontSize(9).text("PAYMENT BREAKDOWN").moveDown(0.5);
  row("Total Amount", formatGHS(data.payment.totalAmount));
  row(`Platform Fee (${data.payment.commissionRate})`, formatGHS(data.payment.commissionAmount));
  row("Landlord Receives", formatGHS(data.payment.landlordAmount));
  doc.moveDown(0.5);
  divider();

  // Details
  row("Payment Date", formatDate(data.payment.paymentDate));
  row("Due Date", formatDate(data.payment.dueDate));
  row("Method", data.payment.method);
  row("Status", data.payment.status);
  row("Reference", data.reference);
  doc.moveDown(1);
  divider();

  // Footer
  doc
    .fillColor("#9CA3AF").fontSize(8)
    .text(`Verify this receipt at askderek.com/verify/${data.reference}`, { align: "center" })
    .moveDown(0.2)
    .text(`Generated ${formatDate(data.generatedAt)}`, { align: "center" });

  doc.end();
};
