"use client";
import { useState } from "react";
import { useAdminBooking } from "@/hooks/useBooking";
import { Calendar, RefreshCw, ArrowRight } from "lucide-react";
import type { Booking } from "@/state/api";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);
const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  CONFIRMED:   { label: "Confirmed",   bg: "bg-blue-50",    text: "text-blue-700"    },
  CHECKED_IN:  { label: "Checked In",  bg: "bg-emerald-50", text: "text-emerald-700" },
  CHECKED_OUT: { label: "Checked Out", bg: "bg-gray-100",   text: "text-gray-500"    },
  CANCELLED:   { label: "Cancelled",   bg: "bg-rose-50",    text: "text-rose-700"    },
  NO_SHOW:     { label: "No Show",     bg: "bg-amber-50",   text: "text-amber-700"   },
};
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
const formatGHS  = (n?: number)  => n != null ? `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0 })}` : "—";

export default function AdminBookingsPage() {
  const [page, setPage] = useState(1);
  const { bookings, pagination, isLoading, refetch } = useAdminBooking({ page, limit: 20 });
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900">All Bookings</h1><p className="text-sm text-gray-500 mt-0.5">Platform-wide short stay and hostel bookings</p></div>
          <button onClick={() => refetch()} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"><RefreshCw className="w-4 h-4 text-gray-600" /></button>
        </div>
        {isLoading ? (
          <div className="space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center"><Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" /><p className="text-base font-bold text-gray-900">No bookings yet</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">{["Property","Reference","Check In","Check Out","Amount","Status"].map((h) => (<th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>))}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.map((b: Booking) => {
                    const cfg = STATUS_CFG[b.status] ?? STATUS_CFG.CONFIRMED;
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4"><p className="font-semibold text-gray-900 truncate max-w-[160px]">{b.property?.name ?? "—"}</p></td>
                        <td className="px-5 py-4"><p className="text-xs font-mono text-gray-400">{b.reference?.slice(0,14)}...</p></td>
                        <td className="px-5 py-4 text-gray-600">{formatDate(b.checkIn)}</td>
                        <td className="px-5 py-4 text-gray-600">{formatDate(b.checkOut)}</td>
                        <td className="px-5 py-4 font-semibold text-gray-900">{formatGHS(b.totalAmount)}</td>
                        <td className="px-5 py-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(pagination?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Page {page} of {pagination?.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">Previous</button>
                  <button onClick={() => setPage((p) => Math.min(pagination?.totalPages ?? 1, p + 1))} disabled={page === (pagination?.totalPages ?? 1)} className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}