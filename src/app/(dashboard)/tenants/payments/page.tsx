"use client";

import { useEffect, useMemo }        from "react";
import { useRouter }                  from "next/navigation";
import { useUser }                    from "@clerk/nextjs";
import {
  useGetPaymentsByLeaseQuery,
  useGetLeasesQuery,
  useInitializePaymentMutation,
}                                     from "@/state/api";
import PaymentCard                    from "@/components/PaymentCard";
import PaymentSummaryCard             from "@/components/PaymentSummaryCard";
import PaymentHistoryTable            from "@/components/PaymentHistoryTable";
import PaymentLoader                  from "@/components/PaymentLoader";

// ─────────────────────────────────────────────────────────────────────────────
//  /tenants/payments/page.tsx
//  Tenant payment dashboard.
//  Shows summary, active payments and full history.
// ─────────────────────────────────────────────────────────────────────────────

export default function TenantPaymentsPage() {
  const router          = useRouter();
  const { user, isLoaded } = useUser();

  // ── Get active leases ──
  const {
    data:      leases = [],
    isLoading: leasesLoading,
  } = useGetLeasesQuery();

  const activeLeases = leases.filter(
    (l: any) => l.tenantClerkId === user?.id
  );

  const firstLease = activeLeases[0];

  // ── Get payments for first active lease ──
  const {
    data:      payments = [],
    isLoading: paymentsLoading,
  } = useGetPaymentsByLeaseQuery(firstLease?.id, {
    skip: !firstLease?.id,
  });

  const [initializePayment, { isLoading: isInitializing }] =
    useInitializePaymentMutation();

  // ── Summary calculations ──
  const summary = useMemo(() => {
    const paid    = payments.filter((p: any) => p.paymentStatus === "Paid");
    const due     = payments.filter((p: any) => p.paymentStatus === "Pending");
    const overdue = payments.filter((p: any) => p.paymentStatus === "Overdue");

    const totalPaid = paid.reduce(
      (s: number, p: any) => s + p.amountPaid, 0
    );
    const totalDue = [...due, ...overdue].reduce(
      (s: number, p: any) => s + p.amountDue, 0
    );

    const next = [...due, ...overdue].sort(
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

  // ── Handle pay now ──
  const handlePayNow = async (payment: any) => {
    if (!user?.primaryEmailAddress?.emailAddress) return;

    try {
      const result = await initializePayment({
        leaseId: payment.leaseId,
        amount:  payment.amountDue,
        email:   user.primaryEmailAddress.emailAddress,
      }).unwrap();

      if (result?.data?.authorization_url) {
        window.location.href = result.data.authorization_url;
      }
    } catch (err) {
      console.error("Payment initialization failed:", err);
    }
  };

  // ── Handle view receipt ──
  const handleViewReceipt = (reference: string) => {
    router.push(`/payment/receipt/${reference}`);
  };

  if (!isLoaded || leasesLoading || paymentsLoading) {
    return <PaymentLoader message="Loading your payments..." />;
  }

  if (isInitializing) {
    return <PaymentLoader message="Redirecting to Paystack..." />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── Page Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Payments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track and manage your rent payments
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <PaymentSummaryCard
        totalPaid={summary.totalPaid}
        totalDue={summary.totalDue}
        overdueCount={summary.overdueCount}
        nextDueDate={summary.nextDueDate}
        nextDueAmount={summary.nextDueAmount}
      />

      {/* ── Active Payments ── */}
      {activeLeases.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-gray-600 font-medium">No active leases found</p>
          <p className="text-gray-400 text-sm mt-1">
            Your payment dashboard will appear once you have an active lease
          </p>
        </div>
      ) : (
        <>
          {/* ── Pending and Overdue ── */}
          {payments
            .filter((p: any) =>
              ["Pending", "Overdue"].includes(p.paymentStatus)
            )
            .length > 0 && (
            <div className="mb-8">
              <h2 className="text-base font-bold text-gray-900 mb-4">
                Action Required
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {payments
                  .filter((p: any) =>
                    ["Pending", "Overdue"].includes(p.paymentStatus)
                  )
                  .map((payment: any) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                      onPayNow={handlePayNow}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* ── Payment History ── */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4">
              Payment History
            </h2>
            <PaymentHistoryTable
              payments={payments}
              onViewReceipt={handleViewReceipt}
            />
          </div>
        </>
      )}
    </div>
  );
}