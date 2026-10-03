"use client";

import {
  useGetAdminAllManagersQuery,
  useGetAdminAllTenantsQuery,
  useApproveVerificationMutation,
} from "@/state/api";
import { useState, useMemo } from "react";
import {
  Shield,
  Users,
  Search,
  Download,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  UserPlus,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Eye,
  UserCheck,
  Ban,
} from "lucide-react";
import Image from "next/image";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AdminUser {
  id:                  number;
  name:                string;
  email:               string;
  phoneNumber?:        string;
  isVerified:          boolean;
  createdAt?:          string;
  avatar?:             string;
  managedProperties?:  unknown[];
  applications?:       unknown[];
  leases?:             unknown[];
  favorites?:          unknown[];
  verification?:       unknown;
  documents?:          { id: number; type: string; status: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely extracts an array from a query result.
 * Handles both plain array responses and PaginatedResponse<T> shapes.
 */
function extractArray(raw: unknown): AdminUser[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as AdminUser[];
  if (Array.isArray((raw as any).data)) return (raw as any).data as AdminUser[];
  if (Array.isArray((raw as any).managers)) return (raw as any).managers as AdminUser[];
  if (Array.isArray((raw as any).tenants))  return (raw as any).tenants  as AdminUser[];
  return [];
}

const getInitial = (name?: string) => name?.charAt(0).toUpperCase() ?? "U";

const formatJoined = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GH", {
        day:   "numeric",
        month: "short",
        year:  "numeric",
      })
    : "—";

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-8 space-y-6">
    <Skeleton className="h-8 w-56" />
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
    <Skeleton className="h-14" />
    <div className="grid grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64" />)}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD
// ─────────────────────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon:      React.ElementType;
  label:     string;
  value:     string | number;
  iconBg:    string;
  iconColor: string;
}

const MetricCard = ({ icon: Icon, label, value, iconBg, iconColor }: MetricCardProps) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
    <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// STATUS / VERIFICATION BADGES
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    verified:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    unverified: "bg-amber-50   text-amber-700   border-amber-200",
    pending:    "bg-blue-50    text-blue-700    border-blue-200",
    suspended:  "bg-rose-50    text-rose-700    border-rose-200",
    active:     "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive:   "bg-gray-50    text-gray-700    border-gray-200",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${map[status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const VerificationBadge = ({ isVerified }: { isVerified: boolean }) => (
  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
    isVerified
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50   text-amber-700"
  }`}>
    {isVerified ? (
      <><CheckCircle className="w-3.5 h-3.5" /><span>Verified</span></>
    ) : (
      <><AlertCircle className="w-3.5 h-3.5" /><span>Pending</span></>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// USER CARD (grid view)
// ─────────────────────────────────────────────────────────────────────────────

interface UserCardProps {
  user:     AdminUser;
  type:     "managers" | "tenants";
  onVerify: (id: number) => Promise<void>;
  onView:   (user: AdminUser) => void;
}

const UserCard = ({ user, type, onVerify, onView }: UserCardProps) => {
  const [showActions, setShowActions] = useState(false);
  const [showDocs,    setShowDocs]    = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Banner */}
      <div className="relative h-20 bg-gradient-to-r from-orange-500 to-orange-600">
        {/* Avatar */}
        <div className="absolute -bottom-10 left-5">
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name}
              width={72}
              height={72}
              className="rounded-xl border-4 border-white shadow-md object-cover"
            />
          ) : (
            <div className="w-[72px] h-[72px] bg-white rounded-xl border-4 border-white shadow-md flex items-center justify-center">
              <span className="text-xl font-bold text-orange-600">
                {getInitial(user.name)}
              </span>
            </div>
          )}
          {user.isVerified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Actions menu */}
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setShowActions((v) => !v)}
            className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white shadow transition-all"
          >
            <MoreVertical className="w-4 h-4 text-gray-700" />
          </button>

          {showActions && (
            <div className="absolute top-9 right-0 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 w-44 z-20">
              <button
                onClick={() => { onView(user); setShowActions(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
              >
                <Eye className="w-4 h-4 text-gray-400" />
                View Profile
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
              >
                <Mail className="w-4 h-4 text-gray-400" />
                Send Message
              </button>
              {type === "managers" && !user.isVerified && (
                <button
                  onClick={() => { onVerify(user.id); setShowActions(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 text-emerald-600 flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Verify User
                </button>
              )}
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-rose-50 text-rose-600 flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Suspend User
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pt-12 p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{user.name}</h3>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <VerificationBadge isVerified={user.isVerified} />
        </div>

        <div className="space-y-1.5">
          {user.phoneNumber && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              {user.phoneNumber}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            Joined {formatJoined(user.createdAt)}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-gray-100">
          {type === "managers" ? (
            <>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {user.managedProperties?.length ?? 0}
                </p>
                <p className="text-xs text-gray-400">Properties</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {user.isVerified ? "Yes" : "No"}
                </p>
                <p className="text-xs text-gray-400">Verified</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {user.verification ? "Yes" : "No"}
                </p>
                <p className="text-xs text-gray-400">Docs</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {user.applications?.length ?? 0}
                </p>
                <p className="text-xs text-gray-400">Apps</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {user.leases?.length ?? 0}
                </p>
                <p className="text-xs text-gray-400">Leases</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {user.favorites?.length ?? 0}
                </p>
                <p className="text-xs text-gray-400">Saved</p>
              </div>
            </>
          )}
        </div>

        {/* Documents */}
        {(user.documents?.length ?? 0) > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowDocs((v) => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-xs font-semibold text-gray-600">
                Documents ({user.documents!.length})
              </span>
              {showDocs
                ? <ChevronUp   className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showDocs && (
              <div className="mt-2 space-y-1.5">
                {user.documents!.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-600">{doc.type}</span>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TABLE VIEW
// ─────────────────────────────────────────────────────────────────────────────

interface TableViewProps {
  users:    AdminUser[];
  type:     "managers" | "tenants";
  onVerify: (id: number) => Promise<void>;
}

const TableView = ({ users, type, onVerify }: TableViewProps) => (
  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["User", "Contact", "Status",
              type === "managers" ? "Properties" : "Applications",
              "Joined", "Actions",
            ].map((h) => (
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
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
              {/* User */}
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {getInitial(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
              </td>

              {/* Contact */}
              <td className="px-5 py-4">
                {user.phoneNumber ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    {user.phoneNumber}
                  </div>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </td>

              {/* Status */}
              <td className="px-5 py-4">
                <VerificationBadge isVerified={user.isVerified} />
              </td>

              {/* Properties or Applications */}
              <td className="px-5 py-4">
                <span className="font-medium text-gray-900 tabular-nums">
                  {type === "managers"
                    ? (user.managedProperties?.length ?? 0)
                    : (user.applications?.length ?? 0)}
                </span>
              </td>

              {/* Joined */}
              <td className="px-5 py-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {formatJoined(user.createdAt)}
                </div>
              </td>

              {/* Actions */}
              <td className="px-5 py-4">
                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View Profile"
                  >
                    <Eye className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Send Message"
                  >
                    <Mail className="w-4 h-4 text-gray-500" />
                  </button>
                  {type === "managers" && !user.isVerified && (
                    <button
                      onClick={() => onVerify(user.id)}
                      className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Verify User"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    </button>
                  )}
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
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages:  number;
  total:       number;
  onPrev:      () => void;
  onNext:      () => void;
  onPage:      (p: number) => void;
}

const Pagination = ({
  currentPage,
  totalPages,
  total,
  onPrev,
  onNext,
  onPage,
}: PaginationProps) => {
  const delta = 2;
  const left  = Math.max(1, currentPage - delta);
  const right = Math.min(totalPages, currentPage + delta);
  const pages = Array.from({ length: right - left + 1 }, (_, i) => left + i);

  return (
    <div className="flex items-center justify-between mt-6">
      <p className="text-sm text-gray-500">
        Page <span className="font-medium text-gray-900">{currentPage}</span> of{" "}
        <span className="font-medium text-gray-900">{totalPages}</span> —{" "}
        <span className="font-medium text-gray-900">{total}</span> users
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
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 12;

export default function AdminUsers() {
  const [tab,         setTab]         = useState<"managers" | "tenants">("managers");
  const [viewMode,    setViewMode]    = useState<"grid" | "table">("grid");
  const [search,      setSearch]      = useState("");
  const [filterVerif, setFilterVerif] = useState("all");
  const [sortBy,      setSortBy]      = useState("newest");
  const [page,        setPage]        = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // ── Queries ──
  const { data: managersRaw, isLoading: loadingManagers, refetch: refetchManagers } = useGetAdminAllManagersQuery({});
const { data: tenantsRaw,  isLoading: loadingTenants,  refetch: refetchTenants  } = useGetAdminAllTenantsQuery({});
  const [verifyManager] = useApproveVerificationMutation();

  // ── Safe array extraction — handles any response shape ──
  const managers = useMemo(() => extractArray(managersRaw), [managersRaw]);
  const tenants  = useMemo(() => extractArray(tenantsRaw),  [tenantsRaw]);

  const isLoading    = loadingManagers || loadingTenants;
  const currentUsers = tab === "managers" ? managers : tenants;

  // ── Filter ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return currentUsers.filter((u) => {
      const matchSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phoneNumber?.toLowerCase().includes(q);

      const matchVerif =
        filterVerif === "all" ||
        (filterVerif === "verified"   &&  u.isVerified) ||
        (filterVerif === "unverified" && !u.isVerified);

      return matchSearch && matchVerif;
    });
  }, [currentUsers, search, filterVerif]);

  // ── Sort ──
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "newest")
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      if (sortBy === "oldest")
        return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
      if (sortBy === "name")
        return (a.name ?? "").localeCompare(b.name ?? "");
      return 0;
    });
  }, [filtered, sortBy]);

  // ── Pagination ──
  const totalPages   = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated    = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const hasFilters   = search !== "" || filterVerif !== "all";

  // ── Metrics ──
  const totalCount    = currentUsers.length;
  const verifiedCount = currentUsers.filter((u) => u.isVerified).length;
  const pendingCount  = totalCount - verifiedCount;

  // ── Handlers ──
  const handleVerify = async (id: number) => {
    await verifyManager(id);
    refetchManagers();
  };

  const clearFilters = () => {
    setSearch("");
    setFilterVerif("all");
    setPage(1);
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage all landlords and tenants on AskDerek
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => tab === "managers" ? refetchManagers() : refetchTenants()}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors text-sm font-semibold">
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-3">
          {(["managers", "tenants"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-orange-200 hover:text-orange-600"
              }`}
            >
              {t === "managers" ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              {t === "managers" ? "Landlords" : "Tenants"}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                tab === t ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {t === "managers" ? managers.length : tenants.length}
              </span>
            </button>
          ))}
        </div>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={tab === "managers" ? Shield : Users}
            label={`Total ${tab === "managers" ? "Landlords" : "Tenants"}`}
            value={totalCount.toLocaleString()}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <MetricCard
            icon={CheckCircle}
            label="Verified"
            value={verifiedCount.toLocaleString()}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <MetricCard
            icon={AlertCircle}
            label="Pending Verification"
            value={pendingCount.toLocaleString()}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <MetricCard
            icon={TrendingUp}
            label="Filtered Results"
            value={filtered.length.toLocaleString()}
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
                placeholder={`Search ${tab === "managers" ? "landlords" : "tenants"}...`}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {/* Verification filter */}
              <select
                value={filterVerif}
                onChange={(e) => { setFilterVerif(e.target.value); setPage(1); }}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A–Z</option>
              </select>

              {/* View toggle */}
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-orange-50 text-orange-600"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                  title="Grid view"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "table"
                      ? "bg-orange-50 text-orange-600"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                  title="Table view"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
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
            <span className="font-medium text-gray-900">{paginated.length}</span> of{" "}
            <span className="font-medium text-gray-900">{filtered.length}</span>{" "}
            {tab === "managers" ? "landlords" : "tenants"}
          </p>
        </div>

        {/* ── Content ── */}
        {paginated.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No users found</h3>
            <p className="text-gray-500 text-sm mb-6">
              {hasFilters ? "Try adjusting your filters." : `No ${tab} registered yet.`}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginated.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    type={tab}
                    onVerify={handleVerify}
                    onView={setSelectedUser}
                  />
                ))}
              </div>
            ) : (
              <TableView
                users={paginated}
                type={tab}
                onVerify={handleVerify}
              />
            )}

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                total={filtered.length}
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