"use client";

import { useGetAdminPendingPropertiesQuery, useApprovePropertyMutation, useRejectPropertyMutation } from "@/state/api";
import { 
  CheckCircle, 
  XCircle, 
  MapPin, 
  DollarSign,
  Home,
  Calendar,
  User,
  Mail,
  Phone,
  FileText,
  AlertCircle,
  ChevronDown,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  Star,
  Camera,
  Bed,
  Bath,
  Square,
  Shield,
  MoreVertical,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  X,
  MessageSquare,
  History,
  Upload,
  FileCheck,
  FileX,
} from "lucide-react";
import { useState, Fragment } from "react";
import { Dialog, Transition, Menu } from '@headlessui/react';

// Professional status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    review: "bg-blue-50 text-blue-700 border-blue-200",
  }[status] || "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Professional metric card
const MetricCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
    <div className="flex items-start justify-between">
      <div className={`w-12 h-12 rounded-xl ${color.bg} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${color.text}`} />
      </div>
      {trend && (
        <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  </div>
);

// Property card component
const PropertyCard = ({ property, onApprove, onReject, onView }: any) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showActions, setShowActions] = useState(false);

  const amenities = [
    { icon: Bed, label: `${property.bedrooms || 2} Beds` },
    { icon: Bath, label: `${property.bathrooms || 2} Baths` },
    { icon: Square, label: `${property.area || 1500} sqft` },
  ];

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
        {/* Property Image */}
        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
          {property.images?.[0] ? (
            <img 
              src={property.images[0]} 
              alt={property.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-4 left-4">
            <StatusBadge status={property.status || 'pending'} />
          </div>

          {/* Quick Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button 
              onClick={() => setShowActions(!showActions)}
              className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white shadow-lg transition-all"
            >
              <MoreVertical className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Action Menu */}
          {showActions && (
            <div className="absolute top-16 right-4 bg-white rounded-xl shadow-xl border border-gray-200 py-2 w-48 z-10">
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-500" />
                View Details
              </button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                View History
              </button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                Contact Landlord
              </button>
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{property.name}</h3>
              <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="line-clamp-1">{property.location?.address}, {property.location?.city}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-bold">
              <DollarSign className="w-4 h-4" />
              <span>{property.pricePerMonth?.toLocaleString()}</span>
            </div>
          </div>

          {/* Amenities */}
          <div className="flex items-center gap-4 mb-4">
            {amenities.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center gap-1 text-sm text-gray-600">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* Landlord Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                {property.manager?.name?.charAt(0) || 'L'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{property.manager?.name || 'Unknown'}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="w-3 h-3" />
                  <span className="line-clamp-1">{property.manager?.email || 'No email'}</span>
                </div>
                {property.manager?.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Phone className="w-3 h-3" />
                    <span>{property.manager.phone}</span>
                  </div>
                )}
              </div>
              {property.manager?.verified ? (
                <Shield className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
            </div>
          </div>

          {/* Documents */}
          {property.documents && property.documents.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Documents ({property.documents.length})</p>
              <div className="flex gap-2">
                {property.documents.slice(0, 3).map((doc: any, index: number) => (
                  <div key={index} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-gray-600" />
                  </div>
                ))}
                {property.documents.length > 3 && (
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">+{property.documents.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => onApprove(property.id)}
              className="flex-1 bg-emerald-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex-1 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <Transition appear show={showRejectModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowRejectModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">
                      Reject Property
                    </Dialog.Title>
                    <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Please provide a reason for rejecting this property. This will be shared with the landlord.
                    </p>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Enter rejection reason..."
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        onReject({ id: property.id, reason: rejectReason });
                        setShowRejectModal(false);
                        setRejectReason("");
                      }}
                      disabled={!rejectReason.trim()}
                      className="flex-1 bg-rose-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => setShowRejectModal(false)}
                      className="flex-1 bg-gray-100 text-gray-700 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

// Main Component
const AdminProperties = () => {
  const { data: properties, isLoading, refetch } = useGetAdminPendingPropertiesQuery();
  const [approveProperty] = useApprovePropertyMutation();
  const [rejectProperty] = useRejectPropertyMutation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Metrics data
  const metrics = [
    { 
      icon: Home, 
      label: "Total Properties", 
      value: properties?.length || 0,
      trend: 12,
      color: { bg: "bg-blue-50", text: "text-blue-600" }
    },
    { 
      icon: Clock, 
      label: "Pending Review", 
      value: properties?.filter((p: any) => p.status === 'pending').length || 0,
      trend: -5,
      color: { bg: "bg-amber-50", text: "text-amber-600" }
    },
    { 
      icon: CheckCircle, 
      label: "Approved (24h)", 
      value: "24",
      trend: 8,
      color: { bg: "bg-emerald-50", text: "text-emerald-600" }
    },
    { 
      icon: Star, 
      label: "Avg. Rating", 
      value: "4.8",
      trend: 2,
      color: { bg: "bg-purple-50", text: "text-purple-600" }
    },
  ];

  // Filter and sort properties
  const filteredProperties = properties?.filter((property: any) => {
    const matchesSearch = property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.manager?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || property.status === filterStatus;
    return matchesSearch && matchesFilter;
  }) || [];

  const sortedProperties = [...filteredProperties].sort((a: any, b: any) => {
    if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === "price-high") return (b.pricePerMonth || 0) - (a.pricePerMonth || 0);
    if (sortBy === "price-low") return (a.pricePerMonth || 0) - (b.pricePerMonth || 0);
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedProperties.length / itemsPerPage);
  const paginatedProperties = sortedProperties.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleApprove = async (id: number) => {
    await approveProperty(id);
    refetch();
  };

  const handleReject = async ({ id, reason }: { id: number; reason: string }) => {
    await rejectProperty({ id, reason });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-spin border-t-orange-600" />
            <Home className="w-6 h-6 text-orange-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading properties...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
              <p className="text-gray-500 mt-1">
                Review and manage property listings
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => refetch()}
                className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Export</span>
              </button>
              <button className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Add Property</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search properties, locations, or landlords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="review">Under Review</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
              </select>

              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-orange-50 text-orange-600" : "bg-white text-gray-600"}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-orange-50 text-orange-600" : "bg-white text-gray-600"}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium">{paginatedProperties.length}</span> of{" "}
            <span className="font-medium">{filteredProperties.length}</span> properties
          </p>
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Properties Grid/List */}
        {filteredProperties.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? "Try adjusting your search filters" : "All properties have been reviewed"}
            </p>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                }}
                className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={`grid ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-6`}>
              {paginatedProperties.map((property: any) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onView={() => setSelectedProperty(property)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === i + 1
                          ? "bg-orange-600 text-white"
                          : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Property Details Modal */}
      <Transition appear show={!!selectedProperty} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setSelectedProperty(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                  {/* Modal content would go here */}
                  <div className="p-6">
                    <h2>Property Details</h2>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default AdminProperties;