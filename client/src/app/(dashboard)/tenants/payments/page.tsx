"use client";

import { useMemo }       from "react";
import { useRouter }     from "next/navigation";
import { useUser }       from "@clerk/nextjs";
import {
  useGetPaymentsByLeaseQuery,
  useGetLeasesQuery,
  useInitializePaymentMutation,
} from "@/state/api";
import PaymentCard         from "@/components/PaymentCard";
import PaymentSummaryCard  from "@/components/PaymentSummaryCard";
import PaymentHistoryTable from "@/components/PaymentHistoryTable";
import PaymentLoader       from "@/components/PaymentLoader";
import {
  Home,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  CreditCard,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Local payment shape — avoids fighting prismaTypes vs api.txt type mismatch.
 * paymentDate is string | null | undefined in the DB — we handle all 3 here.
 */
interface TenantPayment {
  id:              number;
  leaseId:         number;
  paymentStatus?:  string;
  amountPaid?:     number;
  amountDue?:      number;
  dueDate?:        string;
  paymentDate?:    string | null;
  reference?:      string;
  [key: string]:   unknown;
}

interface TenantLease {
  id:             number;
  tenantClerkId?: string;
  [key: string]:  unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const PageSkeleton = () => (
  <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-56" />
    </div>
    <Skeleton className="h-32" />
    <div className="space-y-2">
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
    <Skeleton className="h-64" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATES
// ─────────────────────────────────────────────────────────────────────────────

const NoLeaseState = () => (
  <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Home className="w-7 h-7 text-gray-400" />
    </div>
    <h3 className="text-base font-bold text-gray-900 mb-1">
      No active lease
    </h3>
    <p className="text-sm text-gray-500 max-w-xs mx-auto">
      Your payment dashboard will appear once you have an active lease on AskDerek.
    </p>
  </div>
);

const NoPaymentsState = () => (
  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <CreditCard className="w-7 h-7 text-gray-400" />
    </div>
    <h3 className="text-base font-bold text-gray-900 mb-1">
      No payments yet
    </h3>
    <p className="text-sm text-gray-500">
      Your payment history will appear here.
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT STATUS SUMMARY BAR
// ─────────────────────────────────────────────────────────────────────────────

interface StatusBarProps {
  paidCount:    number;
  pendingCount: number;
  overdueCount: number;
  totalCount:   number;
}

const StatusBar = ({
  paidCount,
  pendingCount,
  overdueCount,
  totalCount,
}: StatusBarProps) => {
  if (totalCount === 0) return null;
  const paidPct    = (paidCount    / totalCount) * 100;
  const pendingPct = (pendingCount / totalCount) * 100;
  const overduePct = (overdueCount / totalCount) * 100;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900">Payment Progress</p>
        <p className="text-xs text-gray-400">{totalCount} total payments</p>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
        {paidPct > 0 && (
          <div
            className="h-full bg-emerald-500 rounded-l-full transition-all"
            style={{ width: `${paidPct}%` }}
          />
        )}
        {pendingPct > 0 && (
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${pendingPct}%` }}
          />
        )}
        {overduePct > 0 && (
          <div
            className="h-full bg-rose-500 rounded-r-full transition-all"
            style={{ width: `${overduePct}%` }}
          />
        )}
      </div>
      <div className="flex items-center gap-4 mt-3">
        {paidCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            {paidCount} paid
          </div>
        )}
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {pendingCount} pending
          </div>
        )}
        {overdueCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            {overdueCount} overdue
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function TenantPaymentsPage() {
  const router             = useRouter();
  const { user, isLoaded } = useUser();

  // ── Leases ──
  const {
    data:      leasesRaw = [],
    isLoading: leasesLoading,
  } = useGetLeasesQuery();

  // Safe cast — leases can be array or wrapped response
  const leases: TenantLease[] = useMemo(() => {
    if (Array.isArray(leasesRaw)) return leasesRaw as unknown as TenantLease[];
    if (Array.isArray((leasesRaw as any).data)) return (leasesRaw as any).data as TenantLease[];
    return [];
  }, [leasesRaw]);

  const activeLeases = useMemo(
    () => leases.filter((l) => l.tenantClerkId === user?.id),
    [leases, user?.id]
  );

  const firstLease = activeLeases[0];

  // ── Payments for first lease ──
  const {
    data:      paymentsRaw,
    isLoading: paymentsLoading,
    refetch,
  } = useGetPaymentsByLeaseQuery(firstLease?.id, {
    skip: !firstLease?.id,
  });

  // Safe cast — avoids prismaTypes null vs api.txt undefined mismatch
  const payments: TenantPayment[] = useMemo(() => {
    if (!paymentsRaw) return [];
    if (Array.isArray(paymentsRaw)) return paymentsRaw as TenantPayment[];
    if (Array.isArray((paymentsRaw as any).data))
      return (paymentsRaw as any).data as TenantPayment[];
    return [];
  }, [paymentsRaw]);

  // ── Payment mutation ──
  const [initializePayment, { isLoading: isInitializing }] =
    useInitializePaymentMutation();

  // ── Derived metrics ──
  const metrics = useMemo(() => {
    const paid    = payments.filter((p) => p.paymentStatus === "Paid");
    const pending = payments.filter((p) => p.paymentStatus === "Pending");
    const overdue = payments.filter((p) => p.paymentStatus === "Overdue");

    const totalPaid = paid.reduce((s, p) => s + (p.amountPaid ?? 0), 0);
    const totalDue  = [...pending, ...overdue].reduce(
      (s, p) => s + (p.amountDue ?? 0), 0
    );

    const nextPayment = [...pending, ...overdue].sort(
      (a, b) =>
        new Date(a.dueDate ?? 0).getTime() -
        new Date(b.dueDate ?? 0).getTime()
    )[0];

    return {
      totalPaid,
      totalDue,
      paidCount:     paid.length,
      pendingCount:  pending.length,
      overdueCount:  overdue.length,
      nextDueDate:   nextPayment?.dueDate,
      nextDueAmount: nextPayment?.amountDue,
    };
  }, [payments]);

  // ── Payments requiring action ──
  const actionPayments = useMemo(
    () =>
      payments.filter((p) =>
        p.paymentStatus === "Pending" || p.paymentStatus === "Overdue"
      ),
    [payments]
  );

  // ── Handlers ──
  const handlePayNow = async (payment: TenantPayment) => {
    if (!user?.primaryEmailAddress?.emailAddress) return;
    try {
      const result = await initializePayment({
        leaseId: payment.leaseId,
        amount:  payment.amountDue ?? 0,
        email:   user.primaryEmailAddress.emailAddress,
      }).unwrap();

      if (result?.data?.authorization_url) {
        window.location.href = result.data.authorization_url;
      }
    } catch (err) {
      console.error("Payment initialization failed:", err);
    }
  };

  const handleViewReceipt = (reference: string) =>
    router.push(`/payment/receipt/${reference}`);

  // ── Loading states ──
  if (!isLoaded || leasesLoading || paymentsLoading) {
    return <PageSkeleton />;
  }

  if (isInitializing) {
    return <PaymentLoader message="Redirecting to Paystack..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Payments</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track and manage your rent payments
            </p>
          </div>
          {firstLease && (
            <button
              onClick={() => refetch()}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Refresh payments"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* ── No Lease State ── */}
        {activeLeases.length === 0 ? (
          <NoLeaseState />
        ) : (
          <>
            {/* ── Summary ── */}
            <PaymentSummaryCard
              totalPaid={metrics.totalPaid}
              totalDue={metrics.totalDue}
              overdueCount={metrics.overdueCount}
              nextDueDate={metrics.nextDueDate}
              nextDueAmount={metrics.nextDueAmount}
            />

            {/* ── Progress Bar ── */}
            {payments.length > 0 && (
              <StatusBar
                paidCount={metrics.paidCount}
                pendingCount={metrics.pendingCount}
                overdueCount={metrics.overdueCount}
                totalCount={payments.length}
              />
            )}

            {/* ── Overdue Alert ── */}
            {metrics.overdueCount > 0 && (
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-4">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-rose-800">
                    {metrics.overdueCount} overdue{" "}
                    {metrics.overdueCount === 1 ? "payment" : "payments"}
                  </p>
                  <p className="text-xs text-rose-600 mt-0.5">
                    Pay now to avoid penalties and protect your tenancy record.
                  </p>
                </div>
              </div>
            )}

            {/* ── Action Required ── */}
            {actionPayments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-base font-bold text-gray-900">
                    Action Required
                  </h2>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs font-semibold rounded-full">
                    {actionPayments.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {actionPayments.map((payment) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment as any}
                      onPayNow={handlePayNow}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Payment History ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">
                  Payment History
                  {payments.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      ({payments.length} total)
                    </span>
                  )}
                </h2>
                {metrics.paidCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {metrics.paidCount} paid
                  </div>
                )}
              </div>

              {payments.length === 0 ? (
                <NoPaymentsState />
              ) : (
                <PaymentHistoryTable
                  payments={payments as any}
                  onViewReceipt={handleViewReceipt}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}