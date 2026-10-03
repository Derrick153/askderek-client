"use client";

import { useState } from "react";

import { useUser }         from "@clerk/nextjs";
import { useGuestBooking } from "@/hooks/useBooking";
import { useGetStudentBookingsQuery, type SemesterPlan, useInitializeHostelPaymentMutation, useCancelHostelBookingMutation, useGetBookingTimelineQuery } from "@/state/api";
import {
  Calendar, CheckCircle, Clock, XCircle,
  AlertCircle, ArrowRight, RefreshCw, MapPin,
  GraduationCap, BedDouble,
} from "lucide-react";
import type { Booking } from "@/state/api";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  CONFIRMED:        { label: "Confirmed",        icon: Clock,        bg: "bg-blue-50",    text: "text-blue-700"    },
  CHECKED_IN:       { label: "Checked In",       icon: CheckCircle,  bg: "bg-emerald-50", text: "text-emerald-700" },
  CHECKED_OUT:      { label: "Checked Out",      icon: CheckCircle,  bg: "bg-gray-100",   text: "text-gray-500"    },
  CANCELLED:        { label: "Cancelled",        icon: XCircle,      bg: "bg-rose-50",    text: "text-rose-700"    },
  NO_SHOW:          { label: "No Show",          icon: AlertCircle,  bg: "bg-amber-50",   text: "text-amber-700"   },
  PENDING_APPROVAL: { label: "Pending Approval", icon: Clock,        bg: "bg-amber-50",   text: "text-amber-700"   },
  AWAITING_PAYMENT: { label: "Awaiting Payment", icon: Clock, bg: "bg-orange-50", text: "text-orange-700" },
  ACTIVE:           { label: "Confirmed",        icon: CheckCircle,  bg: "bg-emerald-50", text: "text-emerald-700" },
  REJECTED:         { label: "Rejected",         icon: XCircle,      bg: "bg-rose-50",    text: "text-rose-700"    },
  EXPIRING:         { label: "Expiring Soon",    icon: AlertCircle,  bg: "bg-amber-50",   text: "text-amber-700"   },
  EXPIRED:          { label: "Expired",          icon: XCircle,      bg: "bg-gray-100",   text: "text-gray-500"    },
  EXTENDED:         { label: "Extended",         icon: CheckCircle,  bg: "bg-blue-50",    text: "text-blue-700"    },
  COMPLETED:        { label: "Completed",        icon: CheckCircle,  bg: "bg-gray-100",   text: "text-gray-500"    },
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

const TIMELINE_EVENT_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Submitted, awaiting approval",
  AWAITING_PAYMENT: "Approved - payment required",
  ACTIVE:           "Payment confirmed - active",
  REJECTED:         "Rejected",
  CANCELLED:        "Cancelled",
  EXPIRED:          "Expired - payment deadline passed",
  COMPLETED:        "Completed",
};

function formatTimelineDate(iso: string) {
  return new Date(iso).toLocaleString("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function BookingTimeline({ bookingId }: { bookingId: number }) {
  const { data, isLoading } = useGetBookingTimelineQuery(bookingId);
  const events = data?.events ?? [];

  if (isLoading) {
    return <p className="text-xs text-gray-400 py-2">Loading timeline...</p>;
  }

  if (events.length === 0) {
    return <p className="text-xs text-gray-400 py-2">No transitions recorded yet for this booking.</p>;
  }

  return (
    <div className="space-y-2 py-2">
      {events.map((e) => (
        <div key={e.id} className="flex items-start gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900">{TIMELINE_EVENT_LABEL[e.toStatus] ?? e.toStatus}</p>
            <p className="text-xs text-gray-400">{formatTimelineDate(e.createdAt)} - {e.actorName}</p>
            {e.reason && <p className="text-xs text-gray-500 mt-0.5">{e.reason}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
function HostelBookingCard({
  booking,
  onContinuePayment,
  onCancel,
  isProcessing,
}: {
  booking: SemesterPlan;
  onContinuePayment: (booking: SemesterPlan) => void;
  onCancel: (booking: SemesterPlan) => void;
  isProcessing: boolean;
}) {
  const cfg  = STATUS_CFG[booking.status] ?? STATUS_CFG.PENDING_APPROVAL;
  const Icon = cfg.icon;
  const canCancel = booking.status === "PENDING_APPROVAL" || booking.status === "AWAITING_PAYMENT";
  const needsPayment = booking.status === "AWAITING_PAYMENT";
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{booking.property?.name ?? "Hostel"}</p>
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

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
        <span className="flex items-center gap-1">
          <BedDouble className="w-3.5 h-3.5" />
          {booking.roomNumber ? `Room ${booking.roomNumber}` : "Room -"}
          {booking.bed?.bedNumber ? ` - Bed ${booking.bed.bedNumber}` : ""}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
        <span className="flex items-center gap-1">
          <GraduationCap className="w-3.5 h-3.5" />
          {booking.semesterName}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          Check-in {formatDate(booking.checkIn)}
        </span>
      </div>

      {booking.status === "REJECTED" && (
        <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 mb-3 text-xs text-rose-600">
          This booking was not approved by the hostel manager.
        </div>
      )}

      {booking.status === "CANCELLED" && booking.cancellationReason && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 text-xs text-gray-600">
          Cancelled: {booking.cancellationReason}
        </div>
      )}

      {needsPayment && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-3 text-xs text-orange-700">
          Approved! Complete payment{booking.paymentDueAt ? ` before ${formatDate(booking.paymentDueAt)}` : ""} to secure your bed.
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <p className="text-sm font-bold text-gray-900">{formatGHS(booking.amountPaid)}</p>
        <p className="text-xs font-mono text-gray-400">{booking.reference?.slice(0, 12)}...</p>
      </div>

      {(needsPayment || canCancel) && (
        <div className="flex items-center gap-2 mt-3">
          {needsPayment && (
            <button
              onClick={() => onContinuePayment(booking)}
              disabled={isProcessing}
              className="flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
            >
              Continue Payment
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(booking)}
              disabled={isProcessing}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      <button
        onClick={() => setShowTimeline(!showTimeline)}
        className="text-xs font-semibold text-gray-400 hover:text-gray-600 mt-2 transition-colors"
      >
        {showTimeline ? "Hide timeline" : "View timeline"}
      </button>
      {showTimeline && <BookingTimeline bookingId={booking.id} />}
    </div>
  );
}
export default function TenantBookingsPage() {
  const {
    bookings, upcomingBookings, pastBookings, activeBooking,
    isLoading, handleCancel, isCancelling, refetch,
  } = useGuestBooking();

  const { user } = useUser();
  const [initializeHostelPayment, { isLoading: isInitializingPayment }] = useInitializeHostelPaymentMutation();
  const [cancelHostelBooking, { isLoading: isCancellingHostel }] = useCancelHostelBookingMutation();

  const handleContinuePayment = async (booking: SemesterPlan) => {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) return;
    const result: any = await initializeHostelPayment({ bookingId: booking.id, email });
    if (result?.data?.authorization_url) {
      window.location.href = result.data.authorization_url;
    }
  };

  const handleCancelHostel = async (booking: SemesterPlan) => {
    const reason = window.prompt("Please tell us why you are cancelling this booking:");
    if (!reason || reason.trim().length < 3) return;
    await cancelHostelBooking({ bookingId: booking.id, reason: reason.trim() });
  };

  const {
    data: hostelBookingsRaw,
    isLoading: loadingHostelBookings,
    error: hostelError,
    refetch: refetchHostel,
  } = useGetStudentBookingsQuery();

  const hostelBookings: SemesterPlan[] = [...(hostelBookingsRaw ?? [])].sort(
    (a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()
  );

  const hasAnyBookings = bookings.length > 0 || hostelBookings.length > 0;

  const HISTORY_STATUSES = ["COMPLETED", "EXPIRED", "REJECTED", "CANCELLED"];
  const hostelHistoryBookings = hostelBookings.filter((b) => HISTORY_STATUSES.includes(b.status));
  const hostelActiveBookings = hostelBookings.filter((b) => !HISTORY_STATUSES.includes(b.status));
  const hostelUpcomingBookings = hostelActiveBookings.filter((b) => new Date(b.checkIn).getTime() > Date.now());
  const hostelCurrentBookings = hostelActiveBookings.filter((b) => new Date(b.checkIn).getTime() <= Date.now());
  const uniqueHostelCount = new Set(hostelBookings.map((b) => b.property?.name).filter(Boolean)).size;
  const lifetimePaidHostel = hostelBookings.filter((b) => b.status !== "REJECTED" && b.status !== "CANCELLED").reduce((sum, b) => sum + (b.amountPaid || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your short stay and hostel bookings</p>
          </div>
          <button
            onClick={() => { refetch(); refetchHostel(); }}
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Upcoming",  value: upcomingBookings.length + hostelBookings.filter(b => b.status === "PENDING_APPROVAL").length, color: "text-blue-600",    bg: "bg-blue-50"    },
            { label: "Active",    value: (activeBooking ? 1 : 0) + hostelBookings.filter(b => b.status === "ACTIVE").length,   color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Completed", value: pastBookings.length + hostelBookings.filter(b => b.status === "COMPLETED" || b.status === "EXPIRED").length,     color: "text-gray-600",    bg: "bg-gray-100"   },
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
        ) : bookings.length === 0 ? null : (
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

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Accommodation Profile</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-gray-900">{hostelBookings.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total bookings</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{uniqueHostelCount}</p>
              <p className="text-xs text-gray-500 mt-1">{uniqueHostelCount === 1 ? "Hostel" : "Hostels"}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-orange-600">GH{String.fromCharCode(8373)}{lifetimePaidHostel.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Lifetime paid</p>
            </div>

            <div>
              <p className="text-2xl font-black text-emerald-600">{hostelCurrentBookings.length}</p>
              <p className="text-xs text-gray-500 mt-1">Current</p>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-600">{hostelUpcomingBookings.length}</p>
              <p className="text-xs text-gray-500 mt-1">Upcoming</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-600">{hostelHistoryBookings.length}</p>
              <p className="text-xs text-gray-500 mt-1">History</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Hostel Bookings {hostelBookings.length > 0 && `(${hostelBookings.length})`}
          </h2>
          {loadingHostelBookings ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : hostelError ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
              <p className="text-sm text-rose-600 font-semibold mb-3">Couldn't load your hostel bookings.</p>
              <button
                onClick={() => refetchHostel()}
                className="px-4 py-2 bg-white border border-rose-200 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : hostelBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">No hostel bookings yet</h3>
              <p className="text-sm text-gray-500">Browse hostel properties to book a bed for the semester.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {hostelCurrentBookings.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Current</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hostelCurrentBookings.map((b) => (
                      <HostelBookingCard
                        key={b.id}
                        booking={b}
                        onContinuePayment={handleContinuePayment}
                        onCancel={handleCancelHostel}
                        isProcessing={isInitializingPayment || isCancellingHostel}
                      />
                    ))}
                  </div>
                </div>
              )}

              {hostelUpcomingBookings.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Upcoming</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hostelUpcomingBookings.map((b) => (
                      <HostelBookingCard
                        key={b.id}
                        booking={b}
                        onContinuePayment={handleContinuePayment}
                        onCancel={handleCancelHostel}
                        isProcessing={isInitializingPayment || isCancellingHostel}
                      />
                    ))}
                  </div>
                </div>
              )}

              {hostelHistoryBookings.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">History ({hostelHistoryBookings.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hostelHistoryBookings.map((b) => (
                      <HostelBookingCard
                        key={b.id}
                        booking={b}
                        onContinuePayment={handleContinuePayment}
                        onCancel={handleCancelHostel}
                        isProcessing={isInitializingPayment || isCancellingHostel}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!hasAnyBookings && !isLoading && !loadingHostelBookings && (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No bookings yet</h3>
            <p className="text-sm text-gray-500">Browse short stay and hostel properties to make your first booking.</p>
          </div>
        )}
      </div>
    </div>
  );
}
