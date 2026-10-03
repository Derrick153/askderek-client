"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  ReceiptCard.tsx
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  receipt: {
    reference: string;
    receiptNumber: string;
    property: {
      name: string;
      address: string;
      city: string;
      region: string;
      area?: string;
    };
    tenant: {
      name: string;
      email: string;
    };
    landlord: {
      name: string;
      email: string;
    };
    payment: {
      totalAmount: string;
      commissionAmount: string;
      commissionRate: string;
      landlordAmount: string;
      paymentDate: string;
      dueDate: string;
      status: string;
      method: string;
    };
    shareLinks: {
      whatsapp: string;
      receiptUrl: string;
    };
    generatedAt: string;
  };
}

export default function ReceiptCard({ receipt }: Props) {
  const handlePrint = () => window.print();

  // ── Helpers ──
  const formatCurrency = (amount: string) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(Number(amount));

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="print-area bg-white rounded-2xl border border-gray-200 shadow-lg max-w-lg mx-auto overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-orange-500 px-6 py-5 text-white">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">AskDerek</h2>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-semibold">
            ✅ Payment Receipt
          </span>
        </div>
        <p className="text-orange-100 text-xs">
          {receipt.receiptNumber}
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">

        {/* ── Property ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Property
          </p>
          <p className="font-semibold text-gray-900">
            {receipt.property.name}
          </p>
          <p className="text-sm text-gray-500">
            {receipt.property.area ? `${receipt.property.area}, ` : ""}
            {receipt.property.city}, {receipt.property.region}
          </p>
        </div>

        <hr className="border-gray-100" />

        {/* ── Tenant and Landlord ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Tenant
            </p>
            <p className="text-sm font-medium text-gray-900">
              {receipt.tenant.name}
            </p>
            <p className="text-xs text-gray-500">
              {receipt.tenant.email}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Landlord
            </p>
            <p className="text-sm font-medium text-gray-900">
              {receipt.landlord.name}
            </p>
            <p className="text-xs text-gray-500">
              {receipt.landlord.email}
            </p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ── Payment Breakdown ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Payment Breakdown
          </p>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Amount</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(receipt.payment.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Platform Fee ({receipt.payment.commissionRate})
              </span>
              <span className="text-gray-600">
                {formatCurrency(receipt.payment.commissionAmount)}
              </span>
            </div>

            <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
              <span className="text-gray-500">Landlord Receives</span>
              <span className="font-bold text-green-600">
                {formatCurrency(receipt.payment.landlordAmount)}
              </span>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ── Payment Details ── */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Payment Date</p>
            <p className="font-medium text-gray-900">
              {formatDate(receipt.payment.paymentDate)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">Due Date</p>
            <p className="font-medium text-gray-900">
              {formatDate(receipt.payment.dueDate)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">Method</p>
            <p className="font-medium text-gray-900">
              {receipt.payment.method}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">Reference</p>
            <p className="font-mono text-xs text-gray-600 truncate">
              {receipt.reference}
            </p>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-2">
          <a
            href={receipt.shareLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl text-center transition-colors"
          >
            Share on WhatsApp
          </a>

          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            Print Receipt
          </button>
        </div>

      </div>

      {/* ── Print Styles ── */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}