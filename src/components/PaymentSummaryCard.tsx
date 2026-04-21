"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentSummaryCard.tsx
//  Shows total paid, total due, and overdue count.
//  Used at top of tenant and landlord payment dashboards.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  totalPaid:     number;
  totalDue:      number;
  overdueCount:  number;
  nextDueDate?:  string;
  nextDueAmount?: number;
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

export default function PaymentSummaryCard({
  totalPaid,
  totalDue,
  overdueCount,
  nextDueDate,
  nextDueAmount,
}: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

      {/* ── Total Paid ── */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
          Total Paid
        </p>
        <p className="text-xl font-bold text-green-700">
          {formatGHS(totalPaid)}
        </p>
      </div>

      {/* ── Total Due ── */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">
          Total Due
        </p>
        <p className="text-xl font-bold text-orange-700">
          {formatGHS(totalDue)}
        </p>
      </div>

      {/* ── Overdue ── */}
      <div
        className={`rounded-xl p-4 border ${
          overdueCount > 0
            ? "bg-red-50 border-red-200"
            : "bg-gray-50 border-gray-200"
        }`}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
            overdueCount > 0 ? "text-red-600" : "text-gray-500"
          }`}
        >
          Overdue
        </p>
        <p
          className={`text-xl font-bold ${
            overdueCount > 0 ? "text-red-700" : "text-gray-400"
          }`}
        >
          {overdueCount} {overdueCount === 1 ? "payment" : "payments"}
        </p>
      </div>

      {/* ── Next Due ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          Next Due
        </p>
        {nextDueDate && nextDueAmount ? (
          <>
            <p className="text-xl font-bold text-blue-700">
              {formatGHS(nextDueAmount)}
            </p>
            <p className="text-xs text-blue-500 mt-0.5">
              {formatDate(nextDueDate)}
            </p>
          </>
        ) : (
          <p className="text-xl font-bold text-gray-400">—</p>
        )}
      </div>

    </div>
  );
}