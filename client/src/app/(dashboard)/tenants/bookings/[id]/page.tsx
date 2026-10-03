"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useGetStudentBookingsQuery } from "@/state/api";
import { ArrowLeft, MapPin, GraduationCap, BedDouble, Calendar, AlertCircle, Clock } from "lucide-react";

const NAVY = "#0F1B2E";
const ORANGE = "#E85D2C";

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Pending approval",
  AWAITING_PAYMENT: "Awaiting payment",
  ACTIVE: "Active",
  EXTENDED: "Active",
  EXPIRING: "Expiring soon",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  COMPLETED: "Completed",
};

function formatGHS(n: number) {
  return "GH" + String.fromCharCode(8373) + n.toLocaleString("en-GH");
}

function getActionRequired(booking: any): { label: string; detail?: string } | null {
  if (booking.status === "AWAITING_PAYMENT") {
    const deadline = booking.paymentDueAt
      ? new Date(booking.paymentDueAt).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      : undefined;
    return { label: "Payment required", detail: deadline ? "Complete payment by " + deadline : undefined };
  }
  if (booking.status === "PENDING_APPROVAL") {
    return { label: "Awaiting manager approval", detail: "You will be notified once your hostel reviews your booking." };
  }
  if (booking.status === "ACTIVE" && !booking.checkedInAt) {
    const daysToCheckIn = Math.ceil((new Date(booking.checkIn).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToCheckIn <= 3 && daysToCheckIn >= 0) {
      return { label: "Check-in approaching", detail: daysToCheckIn === 0 ? "Check-in is today." : "Check-in in " + daysToCheckIn + " day" + (daysToCheckIn === 1 ? "" : "s") + "." };
    }
  }
  return null;
}
export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = Number(params.id);

  const { data: bookings, isLoading } = useGetStudentBookingsQuery();
  const booking = bookings?.find((b) => b.id === bookingId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7FA] flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-[#0B1229] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#F7F7FA] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#0B1229] mb-2">Booking not found</p>
          <Link href="/tenants/bookings" className="text-sm font-medium text-[#0F1B2E] hover:text-[#E85D2C]">
            Back to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const statusLabel = STATUS_LABEL[booking.status] ?? booking.status;
  const action = getActionRequired(booking);

  return (
    <div className="min-h-screen bg-[#F7F7FA]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/tenants/bookings" className="inline-flex items-center gap-1.5 text-sm text-[#8B8680] hover:text-[#0B1229] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          My Bookings
        </Link>

        <div className="rounded-3xl overflow-hidden shadow-lg shadow-black/[0.06]" style={{ backgroundColor: NAVY }}>
          <div className="p-8">
            <p className="text-sm font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              {statusLabel}
            </p>
            <h1 className="text-2xl font-semibold text-white mb-4">{booking.property?.name ?? "Hostel"}</h1>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5 text-white/70">
                <MapPin className="w-3.5 h-3.5" />
                {booking.property?.location?.city ?? "Ghana"}
              </span>
              <span className="flex items-center gap-1.5 text-white/70">
                <GraduationCap className="w-3.5 h-3.5" />
                {booking.semesterName}
              </span>
              <span className="flex items-center gap-1.5 text-white/70">
                <BedDouble className="w-3.5 h-3.5" />
                Room {booking.roomNumber ?? "-"}{booking.bed?.bedNumber ? " / Bed " + booking.bed.bedNumber : ""}
              </span>
              <span className="flex items-center gap-1.5 text-white/70">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(booking.checkIn).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>

            <div className="mt-6 pt-6 flex items-baseline gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-sm text-white/50">Price</span>
              <span className="text-2xl font-bold tabular-nums" style={{ color: ORANGE }}>
                {formatGHS(booking.amountPaid)}
              </span>
            </div>
          </div>
        </div>

        {action && (
          <div className="mt-4 bg-white rounded-2xl p-5 flex items-start gap-3 shadow-sm border border-[#F0EDE7]">
            <div className="w-8 h-8 rounded-lg bg-[#FDEEE8] flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-[#E85D2C]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0B1229]">{action.label}</p>
              {action.detail && <p className="text-xs text-[#8B8680] mt-0.5">{action.detail}</p>}
            </div>
          </div>
        )}
<div className="mt-4 bg-white rounded-2xl p-5 shadow-sm border border-[#F0EDE7]">
          <p className="text-xs font-bold text-[#8B8680] uppercase tracking-wide mb-4">Check-in &amp; Check-out</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#8B8680] mb-1">Check-in</p>
              {booking.checkedInAt ? (
                <p className="text-sm font-semibold" style={{ color: "#1D9A6C" }}>
                  Checked in - {new Date(booking.checkedInAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              ) : (
                <p className="text-sm font-semibold text-[#0B1229]">
                  Expected {new Date(booking.checkIn).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-[#8B8680] mb-1">Check-out</p>
              {booking.actualEndDate ? (
                <p className="text-sm font-semibold" style={{ color: "#1D9A6C" }}>
                  Checked out - {new Date(booking.actualEndDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              ) : booking.closingType === "FIXED" && booking.fixedEndDate ? (
                <p className="text-sm font-semibold text-[#0B1229]">
                  Expected {new Date(booking.fixedEndDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              ) : (
                <p className="text-sm text-[#8B8680]">Not yet set</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}