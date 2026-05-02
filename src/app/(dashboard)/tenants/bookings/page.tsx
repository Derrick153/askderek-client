"use client";

import { useUser }         from "@clerk/nextjs";
import { useGuestBooking } from "@/hooks/useBooking";
import {
  Calendar, CheckCircle, Clock, XCircle,
  AlertCircle, ArrowRight, RefreshCw, MapPin,
} from "lucide-react";
import type { Booking } from "@/state/api";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  CONFIRMED:   { label: "Confirmed",   icon: Clock,        bg: "bg-blue-50",    text: "text-blue-700"    },
  CHECKED_IN:  { label: "Checked In",  icon: CheckCircle,  bg: "bg-emerald-50", text: "text-emerald-700" },
  CHECKED_OUT: { label: "Checked Out", icon: CheckCircle,  bg: "bg-gray-100",   text: "text-gray-500"    },
  CANCELLED:   { label: "Cancelled",   icon: XCircle,      bg: "bg-rose-50",    text: "text-rose-700"    },
  NO_SHOW:     { label: "No Show",     icon: AlertCircle,  bg: "bg-amber-50",   text: "text-amber-700"   },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });

const formatGHS = (n: number) =>
  `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0 })}`;

function BookingCard({ booking, onCancel, isCancelling }: { booking: Booking; onCancel: (id: number) => void; isCancelling: boolean }) {
  const cfg  = STATUS_CFG[booking.status] ?? STATUS_CFG.CONFIRMED;
  const Icon = cfg.icon;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{booking.property?.name ?? "Property"}</p>
          {booking.property?.location && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <MapPin className="w-3 h-3" />
              {booking.property.location.city}, {booking.property.location.region}
            </div>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(booking.checkIn)}</span>
        <ArrowRight className="w-3 h-3 text-gray-300" />
        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(booking.checkOut)}</span>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-400">{booking.durationType}</p>
          <p className="text-sm font-bold text-gray-900">{formatGHS(booking.totalAmount)}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-mono text-gray-400">{booking.reference?.slice(0, 12)}...</p>
          {booking.status === "CONFIRMED" && (
            <button
              onClick={() => onCancel(booking.id)}
              disabled={isCancelling}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TenantBookingsPage() {
  const {
    bookings, upcomingBookings, pastBookings, activeBooking,
    isLoading, handleCancel, isCancelling, refetch,
  } = useGuestBooking();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your short stay and hostel bookings</p>
          </div>
          <button onClick={() => refetch()} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Upcoming",  value: upcomingBookings.length, color: "text-blue-600",    bg: "bg-blue-50"    },
            { label: "Active",    value: activeBooking ? 1 : 0,   color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Completed", value: pastBookings.length,     color: "text-gray-600",    bg: "bg-gray-100"   },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {activeBooking && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-emerald-800">Currently Checked In</h3>
            </div>
            <p className="text-sm text-emerald-700 font-semibold">{activeBooking.property?.name ?? "Property"}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Check-out: {formatDate(activeBooking.checkOut)}</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No bookings yet</h3>
            <p className="text-sm text-gray-500">Browse short stay and hostel properties to make your first booking.</p>
          </div>
        ) : (
          <>
            {upcomingBookings.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-4">Upcoming ({upcomingBookings.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingBookings.map((b: Booking) => (
                    <BookingCard key={b.id} booking={b} onCancel={handleCancel} isCancelling={isCancelling} />
                  ))}
                </div>
              </div>
            )}
            {pastBookings.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-4">Past Bookings ({pastBookings.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pastBookings.map((b: Booking) => (
                    <BookingCard key={b.id} booking={b} onCancel={handleCancel} isCancelling={isCancelling} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}