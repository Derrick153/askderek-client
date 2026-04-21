"use client";

import { useMemo }                    from "react";
import { useRouter }                  from "next/navigation";
import { useUser }                    from "@clerk/nextjs";
import {
  useGetLandlordEarningsQuery,
}                                     from "@/state/api";
import PaymentHistoryTable            from "@/components/PaymentHistoryTable";
import PaymentSummaryCard             from "@/components/PaymentSummaryCard";
import PaymentLoader                  from "@/components/PaymentLoader";

// ─────────────────────────────────────────────────────────────────────────────
//  /managers/payments/page.tsx
//
//  Landlord earnings dashboard.
//  Shows total earned, commission paid, and full payment history
//  across all their properties.
// ─────────────────────────────────────────────────────────────────────────────

export default function ManagerPaymentsPage() {
  const router             = useRouter();
  const { user, isLoaded } = useUser();

  const {
    data:      earningsData,
    isLoading,
    isError,
  } = useGetLandlordEarningsQuery(user?.id ?? "", {
    skip: !user?.id,
  });

  const payments: any[] = earningsData?.payments ?? [];

  // ── Summary ──
  const summary = useMemo(() => {
    const paid = payments.filter(
      (p: any) => p.paymentStatus === "Paid"
    );
    const overdue = payments.filter(
      (p: any) => p.paymentStatus === "Overdue"
    );
    const pending = payments.filter(
      (p: any) => p.paymentStatus === "Pending"
    );

    const totalPaid = paid.reduce(
      (s: number, p: any) => s + (p.amountPaid ?? 0), 0
    );
    const totalDue = [...pending, ...overdue].reduce(
      (s: number, p: any) => s + (p.amountDue ?? 0), 0
    );
    const next = [...pending, ...overdue].sort(
      (a: any, b: any) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )[0];

    return {
      totalPaid,
      totalDue,
      overdueCount:  overdue.length,
      nextDueDate:   next?.dueDate,
      nextDueAmount: next?.amountDue,
    };
  }, [payments]);

  const handleViewReceipt = (reference: string) => {
    router.push(`/payment/receipt/${reference}`);
  };

  if (!isLoaded || isLoading) {
    return <PaymentLoader message="Loading your earnings..." />;
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">❌</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Failed to Load Earnings
          </h2>
          <p className="text-sm text-gray-500">
            Please refresh the page or contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          My Earnings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track rent payments received across all your properties
        </p>
      </div>

      {/* ── Summary ── */}
      <PaymentSummaryCard
        totalPaid={summary.totalPaid}
        totalDue={summary.totalDue}
        overdueCount={summary.overdueCount}
        nextDueDate={summary.nextDueDate}
        nextDueAmount={summary.nextDueAmount}
      />

      {/* ── Commission Info ── */}
      {earningsData?.summary && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
              Platform Commission (5%)
            </p>
            <p className="text-sm text-orange-700 mt-0.5">
              AskDerek deducts 5% from each payment.
              You receive 95% of every rent paid.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-orange-500">Total Commission Paid</p>
            <p className="text-lg font-bold text-orange-700">
              GHS{" "}
              {(summary.totalPaid * 0.05).toLocaleString("en-GH", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      )}

      {/* ── Payment History ── */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-4">
          Payment History
        </h2>
        {payments.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-gray-600 font-medium">
              No payments received yet
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Payments will appear here once tenants pay their rent
            </p>
          </div>
        ) : (
          <PaymentHistoryTable
            payments={payments}
            onViewReceipt={handleViewReceipt}
          />
        )}
      </div>

    </div>
  );
}