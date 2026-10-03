"use client";

import PaymentStatusBadge from "./PaymentStatusBadge";

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentHistoryTable.tsx
//  Full payment history table — tenant and manager dashboards.
// ─────────────────────────────────────────────────────────────────────────────

interface Payment {
  id:                 number;
  amountDue:          number;
  amountPaid:         number;
  dueDate:            string;
  paymentDate?:       string | null;
  paymentStatus:      string;
  paystackReference?: string | null;   // ← null safe
  lease?: {
    property?: {
      name:      string;
      location?: { city: string };
    };
  };
}

interface Props {
  payments:       Payment[];
  onViewReceipt?: (reference: string) => void;
}

const formatGHS = (amount: number) =>
  `GHS ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date?: string | null) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GH", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
};

// Safe reference display — never crashes on null
const shortRef = (ref?: string | null) => {
  if (!ref) return "—";
  return ref.length > 20 ? `${ref.slice(0, 20)}...` : ref;
};

export default function PaymentHistoryTable({
  payments,
  onViewReceipt,
}: Props) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        No payment history found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Property</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Due Date</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Amount Due</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Amount Paid</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Paid On</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Reference</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-gray-50 transition-colors">

              {/* Property */}
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">
                  {payment.lease?.property?.name ?? "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {payment.lease?.property?.location?.city ?? ""}
                </p>
              </td>

              {/* Due date */}
              <td className="px-4 py-3 text-gray-600">
                {formatDate(payment.dueDate)}
              </td>

              {/* Amount due */}
              <td className="px-4 py-3 font-semibold text-gray-900">
                {formatGHS(payment.amountDue)}
              </td>

              {/* Amount paid */}
              <td className="px-4 py-3 font-semibold text-emerald-700">
                {payment.amountPaid > 0 ? formatGHS(payment.amountPaid) : "—"}
              </td>

              {/* Status */}
              <td className="px-4 py-3">
                <PaymentStatusBadge status={payment.paymentStatus} />
              </td>

              {/* Paid on */}
              <td className="px-4 py-3 text-gray-600">
                {formatDate(payment.paymentDate)}
              </td>

              {/* Reference — null safe */}
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-gray-400">
                  {shortRef(payment.paystackReference)}
                </span>
              </td>

              {/* Receipt button */}
              <td className="px-4 py-3">
                {payment.paymentStatus === "Paid" &&
                  payment.paystackReference &&
                  onViewReceipt && (
                    <button
                      onClick={() =>
                        onViewReceipt(payment.paystackReference!)
                      }
                      className="text-orange-600 hover:text-orange-700 text-xs font-semibold whitespace-nowrap"
                    >
                      View Receipt
                    </button>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}