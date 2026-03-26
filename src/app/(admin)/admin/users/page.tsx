"use client";

import { useGetAdminAllManagersQuery, useGetAdminAllTenantsQuery, useApproveVerificationMutation } from "@/state/api";
import { useState, useMemo } from "react";
import { 
  Shield, 
  Users,
  Search,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
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
  Building2,
} from "lucide-react";
import Image from "next/image";

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

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    unverified: "bg-amber-50 text-amber-700 border-amber-200",
    pending: "bg-blue-50 text-blue-700 border-blue-200",
    suspended: "bg-rose-50 text-rose-700 border-rose-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Verification Badge Component
const VerificationBadge = ({ isVerified }: { isVerified: boolean }) => (
  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
    isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
  }`}>
    {isVerified ? (
      <><CheckCircle className="w-3.5 h-3.5" /><span>Verified</span></>
    ) : (
      <><AlertCircle className="w-3.5 h-3.5" /><span>Pending Verification</span></>
    )}
  </div>
);

// User Card Component
const UserCard = ({ user, type, onVerify, onView, onMessage }: any) => {
  const [showActions, setShowActions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative h-24 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="absolute -bottom-12 left-6">
          <div className="relative">
            {user.avatar ? (
              <Image src={user.avatar} alt={user.name} width={80} height={80} className="rounded-xl border-4 border-white shadow-lg" />
            ) : (
              <div className="w-20 h-20 bg-white rounded-xl border-4 border-white shadow-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-orange-600">{user.name?.charAt(0) || 'U'}</span>
              </div>
            )}
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>
        <div className="absolute top-4 right-4">
          <button onClick={() => setShowActions(!showActions)} className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white shadow-lg transition-all">
            <MoreVertical className="w-4 h-4 text-gray-700" />
          </button>
          {showActions && (
            <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl border border-gray-200 py-2 w-48 z-10">
              <button onClick={() => { onView(user); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-500" />View Profile
              </button>
              <button onClick={() => { onMessage(user); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />Send Message
              </button>
              {type === 'managers' && !user.isVerified && (
                <button onClick={() => { onVerify(user.id); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 text-emerald-600 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />Verify User
                </button>
              )}
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-rose-50 text-rose-600 flex items-center gap-2">
                <Ban className="w-4 h-4" />Suspend User
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pt-14 p-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <VerificationBadge isVerified={user.isVerified || false} />
        </div>

        <div className="space-y-2 mt-4">
          {user.phoneNumber && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" /><span>{user.phoneNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {type === 'managers' ? (
            <>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{user.managedProperties?.length || 0}</p>
                <p className="text-xs text-gray-500">Properties</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{user.isVerified ? 'Yes' : 'No'}</p>
                <p className="text-xs text-gray-500">Verified</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{user.verification ? 'Yes' : 'No'}</p>
                <p className="text-xs text-gray-500">Documents</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{user.applications?.length || 0}</p>
                <p className="text-xs text-gray-500">Applications</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{user.leases?.length || 0}</p>
                <p className="text-xs text-gray-500">Leases</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{user.favorites?.length || 0}</p>
                <p className="text-xs text-gray-500">Favorites</p>
              </div>
            </>
          )}
        </div>

        {user.documents && user.documents.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <button onClick={() => setShowDetails(!showDetails)} className="flex items-center justify-between w-full text-left">
              <span className="text-sm font-medium text-gray-700">Documents ({user.documents.length})</span>
              {showDetails ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showDetails && (
              <div className="mt-3 space-y-2">
                {user.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
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

// Table View Component
const TableView = ({ users, type, onVerify }: { users: any[]; type: string; onVerify: (id: string) => void }) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-6 py-4 font-semibold text-gray-600">User</th>
            <th className="text-left px-6 py-4 font-semibold text-gray-600">Contact</th>
            <th className="text-left px-6 py-4 font-semibold text-gray-600">Status</th>
            {type === 'managers' && <th className="text-left px-6 py-4 font-semibold text-gray-600">Properties</th>}
            {type === 'tenants' && <th className="text-left px-6 py-4 font-semibold text-gray-600">Applications</th>}
            <th className="text-left px-6 py-4 font-semibold text-gray-600">Joined</th>
            <th className="text-left px-6 py-4 font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                {user.phoneNumber && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone className="w-3 h-3" /><span>{user.phoneNumber}</span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <VerificationBadge isVerified={user.isVerified} />
              </td>
              {type === 'managers' && (
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{user.managedProperties?.length || 0}</span>
                </td>
              )}
              {type === 'tenants' && (
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{user.applications?.length || 0}</span>
                </td>
              )}
              <td className="px-6 py-4">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors" title="View Profile">
                    <Eye className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors" title="Send Message">
                    <Mail className="w-4 h-4 text-gray-500" />
                  </button>
                  {type === 'managers' && !user.isVerified && (
                    <button onClick={() => onVerify(user.id)} className="p-1 hover:bg-emerald-50 rounded-lg transition-colors" title="Verify User">
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

// Main Component
const AdminUsers = () => {
  const [tab, setTab] = useState<"managers" | "tenants">("managers");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVerification, setFilterVerification] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const itemsPerPage = 12;

  const { data: managers, isLoading: loadingManagers, refetch: refetchManagers } = useGetAdminAllManagersQuery();
  const { data: tenants, isLoading: loadingTenants, refetch: refetchTenants } = useGetAdminAllTenantsQuery();
  const [verifyManager] = useApproveVerificationMutation();

  const isLoading = loadingManagers || loadingTenants;
  const currentUsers = tab === "managers" ? managers : tenants;

  const filteredUsers = useMemo(() => {
    return currentUsers?.filter((user: any) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVerification = filterVerification === "all" ||
        (filterVerification === "verified" && user.isVerified) ||
        (filterVerification === "unverified" && !user.isVerified);
      return matchesSearch && matchesVerification;
    }) || [];
  }, [currentUsers, searchTerm, filterVerification]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a: any, b: any) => {
      if (sortBy === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === "name") return a.name?.localeCompare(b.name);
      return 0;
    });
  }, [filteredUsers, sortBy]);

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalUsers = currentUsers?.length || 0;
  const verifiedUsers = currentUsers?.filter((u: any) => u.isVerified).length || 0;
  const unverifiedUsers = totalUsers - verifiedUsers;

  const handleVerify = async (id: string) => {
    await verifyManager(Number(id));
    refetchManagers();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-spin border-t-orange-600" />
            <Users className="w-6 h-6 text-orange-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading users...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-500 mt-1">Manage all landlords and tenants on AskDerek</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => tab === "managers" ? refetchManagers() : refetchTenants()} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Export</span>
              </button>
              <button className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span className="text-sm font-medium">Add User</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => { setTab("managers"); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
              tab === "managers" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "bg-white text-gray-600 border border-gray-200 hover:border-orange-200 hover:text-orange-600"
            }`}
          >
            <Shield className="w-4 h-4" />
            Landlords
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${tab === "managers" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
              {managers?.length || 0}
            </span>
          </button>
          <button
            onClick={() => { setTab("tenants"); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
              tab === "tenants" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "bg-white text-gray-600 border border-gray-200 hover:border-orange-200 hover:text-orange-600"
            }`}
          >
            <Users className="w-4 h-4" />
            Tenants
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${tab === "tenants" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
              {tenants?.length || 0}
            </span>
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard icon={tab === 'managers' ? Shield : Users} label={`Total ${tab === 'managers' ? 'Landlords' : 'Tenants'}`} value={totalUsers.toLocaleString()} change={12} color={{ bg: "bg-blue-50", text: "text-blue-600" }} />
          <MetricCard icon={CheckCircle} label="Verified" value={verifiedUsers.toLocaleString()} change={8} color={{ bg: "bg-emerald-50", text: "text-emerald-600" }} />
          <MetricCard icon={AlertCircle} label="Pending Verification" value={unverifiedUsers.toLocaleString()} change={-5} color={{ bg: "bg-amber-50", text: "text-amber-600" }} />
          <MetricCard icon={TrendingUp} label="Total Users" value={(totalUsers).toLocaleString()} change={15} color={{ bg: "bg-purple-50", text: "text-purple-600" }} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${tab === 'managers' ? 'landlords' : 'tenants'} by name or email...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={filterVerification} onChange={(e) => setFilterVerification(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
              </select>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-orange-50 text-orange-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button onClick={() => setViewMode("table")} className={`p-2 transition-colors ${viewMode === "table" ? "bg-orange-50 text-orange-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium">{paginatedUsers.length}</span> of{" "}
            <span className="font-medium">{filteredUsers.length}</span> {tab === 'managers' ? 'landlords' : 'tenants'}
          </p>
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
        </div>

        {/* Users Display */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500 mb-6">{searchTerm ? "Try adjusting your search filters" : `No ${tab} found`}</p>
            {searchTerm && (
              <button onClick={() => { setSearchTerm(""); setFilterVerification("all"); }} className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedUsers.map((user: any) => (
                  <UserCard key={user.id} user={user} type={tab} onVerify={handleVerify} onView={setSelectedUser} onMessage={() => {}} />
                ))}
              </div>
            ) : (
              <TableView users={paginatedUsers} type={tab} onVerify={handleVerify} />
            )}

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

export default AdminUsers;