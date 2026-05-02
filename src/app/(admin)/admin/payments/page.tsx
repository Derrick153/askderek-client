"use client";

import { useState }    from "react";
import {
  useGetAdminAllPaymentsQuery,
  useGetAdminRevenueQuery,
  useGetAdminCommissionSummaryQuery,
  useOverridePaymentStatusMutation,
  useRecordCashPaymentMutation,
}                      from "@/state/api";
import { useUser }     from "@clerk/nextjs";
import PaymentHistoryTable from "@/components/PaymentHistoryTable";
import PaymentLoader       from "@/components/PaymentLoader";
import PaymentStatusBadge  from "@/components/PaymentStatusBadge";
import {
  TrendingUp,
  Banknote,
  Users,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Percent,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface RevenueData {
  totalCommissionEarned:  string | number;
  totalRentProcessed:     string | number;
  totalPaidToLandlords:   string | number;
  totalSuccessPayments:   string | number;
}

interface CommissionData {
  totalGross:          string | number;
  totalCommission:     string | number;
  totalTransactions:   string | number;
  averageCommission:   string | number;
}

interface PaginationData {
  page:        number;
  totalPages:  number;
  total:       number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const PageSkeleton = () => (
  <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
    <Skeleton className="h-8 w-56" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
    <Skeleton className="h-32" />
    <Skeleton className="h-64" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE CARD
// ─────────────────────────────────────────────────────────────────────────────

interface RevenueCardProps {
  icon:       React.ElementType;
  label:      string;
  value:      string | number;
  iconBg:     string;
  iconColor:  string;
  valueCls?:  string;
}

const RevenueCard = ({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
  valueCls = "text-gray-900",
}: RevenueCardProps) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <p className={`text-xl font-bold ${valueCls}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-1">{label}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMMISSION ROW
// ─────────────────────────────────────────────────────────────────────────────

const CommissionRow = ({
  label,
  value,
  valueCls = "text-gray-900",
}: {
  label:     string;
  value:     string | number;
  valueCls?: string;
}) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
    <p className="text-sm text-gray-500">{label}</p>
    <p className={`text-sm font-bold ${valueCls}`}>{value}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// STATUS FILTER BUTTON
// ─────────────────────────────────────────────────────────────────────────────

const FilterButton = ({
  label,
  active,
  onClick,
}: {
  label:   string;
  active:  boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
      active
        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
    }`}
  >
    {label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: "",        label: "All" },
  { value: "Paid",    label: "Paid" },
  { value: "Pending", label: "Pending" },
  { value: "Overdue", label: "Overdue" },
  { value: "Failed",  label: "Failed" },
];

export default function AdminPaymentsPage() {
  const { user }                      = useUser();
  const [page,         setPage]       = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  // ── Queries ──
  const {
    data:      paymentsRaw,
    isLoading: paymentsLoading,
  } = useGetAdminAllPaymentsQuery({
    page,
    status: statusFilter || undefined,
  });

  const {
    data:      revenueRaw,
    isLoading: revenueLoading,
  } = useGetAdminRevenueQuery();

  const {
    data: commissionRaw,
  } = useGetAdminCommissionSummaryQuery();

  // ── Mutations ──
  const [overrideStatus] = useOverridePaymentStatusMutation();
  const [recordCash]     = useRecordCashPaymentMutation();

  // Safe extraction — backend may wrap in different shapes
  const payments:   any[]          = (paymentsRaw as any)?.payments   ?? (paymentsRaw as any)?.data ?? [];
  const pagination: PaginationData = (paymentsRaw as any)?.pagination ?? { page: 1, totalPages: 1, total: 0 };
  const revenue:    RevenueData    = (revenueRaw  as any)?.revenue    ?? (revenueRaw  as any) ?? {} as RevenueData;
  const commission: CommissionData = (commissionRaw as any)?.summary  ?? (commissionRaw as any) ?? {} as CommissionData;

  const isLoading = paymentsLoading || revenueLoading;

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Payment Control Panel
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Platform-wide revenue, commissions, and transaction history
          </p>
        </div>

        {/* ── Revenue Cards ── */}
        {revenue && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <RevenueCard
              icon={Percent}
              label="Commission Earned"
              value={revenue.totalCommissionEarned ?? "—"}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              valueCls="text-emerald-700"
            />
            <RevenueCard
              icon={Banknote}
              label="Rent Processed"
              value={revenue.totalRentProcessed ?? "—"}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <RevenueCard
              icon={Users}
              label="Paid to Landlords"
              value={revenue.totalPaidToLandlords ?? "—"}
              iconBg="bg-orange-50"
              iconColor="text-orange-600"
            />
            <RevenueCard
              icon={CreditCard}
              label="Successful Payments"
              value={revenue.totalSuccessPayments ?? "—"}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
            />
          </div>
        )}

        {/* ── Commission Summary ── */}
        {commission && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-orange-600" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">
                Commission Summary
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Gross</p>
                <p className="text-base font-bold text-gray-900">
                  {commission.totalGross ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Commission</p>
                <p className="text-base font-bold text-emerald-600">
                  {commission.totalCommission ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Transactions</p>
                <p className="text-base font-bold text-gray-900">
                  {commission.totalTransactions ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Avg Commission</p>
                <p className="text-base font-bold text-gray-900">
                  {commission.averageCommission ?? "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-bold text-gray-900">
            All Payments
            {pagination.total > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({pagination.total.toLocaleString()} total)
              </span>
            )}
          </h2>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <FilterButton
                key={f.value}
                label={f.label}
                active={statusFilter === f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
              />
            ))}
          </div>
        </div>

        {/* ── Payments Table ── */}
        {payments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              No payments found
            </h3>
            <p className="text-sm text-gray-500">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} payments found.`
                : "No payments have been recorded yet."}
            </p>
            {statusFilter && (
              <button
                onClick={() => { setStatusFilter(""); setPage(1); }}
                className="mt-4 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors"
              >
                Show all payments
              </button>
            )}
          </div>
        ) : (
          <>
            <PaymentHistoryTable payments={payments} />

            {/* ── Pagination ── */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Page{" "}
                  <span className="font-medium text-gray-900">
                    {pagination.page}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {pagination.totalPages}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) =>
                        Math.min(pagination.totalPages, p + 1)
                      )
                    }
                    disabled={page === pagination.totalPages}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}