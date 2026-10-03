"use client";

import { useState }          from "react";
import { useAdminEnquiry }   from "@/hooks/useEnquiry";
import EnquiryCard           from "@/components/EnquiryCard";
import {
  MessageSquare, RefreshCw, TrendingUp,
  Handshake, Clock,
} from "lucide-react";
import type { Enquiry } from "@/state/api";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const formatGHS = (n: number) =>
  `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0 })}`;

export default function AdminEnquiriesPage() {
  const [page, setPage] = useState(1);
  const { enquiries, pagination, isLoading, refetch } = useAdminEnquiry({ page, limit: 20 });

  const totalCommission = enquiries
    .filter((e: Enquiry) => e.status === "AGREED" || e.status === "COMPLETED")
    .reduce((sum: number, e: Enquiry) => sum + (e.commissionDue ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Enquiries</h1>
            <p className="text-sm text-gray-500 mt-0.5">Platform-wide buyer-landlord enquiries</p>
          </div>
          <button onClick={() => refetch()} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: MessageSquare, label: "Total",      value: enquiries.length,                                             bg: "bg-blue-50",    color: "text-blue-600"    },
            { icon: Clock,         label: "New",        value: enquiries.filter((e: Enquiry) => e.status === "NEW").length,  bg: "bg-amber-50",   color: "text-amber-600"   },
            { icon: Handshake,     label: "Deals",      value: enquiries.filter((e: Enquiry) => e.status === "AGREED").length, bg: "bg-emerald-50", color: "text-emerald-600" },
            { icon: TrendingUp,    label: "Commission", value: formatGHS(totalCommission),                                   bg: "bg-orange-50",  color: "text-orange-600"  },
          ].map(({ icon: Icon, label, value, bg, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : enquiries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-900">No enquiries yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enquiries.map((e: Enquiry) => (
              <EnquiryCard key={e.id} enquiry={e} showProperty />
            ))}
          </div>
        )}

        {(pagination?.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page} of {pagination?.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">Previous</button>
              <button onClick={() => setPage((p) => Math.min(pagination?.totalPages ?? 1, p + 1))} disabled={page === (pagination?.totalPages ?? 1)} className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}