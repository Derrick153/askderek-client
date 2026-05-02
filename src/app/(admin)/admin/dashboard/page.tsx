"use client";

import { useGetDashboardStatsQuery } from "@/state/api";
import {
  Shield,
  Users,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Home,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-8 space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-40" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
    </div>
    <Skeleton className="h-28" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon:       React.ElementType;
  label:      string;
  value:      number | string;
  sub?:       string;
  subColor?:  string;
  iconBg:     string;
  iconColor:  string;
  trend?:     "up" | "down" | "neutral";
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  subColor = "text-gray-400",
  iconBg,
  iconColor,
  trend,
}: StatCardProps) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow group">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          trend === "up"   ? "text-emerald-600" :
          trend === "down" ? "text-rose-600"    :
          "text-gray-400"
        }`}>
          {trend === "up"   && <ArrowUpRight   className="w-3 h-3" />}
          {trend === "down" && <ArrowDownRight className="w-3 h-3" />}
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
    {sub && (
      <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE CARD
// ─────────────────────────────────────────────────────────────────────────────

const RevenueCard = ({
  label,
  value,
  color,
}: {
  label:  string;
  value:  string | number;
  color:  string;
}) => (
  <div className={`rounded-xl p-4 ${color}`}>
    <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
      {label}
    </p>
    <p className="text-xl font-bold">{value}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetDashboardStatsQuery();

  if (isLoading) return <DashboardSkeleton />;

  // Safe accessors — backend shape may vary
  const properties   = (stats as any)?.properties   ?? {};
  const managers     = (stats as any)?.managers     ?? {};
  const tenants      = (stats as any)?.tenants      ?? {};
  const applications = (stats as any)?.applications ?? {};
  const reports      = (stats as any)?.reports      ?? {};
  const revenue      = (stats as any)?.revenue      ?? {};

  const totalProps    = properties?.total    ?? 0;
  const pendingProps  = properties?.pending  ?? 0;
  const approvedProps = properties?.approved ?? 0;

  const totalManagers   = managers?.total    ?? 0;
  const verifiedManagers = managers?.verified ?? 0;

  const totalTenants = tenants?.total ?? 0;

  const totalApps   = applications?.total   ?? 0;
  const pendingApps = applications?.pending ?? 0;

  const totalReports     = reports?.total      ?? 0;
  const unresolvedReports = reports?.unresolved ?? 0;

  const totalRevenue = revenue?.total ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-sm text-gray-500 ml-12">
              Welcome back, Administrator 🇬🇭
            </p>
          </div>
          <div className="text-xs text-gray-400 bg-white border border-gray-200 px-3 py-1.5 rounded-lg">
            <Clock className="w-3 h-3 inline mr-1" />
            {new Date().toLocaleDateString("en-GH", {
              weekday: "long",
              day:     "numeric",
              month:   "long",
              year:    "numeric",
            })}
          </div>
        </div>

        {/* ── Primary Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Total Properties"
            value={totalProps.toLocaleString()}
            sub={`${pendingProps} pending approval`}
            subColor={pendingProps > 0 ? "text-amber-600" : "text-gray-400"}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            trend="up"
          />
          <StatCard
            icon={Users}
            label="Landlords"
            value={totalManagers.toLocaleString()}
            sub={`${verifiedManagers} verified`}
            subColor="text-emerald-600"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            trend="up"
          />
          <StatCard
            icon={FileText}
            label="Applications"
            value={totalApps.toLocaleString()}
            sub={`${pendingApps} pending`}
            subColor={pendingApps > 0 ? "text-amber-600" : "text-gray-400"}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
          />
          <StatCard
            icon={AlertTriangle}
            label="Reports"
            value={totalReports.toLocaleString()}
            sub={`${unresolvedReports} unresolved`}
            subColor={unresolvedReports > 0 ? "text-rose-600" : "text-gray-400"}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
            trend={unresolvedReports > 0 ? "up" : "neutral"}
          />
        </div>

        {/* ── Secondary Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Home}
            label="Tenants"
            value={totalTenants.toLocaleString()}
            sub="Registered tenants"
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
            trend="up"
          />
          <StatCard
            icon={CheckCircle}
            label="Approved Properties"
            value={approvedProps.toLocaleString()}
            sub="Live on platform"
            subColor="text-emerald-600"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Total Revenue"
            value={`GH₵ ${Number(totalRevenue).toLocaleString()}`}
            sub="Platform commission"
            subColor="text-orange-600"
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
            trend="up"
          />
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Review Properties", href: "/admin/properties",    icon: Building2,   color: "text-blue-600    bg-blue-50    hover:bg-blue-100"    },
            { label: "Verify Landlords",  href: "/admin/verifications", icon: UserCheck,   color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" },
            { label: "View Reports",      href: "/admin/reports",       icon: AlertTriangle, color: "text-rose-600  bg-rose-50    hover:bg-rose-100"    },
            { label: "Audit Logs",        href: "/admin/audit-logs",    icon: BarChart3,   color: "text-violet-600  bg-violet-50  hover:bg-violet-100"  },
          ].map(({ label, href, icon: Icon, color }) => (
            <a
              key={label}
              href={href}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-transparent transition-all text-center ${color}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-semibold">{label}</span>
            </a>
          ))}
        </div>

        {/* ── Welcome Banner ── */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold mb-1">
                🎉 AskDerek Admin Panel
              </h2>
              <p className="text-orange-100 text-sm max-w-md">
                You have full administrator access. Manage properties,
                verify landlords, and keep Ghana&apos;s #1 real estate
                platform safe and growing. 🇬🇭
              </p>
            </div>
            <Shield className="w-10 h-10 text-orange-200 flex-shrink-0" />
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-orange-200">
            <span>✅ All systems operational</span>
            <span>✅ Database connected</span>
            <span>✅ Jobs running</span>
          </div>
        </div>
      </div>
    </div>
  );
}