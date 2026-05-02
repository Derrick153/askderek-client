"use client";

import { useMemo }     from "react";
import { useRouter }   from "next/navigation";
import { useUser }     from "@clerk/nextjs";
import {
  useGetLandlordEarningsQuery,
} from "@/state/api";
import PaymentHistoryTable from "@/components/PaymentHistoryTable";
import PaymentSummaryCard  from "@/components/PaymentSummaryCard";
import PaymentLoader       from "@/components/PaymentLoader";
import {
  TrendingUp,
  Banknote,
  AlertCircle,
  CheckCircle,
  Percent,
  RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface EarningsPayment {
  paymentStatus?: string;
  amountPaid?:    number;
  amountDue?:     number;
  dueDate?:       string;
  reference?:     string;
  [key: string]:  unknown;
}

interface EarningsSummary {
  totalCommission?: number | string;
  totalEarned?:     number | string;
  [key: string]:    unknown;
}

/**
 * Safely extract payments array from any backend response shape.
 * Backend may return { payments: [] } or { data: [] } or a flat array.
 */
function extractPayments(raw: unknown): EarningsPayment[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.payments)) return r.payments as EarningsPayment[];
  if (Array.isArray(r.data))     return r.data     as EarningsPayment[];
  return [];
}

/**
 * Safely extract summary from any backend response shape.
 */
function extractSummary(raw: unknown): EarningsSummary | null {
  if (!raw) return null;
  const r = raw as Record<string, unknown>;
  if (r.summary && typeof r.summary === "object") return r.summary as EarningsSummary;
  if (r.totalEarned !== undefined) return r as EarningsSummary;
  return null;
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
      <Skeleton className="h-4 w-64" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
    <Skeleton className="h-20" />
    <Skeleton className="h-64" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon:      React.ElementType;
  label:     string;
  value:     string;
  sub?:      string;
  subColor?: string;
  iconBg:    string;
  iconColor: string;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  subColor = "text-gray-400",
  iconBg,
  iconColor,
}: StatCardProps) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
    <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    {sub && <p className={`text-xs mt-0.5 font-medium ${subColor}`}>{sub}</p>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ERROR STATE
// ─────────────────────────────────────────────────────────────────────────────

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="text-center max-w-sm">
      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-rose-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">
        Failed to Load Earnings
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Please check your connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors mx-auto"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

const EmptyPayments = () => (
  <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Banknote className="w-7 h-7 text-gray-400" />
    </div>
    <h3 className="text-base font-bold text-gray-900 mb-1">
      No payments yet
    </h3>
    <p className="text-sm text-gray-500 max-w-xs mx-auto">
      Payments will appear here once tenants pay their rent through AskDerek.
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const formatGHS = (amount: number) =>
  `GHS ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ManagerPaymentsPage() {
  const router             = useRouter();
  const { user, isLoaded } = useUser();

  const {
    data:      earningsRaw,
    isLoading,
    isError,
    refetch,
  } = useGetLandlordEarningsQuery(user?.id ?? "", {
    skip: !user?.id,
  });

  // Safe extraction — handles any backend response shape
  const payments = useMemo(() => extractPayments(earningsRaw), [earningsRaw]);
  const summary  = useMemo(() => extractSummary(earningsRaw),  [earningsRaw]);

  // Derived metrics
  const metrics = useMemo(() => {
    const paid = payments.filter((p) => p.paymentStatus === "Paid");
    const overdue = payments.filter((p) => p.paymentStatus === "Overdue");
    const pending = payments.filter((p) => p.paymentStatus === "Pending");

    const totalPaid = paid.reduce(
      (s, p) => s + (p.amountPaid ?? 0), 0
    );
    const totalDue = [...pending, ...overdue].reduce(
      (s, p) => s + (p.amountDue ?? 0), 0
    );
    const commission    = totalPaid * 0.05;
    const netEarnings   = totalPaid * 0.95;

    const nextPayment = [...pending, ...overdue].sort(
      (a, b) =>
        new Date(a.dueDate ?? 0).getTime() -
        new Date(b.dueDate ?? 0).getTime()
    )[0];

    return {
      totalPaid,
      totalDue,
      commission,
      netEarnings,
      overdueCount:  overdue.length,
      pendingCount:  pending.length,
      nextDueDate:   nextPayment?.dueDate,
      nextDueAmount: nextPayment?.amountDue,
    };
  }, [payments]);

  const handleViewReceipt = (reference: string) =>
    router.push(`/payment/receipt/${reference}`);

  // Loading
  if (!isLoaded || isLoading) return <PageSkeleton />;

  // Error
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Earnings</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track rent payments across all your properties
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            title="Refresh earnings"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Net Earnings (95%)"
            value={formatGHS(metrics.netEarnings)}
            sub="After commission"
            subColor="text-emerald-600"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            icon={Banknote}
            label="Total Received"
            value={formatGHS(metrics.totalPaid)}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            icon={Percent}
            label="Commission Paid (5%)"
            value={formatGHS(metrics.commission)}
            sub="AskDerek fee"
            subColor="text-orange-500"
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
          />
          <StatCard
            icon={AlertCircle}
            label="Outstanding"
            value={formatGHS(metrics.totalDue)}
            sub={metrics.overdueCount > 0
              ? `${metrics.overdueCount} overdue`
              : `${metrics.pendingCount} pending`}
            subColor={metrics.overdueCount > 0 ? "text-rose-600" : "text-amber-600"}
            iconBg={metrics.overdueCount > 0 ? "bg-rose-50" : "bg-amber-50"}
            iconColor={metrics.overdueCount > 0 ? "text-rose-600" : "text-amber-600"}
          />
        </div>

        {/* ── Summary Card ── */}
        <PaymentSummaryCard
          totalPaid={metrics.totalPaid}
          totalDue={metrics.totalDue}
          overdueCount={metrics.overdueCount}
          nextDueDate={metrics.nextDueDate}
          nextDueAmount={metrics.nextDueAmount}
        />

        {/* ── Commission Banner ── */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Percent className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-orange-900">
                  Platform Commission — 5%
                </p>
                <p className="text-xs text-orange-700 mt-0.5">
                  AskDerek deducts 5% from each payment.
                  You keep 95% of every rent received.
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-orange-500 font-medium">Total Commission Paid</p>
              <p className="text-lg font-bold text-orange-700">
                {formatGHS(metrics.commission)}
              </p>
            </div>
          </div>

          {/* Commission breakdown bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-orange-700 mb-1.5">
              <span>Your share (95%)</span>
              <span>Commission (5%)</span>
            </div>
            <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full"
                style={{ width: "95%" }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-orange-600 mt-1">
              <span className="font-bold">{formatGHS(metrics.netEarnings)}</span>
              <span>{formatGHS(metrics.commission)}</span>
            </div>
          </div>
        </div>

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
            {payments.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5" />
                {payments.filter((p) => p.paymentStatus === "Paid").length} paid
              </div>
            )}
          </div>

          {payments.length === 0 ? (
            <EmptyPayments />
          ) : (
            <PaymentHistoryTable
              payments={payments as any}
              onViewReceipt={handleViewReceipt}
            />
          )}
        </div>

      </div>
    </div>
  );
}