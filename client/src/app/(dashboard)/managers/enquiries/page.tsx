"use client";

import { useState, useMemo } from "react";
import { useUser }           from "@clerk/nextjs";
import { useManagerEnquiry } from "@/hooks/useEnquiry";
import EnquiryCard           from "@/components/EnquiryCard";
import {
  MessageSquare, Search, RefreshCw,
  TrendingUp, Handshake, Clock, CheckCircle,
} from "lucide-react";
import type { Enquiry } from "@/state/api";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const FILTERS = [
  { label: "All",         value: "all"         },
  { label: "New",         value: "NEW"         },
  { label: "Contacted",   value: "CONTACTED"   },
  { label: "Negotiating", value: "NEGOTIATING" },
  { label: "Agreed",      value: "AGREED"      },
  { label: "Completed",   value: "COMPLETED"   },
  { label: "Lost",        value: "LOST"        },
];

const formatGHS = (n: number) =>
  `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

export default function ManagerEnquiriesPage() {
  const {
    activeEnquiries, pendingResponse, inNegotiation,
    dealsMade, unreadCount, totalCommission,
    isLoading, handleMarkAsRead, refetch,
  } = useManagerEnquiry();

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return activeEnquiries.filter((e: Enquiry) => {
      const matchSearch =
        !q ||
        e.property?.name?.toLowerCase().includes(q) ||
        e.message?.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [activeEnquiries, search, statusFilter]);

  const handleCardClick = async (enquiry: Enquiry) => {
    if (!enquiry.isRead) await handleMarkAsRead(enquiry.id);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage buyer interest across all your properties
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                {unreadCount} unread
              </div>
            )}
            <button
              onClick={() => refetch()}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: MessageSquare, label: "Pending Response",  value: pendingResponse.length,       color: "text-blue-600",    bg: "bg-blue-50"    },
            { icon: Clock,         label: "Negotiating",       value: inNegotiation.length,          color: "text-amber-600",   bg: "bg-amber-50"   },
            { icon: Handshake,     label: "Deals Made",        value: dealsMade.length,              color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: TrendingUp,    label: "Commission Earned", value: formatGHS(totalCommission),    color: "text-orange-600",  bg: "bg-orange-50"  },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by property or message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    statusFilter === f.value
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results summary */}
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-900">{filtered.length}</span> enquiries
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No enquiries</h3>
            <p className="text-sm text-gray-500">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters."
                : "Buyer enquiries will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((enquiry: Enquiry) => (
              <EnquiryCard
                key={enquiry.id}
                enquiry={enquiry}
                onClick={handleCardClick}
                showProperty
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}