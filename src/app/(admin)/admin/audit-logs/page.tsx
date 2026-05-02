"use client";

import { useGetAuditLogsQuery } from "@/state/api";
import {
  Search,
  Download,
  Clock,
  Activity,
  Database,
  Users,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Upload,
  LogIn,
  LogOut,
  LayoutList,
} from "lucide-react";
import { useState, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AuditLog {
  id:        number;
  action:    string;
  target:    string;
  details?:  string;
  createdAt: string;
  admin?: {
    id:    number;
    name:  string;
    email: string;
  };
}

interface ActionMeta {
  icon:  React.ElementType;
  color: string;
  bg:    string;
  ring:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, ActionMeta> = {
  CREATE:               { icon: Plus,        color: "text-emerald-700", bg: "bg-emerald-50",  ring: "ring-emerald-200" },
  UPDATE:               { icon: Edit,        color: "text-blue-700",    bg: "bg-blue-50",     ring: "ring-blue-200"    },
  DELETE:               { icon: Trash2,      color: "text-rose-700",    bg: "bg-rose-50",     ring: "ring-rose-200"    },
  APPROVE:              { icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50",  ring: "ring-emerald-200" },
  APPROVE_PROPERTY:     { icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50",  ring: "ring-emerald-200" },
  APPROVE_VERIFICATION: { icon: UserCheck,   color: "text-emerald-700", bg: "bg-emerald-50",  ring: "ring-emerald-200" },
  REJECT:               { icon: XCircle,     color: "text-rose-700",    bg: "bg-rose-50",     ring: "ring-rose-200"    },
  REJECT_PROPERTY:      { icon: XCircle,     color: "text-rose-700",    bg: "bg-rose-50",     ring: "ring-rose-200"    },
  REJECT_VERIFICATION:  { icon: XCircle,     color: "text-rose-700",    bg: "bg-rose-50",     ring: "ring-rose-200"    },
  LOGIN:                { icon: LogIn,       color: "text-violet-700",  bg: "bg-violet-50",   ring: "ring-violet-200"  },
  LOGOUT:               { icon: LogOut,      color: "text-gray-600",    bg: "bg-gray-100",    ring: "ring-gray-200"    },
  VIEW:                 { icon: Eye,         color: "text-blue-700",    bg: "bg-blue-50",     ring: "ring-blue-200"    },
  EXPORT:               { icon: Download,    color: "text-indigo-700",  bg: "bg-indigo-50",   ring: "ring-indigo-200"  },
  UPLOAD:               { icon: Upload,      color: "text-amber-700",   bg: "bg-amber-50",    ring: "ring-amber-200"   },
  VERIFY:               { icon: UserCheck,   color: "text-emerald-700", bg: "bg-emerald-50",  ring: "ring-emerald-200" },
  BLOCK:                { icon: Lock,        color: "text-rose-700",    bg: "bg-rose-50",     ring: "ring-rose-200"    },
  ADD_BLACKLIST:        { icon: Lock,        color: "text-rose-700",    bg: "bg-rose-50",     ring: "ring-rose-200"    },
  REMOVE_BLACKLIST:     { icon: Unlock,      color: "text-emerald-700", bg: "bg-emerald-50",  ring: "ring-emerald-200" },
  RESOLVE_REPORT:       { icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50",  ring: "ring-emerald-200" },
};

const DEFAULT_ACTION: ActionMeta = {
  icon:  Activity,
  color: "text-gray-600",
  bg:    "bg-gray-100",
  ring:  "ring-gray-200",
};

const getAction = (action: string): ActionMeta =>
  ACTION_CONFIG[action] ?? DEFAULT_ACTION;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GH", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GH", {
    hour:   "2-digit",
    minute: "2-digit",
  });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GH", {
    day:    "numeric",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });

const getInitial = (name?: string) =>
  name?.charAt(0).toUpperCase() ?? "A";

const ITEMS_PER_PAGE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-8 space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-14 rounded-xl" />
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD
// ─────────────────────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon:    React.ElementType;
  label:   string;
  value:   string | number;
  meta?:   string;
  iconBg:  string;
  iconColor: string;
}

const MetricCard = ({
  icon: Icon,
  label,
  value,
  meta,
  iconBg,
  iconColor,
}: MetricCardProps) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
    <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
    {meta && <p className="text-xs text-gray-400 mt-0.5">{meta}</p>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ACTION BADGE
// ─────────────────────────────────────────────────────────────────────────────

const ActionBadge = ({ action }: { action: string }) => {
  const meta    = getAction(action);
  const Icon    = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ${meta.ring} ${meta.bg} ${meta.color}`}>
      <Icon className="w-3 h-3" />
      {action.replace(/_/g, " ")}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN AVATAR
// ─────────────────────────────────────────────────────────────────────────────

const AdminAvatar = ({ name }: { name?: string }) => (
  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
    {getInitial(name)}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TABLE VIEW
// ─────────────────────────────────────────────────────────────────────────────

const TableView = ({ logs }: { logs: AuditLog[] }) => (
  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["Admin", "Action", "Target", "Details", "Time"].map((h) => (
              <th
                key={h}
                className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {logs.map((log, i) => (
            <tr
              key={log.id ?? i}
              className="hover:bg-gray-50/80 transition-colors group"
            >
              {/* Admin */}
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <AdminAvatar name={log.admin?.name} />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {log.admin?.name ?? "System"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {log.admin?.email ?? "—"}
                    </p>
                  </div>
                </div>
              </td>

              {/* Action */}
              <td className="px-5 py-4">
                <ActionBadge action={log.action} />
              </td>

              {/* Target */}
              <td className="px-5 py-4">
                <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                  {log.target}
                </span>
              </td>

              {/* Details */}
              <td className="px-5 py-4 max-w-xs">
                <p className="text-gray-500 text-sm truncate">
                  {log.details ?? "—"}
                </p>
              </td>

              {/* Time */}
              <td className="px-5 py-4">
                <div className="flex items-center gap-1.5 text-gray-400 text-xs whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(log.createdAt)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE VIEW
// ─────────────────────────────────────────────────────────────────────────────

const TimelineView = ({ logs }: { logs: AuditLog[] }) => {
  const grouped = useMemo(() => {
    return logs.reduce<Record<string, AuditLog[]>>((acc, log) => {
      const key = formatDate(log.createdAt);
      if (!acc[key]) acc[key] = [];
      acc[key].push(log);
      return acc;
    }, {});
  }, [logs]);

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([date, dayLogs]) => (
        <div key={date}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {date}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Logs for this day */}
          <div className="space-y-3">
            {dayLogs.map((log, i) => {
              const meta = getAction(log.action);
              const Icon = meta.icon;
              return (
                <div
                  key={log.id ?? i}
                  className="flex gap-4 group"
                >
                  {/* Icon */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-xl ring-1 ${meta.ring} ${meta.bg} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    {i < dayLogs.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <AdminAvatar name={log.admin?.name} />
                            <span className="font-semibold text-gray-900 text-sm">
                              {log.admin?.name ?? "System"}
                            </span>
                            <ActionBadge action={log.action} />
                            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {log.target}
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-sm text-gray-500 mt-1 ml-10">
                              {log.details}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          {formatTime(log.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage:  number;
  totalPages:   number;
  totalItems:   number;
  onPrev:       () => void;
  onNext:       () => void;
  onPage:       (p: number) => void;
}

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  onPrev,
  onNext,
  onPage,
}: PaginationProps) => {
  const pages = useMemo(() => {
    const range: number[] = [];
    const delta = 2;
    const left  = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);
    for (let i = left; i <= right; i++) range.push(i);
    return range;
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-between mt-6">
      <p className="text-sm text-gray-500">
        Page <span className="font-medium text-gray-900">{currentPage}</span> of{" "}
        <span className="font-medium text-gray-900">{totalPages}</span> —{" "}
        <span className="font-medium text-gray-900">{totalItems}</span> total logs
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              p === currentPage
                ? "bg-orange-600 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={onNext}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

const EmptyState = ({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Activity className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-1">No logs found</h3>
    <p className="text-gray-500 text-sm mb-6">
      {hasFilters
        ? "No logs match your current filters."
        : "No audit logs available yet."}
    </p>
    {hasFilters && (
      <button
        onClick={onClear}
        className="px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors"
      >
        Clear filters
      </button>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminAuditLogs() {
  const { data: rawData, isLoading, refetch } = useGetAuditLogsQuery({});

  // Support both array response and PaginatedResponse shape
  const logs: AuditLog[] = useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    if (Array.isArray((rawData as any).data)) return (rawData as any).data;
    return [];
  }, [rawData]);

  const [search,       setSearch]       = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterAdmin,  setFilterAdmin]  = useState("all");
  const [dateRange,    setDateRange]    = useState("all");
  const [viewMode,     setViewMode]     = useState<"table" | "timeline">("table");
  const [page,         setPage]         = useState(1);

  // Derived filter options
  const uniqueActions = useMemo<string[]>(
    () => [...new Set(logs.map((l) => l.action))].sort(),
    [logs]
  );

  const uniqueAdmins = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    logs.forEach((l) => {
      if (l.admin) map.set(l.admin.id, l.admin);
    });
    return [...map.values()];
  }, [logs]);

  // Filtering
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((log) => {
      const matchSearch =
        !q ||
        log.admin?.name?.toLowerCase().includes(q) ||
        log.admin?.email?.toLowerCase().includes(q) ||
        log.target?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q);

      const matchAction =
        filterAction === "all" || log.action === filterAction;

      const matchAdmin =
        filterAdmin === "all" ||
        String(log.admin?.id) === filterAdmin;

      let matchDate = true;
      if (dateRange !== "all") {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
        matchDate = new Date(log.createdAt) >= cutoff;
      }

      return matchSearch && matchAction && matchAdmin && matchDate;
    });
  }, [logs, search, filterAction, filterAdmin, dateRange]);

  // Sort newest first
  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      ),
    [filtered]
  );

  const totalPages   = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated    = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const hasFilters   = search !== "" || filterAction !== "all" || filterAdmin !== "all" || dateRange !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterAction("all");
    setFilterAdmin("all");
    setDateRange("all");
    setPage(1);
  };

  // Metrics
  const todayStr     = new Date().toDateString();
  const todayCount   = logs.filter((l) => new Date(l.createdAt).toDateString() === todayStr).length;
  const adminCount   = uniqueAdmins.length;
  const totalCount   = logs.length;

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Complete history of all admin actions on AskDerek
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Activity}
            label="Total Actions"
            value={totalCount.toLocaleString()}
            meta="All time"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <MetricCard
            icon={Users}
            label="Active Admins"
            value={adminCount}
            meta="Unique admins"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <MetricCard
            icon={Clock}
            label="Today"
            value={todayCount}
            meta="Actions today"
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <MetricCard
            icon={Database}
            label="Retention"
            value="90 days"
            meta="Data kept"
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
          />
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search admin, target, details..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Selects */}
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="all">All Actions</option>
                {uniqueActions.map((a) => (
                  <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                ))}
              </select>

              <select
                value={filterAdmin}
                onChange={(e) => { setFilterAdmin(e.target.value); setPage(1); }}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="all">All Admins</option>
                {uniqueAdmins.map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.name}</option>
                ))}
              </select>

              <select
                value={dateRange}
                onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="all">All Time</option>
                <option value="1">Last 24h</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>

              {/* View toggle */}
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2.5 transition-colors ${viewMode === "table" ? "bg-orange-50 text-orange-600" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                  title="Table view"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`p-2.5 transition-colors ${viewMode === "timeline" ? "bg-orange-50 text-orange-600" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                  title="Timeline view"
                >
                  <Clock className="w-4 h-4" />
                </button>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2.5 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Results summary ── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-900">{paginated.length}</span>{" "}
            of{" "}
            <span className="font-medium text-gray-900">{filtered.length}</span>{" "}
            logs
          </p>
          <p className="text-xs text-gray-400">
            Last refreshed {formatTime(new Date().toISOString())}
          </p>
        </div>

        {/* ── Content ── */}
        {paginated.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
        ) : (
          <>
            {viewMode === "table" ? (
              <TableView logs={paginated} />
            ) : (
              <TimelineView logs={paginated} />
            )}

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                onPage={(p) => setPage(p)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}