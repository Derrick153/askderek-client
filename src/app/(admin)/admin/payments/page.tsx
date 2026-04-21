"use client";

import { useState }                   from "react";
import {
  useGetAdminAllPaymentsQuery,
  useGetAdminRevenueQuery,
  useGetAdminCommissionSummaryQuery,
  useOverridePaymentStatusMutation,
  useRecordCashPaymentMutation,
}                                     from "@/state/api";
import { useUser }                    from "@clerk/nextjs";
import PaymentHistoryTable            from "@/components/PaymentHistoryTable";
import PaymentLoader                  from "@/components/PaymentLoader";
import PaymentStatusBadge             from "@/components/PaymentStatusBadge";

// ─────────────────────────────────────────────────────────────────────────────
//  /admin/payments/page.tsx
//
//  Admin payment control panel.
//  Shows platform revenue, all transactions,
//  commission summary and override controls.
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const { user }                    = useUser();
  const [page, setPage]             = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  // ── Data ──
  const {
    data:      paymentsData,
    isLoading: paymentsLoading,
  } = useGetAdminAllPaymentsQuery({
    page,
    status: statusFilter || undefined,
  });

  const {
    data:      revenueData,
    isLoading: revenueLoading,
  } = useGetAdminRevenueQuery();

  const {
    data: commissionData,
  } = useGetAdminCommissionSummaryQuery();

  const [overrideStatus] = useOverridePaymentStatusMutation();
  const [recordCash]     = useRecordCashPaymentMutation();

  const payments   = paymentsData?.payments   ?? [];
  const pagination = paymentsData?.pagination ?? {};
  const revenue    = revenueData?.revenue;
  const commission = commissionData?.summary;

  // ── Status filter options ──
  const statusOptions = [
    { value: "",             label: "All Payments" },
    { value: "Paid",         label: "Paid" },
    { value: "Pending",      label: "Pending" },
    { value: "Overdue",      label: "Overdue" },
    { value: "Failed",       label: "Failed" },
  ];

  if (paymentsLoading || revenueLoading) {
    return <PaymentLoader message="Loading payment data..." />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Payment Control Panel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Full visibility and control over all platform payments
        </p>
      </div>

      {/* ── Revenue Cards ── */}
      {revenue && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
              Commission Earned
            </p>
            <p className="text-xl font-bold text-green-700">
              {revenue.totalCommissionEarned}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
              Total Rent Processed
            </p>
            <p className="text-xl font-bold text-blue-700">
              {revenue.totalRentProcessed}
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">
              Paid to Landlords
            </p>
            <p className="text-xl font-bold text-orange-700">
              {revenue.totalPaidToLandlords}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Total Payments
            </p>
            <p className="text-xl font-bold text-gray-700">
              {revenue.totalSuccessPayments}
            </p>
          </div>
        </div>
      )}

      {/* ── Commission Summary ── */}
      {commission && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-bold text-gray-900 mb-4">
            Commission Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Total Gross</p>
              <p className="font-bold text-gray-900">
                {commission.totalGross}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Commission</p>
              <p className="font-bold text-green-600">
                {commission.totalCommission}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Transactions</p>
              <p className="font-bold text-gray-900">
                {commission.totalTransactions}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Average Commission</p>
              <p className="font-bold text-gray-900">
                {commission.averageCommission}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h2 className="text-base font-bold text-gray-900">
          All Payments
        </h2>
        <div className="flex gap-2 ml-auto flex-wrap">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                statusFilter === opt.value
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Payments Table ── */}
      {payments.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-gray-600 font-medium">No payments found</p>
        </div>
      ) : (
        <>
          <PaymentHistoryTable payments={payments} />

          {/* ── Pagination ── */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages} —{" "}
                {pagination.total} total payments
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.min(pagination.totalPages, p + 1)
                    )
                  }
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}