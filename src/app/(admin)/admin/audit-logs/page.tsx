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
  FileText,
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
} from "lucide-react";
import { useState } from "react";

// Action type icons and colors
const actionConfig: Record<string, { icon: any; color: string; bg: string }> = {
  CREATE: { icon: Plus, color: "text-emerald-600", bg: "bg-emerald-50" },
  UPDATE: { icon: Edit, color: "text-blue-600", bg: "bg-blue-50" },
  DELETE: { icon: Trash2, color: "text-rose-600", bg: "bg-rose-50" },
  APPROVE: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  APPROVE_PROPERTY: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  APPROVE_VERIFICATION: { icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  REJECT: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
  REJECT_PROPERTY: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
  REJECT_VERIFICATION: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
  LOGIN: { icon: LogIn, color: "text-purple-600", bg: "bg-purple-50" },
  LOGOUT: { icon: LogOut, color: "text-gray-600", bg: "bg-gray-50" },
  VIEW: { icon: Eye, color: "text-blue-600", bg: "bg-blue-50" },
  EXPORT: { icon: Download, color: "text-indigo-600", bg: "bg-indigo-50" },
  UPLOAD: { icon: Upload, color: "text-amber-600", bg: "bg-amber-50" },
  VERIFY: { icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  BLOCK: { icon: Lock, color: "text-rose-600", bg: "bg-rose-50" },
  ADD_BLACKLIST: { icon: Lock, color: "text-rose-600", bg: "bg-rose-50" },
  REMOVE_BLACKLIST: { icon: Unlock, color: "text-emerald-600", bg: "bg-emerald-50" },
  RESOLVE_REPORT: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
};

// Metric Card Component
const MetricCard = ({ icon: Icon, label, value, change, color }: any) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
    <div className="flex items-start justify-between">
      <div className={`w-12 h-12 rounded-xl ${color.bg} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${color.text}`} />
      </div>
      {change && (
        <span className={`text-xs font-medium ${change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  </div>
);

// Timeline View Component
const TimelineView = ({ logs }: { logs: any[] }) => {
  const groupedLogs = logs.reduce((groups: any, log: any) => {
    const date = new Date(log.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedLogs).map(([date, dayLogs]: [string, any]) => (
        <div key={date} className="relative">
          <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm py-2 px-4 rounded-lg mb-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">{date}</h3>
          </div>
          <div className="space-y-3">
            {dayLogs.map((log: any, index: number) => {
              const action = actionConfig[log.action] || { icon: Activity, color: "text-gray-600", bg: "bg-gray-50" };
              const ActionIcon = action.icon;
              return (
                <div key={log.id || index} className="relative pl-8 pb-3">
                  {index < dayLogs.length - 1 && (
                    <div className="absolute left-3 top-6 bottom-0 w-px bg-gray-200" />
                  )}
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${action.bg} flex items-center justify-center`}>
                    <ActionIcon className={`w-3 h-3 ${action.color}`} />
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-medium text-gray-900">{log.admin?.name}</span>
                          <span className="text-gray-400">·</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${action.bg} ${action.color}`}>
                            {log.action}
                          </span>
                          <span className="text-gray-400">·</span>
                          <span className="text-sm text-gray-500">{log.target}</span>
                        </div>
                        {log.details && <p className="text-sm text-gray-600">{log.details}</p>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
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

// Table View Component
const TableView = ({ logs }: { logs: any[] }) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-6 py-4 font-semibold text-gray-600">Admin</th>
            <th className="text-left px-6 py-4 font-semibold text-gray-600">Action</th>
            <th className="text-left px-6 py-4 font-semibold text-gray-600">Target</th>
            <th className="text-left px-6 py-4 font-semibold text-gray-600">Details</th>
            <th className="text-left px-6 py-4 font-semibold text-gray-600">Timestamp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map((log: any, index: number) => {
            const action = actionConfig[log.action] || { icon: Activity, color: "text-gray-600", bg: "bg-gray-50" };
            const ActionIcon = action.icon;
            return (
              <tr key={log.id || index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {log.admin?.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{log.admin?.name}</p>
                      <p className="text-xs text-gray-400">{log.admin?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${action.bg} flex items-center justify-center`}>
                      <ActionIcon className={`w-3 h-3 ${action.color}`} />
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${action.bg} ${action.color}`}>
                      {log.action}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-700">{log.target}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-500 text-sm max-w-xs truncate">{log.details}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-400 text-xs whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

// Main Component
const AdminAuditLogs = () => {
  const { data: logs, isLoading, refetch } = useGetAuditLogsQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterAdmin, setFilterAdmin] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "timeline">(
    typeof window !== "undefined" && window.innerWidth < 768 ? "timeline" : "table"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filteredLogs = logs?.filter((log: any) => {
    const matchesSearch =
      log.admin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesAdmin = filterAdmin === "all" || log.admin?.id === filterAdmin;
    let matchesDate = true;
    if (dateRange !== "all") {
      const logDate = new Date(log.createdAt);
      const now = new Date();
      const days = parseInt(dateRange);
      const cutoff = new Date(now.setDate(now.getDate() - days));
      matchesDate = logDate >= cutoff;
    }
    return matchesSearch && matchesAction && matchesAdmin && matchesDate;
  }) || [];

  const sortedLogs = [...filteredLogs].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);
  const paginatedLogs = sortedLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const uniqueActions = [...new Set(logs?.map((log: any) => log.action as string) || [])] as string[];
  const uniqueAdmins = [...new Map(logs?.map((log: any) => [log.admin?.id, log.admin])).values()] as any[];

  const totalActions = logs?.length || 0;
  const uniqueAdminsCount = uniqueAdmins.length;
  const todayActions = logs?.filter((log: any) => {
    const today = new Date().toDateString();
    return new Date(log.createdAt).toDateString() === today;
  }).length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-spin border-t-orange-600" />
            <Activity className="w-6 h-6 text-orange-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading audit logs...</p>
          <p className="text-gray-400 text-sm mt-1">Please wait while we fetch the data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
              <p className="text-gray-500 mt-1">Complete history of all admin actions</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => refetch()} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Export Logs</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard icon={Activity} label="Total Actions" value={totalActions.toLocaleString()} change={12} color={{ bg: "bg-blue-50", text: "text-blue-600" }} />
          <MetricCard icon={Users} label="Active Admins" value={uniqueAdminsCount} change={8} color={{ bg: "bg-emerald-50", text: "text-emerald-600" }} />
          <MetricCard icon={Clock} label="Today's Actions" value={todayActions} change={-5} color={{ bg: "bg-amber-50", text: "text-amber-600" }} />
          <MetricCard icon={Database} label="Data Retention" value="90 days" color={{ bg: "bg-purple-50", text: "text-purple-600" }} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by admin, target, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                <option value="all">All Actions</option>
                {uniqueActions.map((action: string) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
              <select value={filterAdmin} onChange={(e) => setFilterAdmin(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                <option value="all">All Admins</option>
                {uniqueAdmins.map((admin: any) => (
                  <option key={admin?.id} value={admin?.id}>{admin?.name}</option>
                ))}
              </select>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                <option value="all">All Time</option>
                <option value="1">Last 24 Hours</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setViewMode("table")} className={`p-2 transition-colors ${viewMode === "table" ? "bg-orange-50 text-orange-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button onClick={() => setViewMode("timeline")} className={`p-2 transition-colors ${viewMode === "timeline" ? "bg-orange-50 text-orange-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium">{paginatedLogs.length}</span> of{" "}
            <span className="font-medium">{filteredLogs.length}</span> logs
          </p>
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
        </div>

        {/* Logs Display */}
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No logs found</h3>
            <p className="text-gray-500 mb-6">{searchTerm ? "Try adjusting your search filters" : "No audit logs available"}</p>
            {searchTerm && (
              <button onClick={() => { setSearchTerm(""); setFilterAction("all"); setFilterAdmin("all"); setDateRange("all"); }} className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === "table" ? <TableView logs={paginatedLogs} /> : <TimelineView logs={paginatedLogs} />}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <p className="text-sm text-gray-600">Page {currentPage} of {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <button key={i} onClick={() => setCurrentPage(pageNum)} className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? "bg-orange-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <ArrowRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;