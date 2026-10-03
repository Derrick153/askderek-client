"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useGetStudentBookingsQuery, useGetBookingTimelineQuery } from "@/state/api";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";

const NAVY = "#0F1B2E";
const ORANGE = "#E85D2C";

const EVENT_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Booking submitted",
  AWAITING_PAYMENT: "Approved by manager",
  ACTIVE: "Payment confirmed",
  REJECTED: "Booking rejected",
  CANCELLED: "Booking cancelled",
  EXPIRED: "Payment deadline expired",
  COMPLETED: "Stay completed",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function JourneyPage() {
  const params = useParams();
  const bookingId = Number(params.id);

  const { data: bookings, isLoading: loadingBooking } = useGetStudentBookingsQuery();
  const booking = bookings?.find((b) => b.id === bookingId);

  const { data: timelineData, isLoading: loadingTimeline } = useGetBookingTimelineQuery(bookingId, { skip: !bookingId });
  const events = timelineData?.events ?? [];

  const isLoading = loadingBooking || loadingTimeline;

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

  type Point = { label: string; date: string; note?: string; done: boolean };
  const points: Point[] = [];

  points.push({ label: "Booking submitted", date: booking.createdAt, done: true });

  events.forEach((e: any) => {
    points.push({
      label: EVENT_LABEL[e.toStatus] ?? e.toStatus,
      date: e.createdAt,
      note: e.reason ?? undefined,
      done: true,
    });
  });

  if (booking.checkedInAt) {
    points.push({ label: "Checked in", date: booking.checkedInAt, done: true });
  }
  if (booking.actualEndDate) {
    points.push({ label: "Checked out", date: booking.actualEndDate, done: true });
  }

  return (
    <div className="min-h-screen bg-[#F7F7FA]">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href={"/tenants/bookings/" + bookingId} className="inline-flex items-center gap-1.5 text-sm text-[#8B8680] hover:text-[#0B1229] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to booking
        </Link>

        <h1 className="text-xl font-semibold text-[#0B1229] mb-1">Accommodation Journey</h1>
        <p className="text-sm text-[#8B8680] mb-8">{booking.property?.name ?? "Your booking"} - {booking.reference}</p>

        <div className="bg-white rounded-3xl shadow-lg shadow-black/[0.05] p-8">
          {points.length === 0 ? (
            <p className="text-sm text-[#8B8680]">No events recorded yet.</p>
          ) : (
            <div>
              {points.map((point, i) => {
                const isLast = i === points.length - 1;
                return (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: isLast ? ORANGE : "#E8F7EF" }}>
                        {isLast ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" style={{ color: "#1D9A6C" }} />
                        )}
                      </div>
                      {!isLast && <div className="w-px flex-1 my-1" style={{ backgroundColor: "#E5E1DA", minHeight: "28px" }} />}
                    </div>
                    <div className="pb-7">
                      <p className="text-sm font-semibold" style={{ color: NAVY }}>{point.label}</p>
                      <p className="text-xs text-[#8B8680] mt-0.5">{formatDateTime(point.date)}</p>
                      {point.note && <p className="text-xs text-[#8B8680] mt-1">{point.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}