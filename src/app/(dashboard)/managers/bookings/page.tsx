"use client";

import { useState, useMemo }            from "react";
import { useUser }                       from "@clerk/nextjs";
import { useGetManagerPropertiesQuery }  from "@/state/api";
import { useManagerBooking }             from "@/hooks/useBooking";
import {
  Calendar, Users, CheckCircle, Clock,
  XCircle, RefreshCw, ArrowRight, AlertCircle,
} from "lucide-react";
import type { Booking } from "@/state/api";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  CONFIRMED:   { label: "Confirmed",   bg: "bg-blue-50",    text: "text-blue-700",    icon: Clock       },
  CHECKED_IN:  { label: "Checked In",  bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle },
  CHECKED_OUT: { label: "Checked Out", bg: "bg-gray-100",   text: "text-gray-500",    icon: CheckCircle },
  CANCELLED:   { label: "Cancelled",   bg: "bg-rose-50",    text: "text-rose-700",    icon: XCircle     },
  NO_SHOW:     { label: "No Show",     bg: "bg-amber-50",   text: "text-amber-700",   icon: AlertCircle },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });

const formatGHS = (n: number) =>
  `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0 })}`;

const STATUS_FILTERS = [
  { label: "All",          value: "all"         },
  { label: "Confirmed",    value: "CONFIRMED"   },
  { label: "Checked In",   value: "CHECKED_IN"  },
  { label: "Checked Out",  value: "CHECKED_OUT" },
  { label: "Cancelled",    value: "CANCELLED"   },
  { label: "No Show",      value: "NO_SHOW"     },
];

export default function ManagerBookingsPage() {
  const { user }                          = useUser();
  const [selectedPropertyId, setPropertyId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter]   = useState("all");

  const { data: propertiesRaw } = useGetManagerPropertiesQuery(user?.id ?? "", {
    skip: !user?.id,
  });

  const properties: any[] = useMemo(() => {
    if (!propertiesRaw) return [];
    if (Array.isArray(propertiesRaw)) return propertiesRaw;
    return (propertiesRaw as any).data ?? [];
  }, [propertiesRaw]);

  const {
    bookings, todayArrivals, todayDepartures, currentGuests,
    isLoading, handleCheckIn, handleCheckOut, handleMarkNoShow,
    isCheckingIn, isCheckingOut, isMarkingNoShow, refetch,
  } = useManagerBooking(selectedPropertyId);

  const filtered = useMemo(
    () => statusFilter === "all" ? bookings : bookings.filter((b: Booking) => b.status === statusFilter),
    [bookings, statusFilter]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage short stay bookings</p>
          </div>
          <button onClick={() => refetch()} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Today stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Users,       label: "Today's Arrivals",   value: todayArrivals.length,   color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: CheckCircle, label: "Today's Departures", value: todayDepartures.length,  color: "text-blue-600",    bg: "bg-blue-50"    },
            { icon: Clock,       label: "Current Guests",     value: currentGuests.length,    color: "text-orange-600",  bg: "bg-orange-50"  },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {properties.length > 0 && (
              <select
                value={selectedPropertyId ?? ""}
                onChange={(e) => setPropertyId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="">All Properties</option>
                {properties.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <div className="flex gap-2 flex-wrap">
              {STATUS_FILTERS.map((f) => (
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

        {/* Bookings */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No bookings found</h3>
            <p className="text-sm text-gray-500">Bookings will appear once guests start booking.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((booking: Booking) => {
              const cfg  = STATUS_CFG[booking.status] ?? STATUS_CFG.CONFIRMED;
              const Icon = cfg.icon;
              return (
                <div key={booking.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {booking.property?.name ?? "Property"}
                      </p>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">
                        {booking.reference?.slice(0, 14)}...
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    <span>{formatDate(booking.checkIn)}</span>
                    <ArrowRight className="w-3 h-3 text-gray-300" />
                    <span>{formatDate(booking.checkOut)}</span>
                    <span className="ml-auto font-bold text-gray-900 text-sm">
                      {formatGHS(booking.totalAmount)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {booking.status === "CONFIRMED" && (
                      <>
                        <button
                          onClick={() => handleCheckIn(booking.id)}
                          disabled={isCheckingIn}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
                        >
                          {isCheckingIn ? "..." : "Check In"}
                        </button>
                        <button
                          onClick={() => handleMarkNoShow(booking.id)}
                          disabled={isMarkingNoShow}
                          className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40"
                        >
                          No Show
                        </button>
                      </>
                    )}
                    {booking.status === "CHECKED_IN" && (
                      <button
                        onClick={() => handleCheckOut(booking.id)}
                        disabled={isCheckingOut}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
                      >
                        {isCheckingOut ? "..." : "Check Out"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}