"use client";

import PaymentStatusBadge from "./PaymentStatusBadge";

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentCard.tsx
//  Single payment card shown on tenant and landlord dashboards.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  payment: {
    id:                number;
    amountDue:         number;
    amountPaid:        number;
    dueDate:           string;
    paymentDate?:      string;
    paymentStatus:     string;
    paystackReference: string;
    lease?: {
      property?: {
        name:     string;
        location?: {
          city:   string;
          area?:  string;
        };
      };
    };
  };
  onPayNow?:     (payment: any) => void;
  onViewReceipt?: (reference: string) => void;
}

const formatGHS = (amount: number) =>
  `GHS ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-GH", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });

export default function PaymentCard({
  payment,
  onPayNow,
  onViewReceipt,
}: Props) {
  const property = payment.lease?.property;
  const location = property?.location;
  const isPaid   = payment.paymentStatus === "Paid";
  const isOverdue = payment.paymentStatus === "Overdue";

  return (
    <div
      className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow ${
        isOverdue ? "border-red-200" : "border-gray-200"
      }`}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm">
            {property?.name ?? "Property"}
          </p>
          {location && (
            <p className="text-xs text-gray-500 mt-0.5">
              {location.area ? `${location.area}, ` : ""}
              {location.city}
            </p>
          )}
        </div>
        <PaymentStatusBadge status={payment.paymentStatus} />
      </div>

      {/* ── Amount ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500">Amount Due</p>
          <p className="text-lg font-bold text-gray-900">
            {formatGHS(payment.amountDue)}
          </p>
        </div>
        {isPaid && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Amount Paid</p>
            <p className="text-lg font-bold text-green-600">
              {formatGHS(payment.amountPaid)}
            </p>
          </div>
        )}
      </div>

      {/* ── Dates ── */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>Due: {formatDate(payment.dueDate)}</span>
        {payment.paymentDate && (
          <span>Paid: {formatDate(payment.paymentDate)}</span>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-2">
        {!isPaid && onPayNow && (
          <button
            onClick={() => onPayNow(payment)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold text-white transition-colors ${
              isOverdue
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {isOverdue ? "Pay Now — Overdue" : "Pay Rent"}
          </button>
        )}
        {isPaid && onViewReceipt && (
          <button
            onClick={() => onViewReceipt(payment.paystackReference)}
            className="flex-1 py-2 px-4 rounded-lg text-sm font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 transition-colors"
          >
            View Receipt
          </button>
        )}
      </div>
    </div>
  );
}