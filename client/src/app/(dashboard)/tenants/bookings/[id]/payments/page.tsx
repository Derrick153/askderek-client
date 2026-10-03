"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useGetStudentBookingsQuery, useGetBookingPaymentsQuery } from "@/state/api";
import { ArrowLeft, Receipt, CheckCircle2 } from "lucide-react";

const NAVY = "#0F1B2E";
const ORANGE = "#E85D2C";

function formatGHS(n: number) {
  return "GH" + String.fromCharCode(8373) + n.toLocaleString("en-GH");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

export default function PaymentCenterPage() {
  const params = useParams();
  const bookingId = Number(params.id);

  const { data: bookings, isLoading: loadingBooking } = useGetStudentBookingsQuery();
  const booking = bookings?.find((b) => b.id === bookingId);

  const { data: payments, isLoading: loadingPayments } = useGetBookingPaymentsQuery(bookingId, { skip: !bookingId });

  const isLoading = loadingBooking || loadingPayments;

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

  const totalCost = booking.amountPaid;
  const paidSoFar = (payments ?? []).filter((p) => p.paymentStatus === "Paid").reduce((sum, p) => sum + p.amountPaid, 0);
  const outstanding = Math.max(0, totalCost - paidSoFar);

  return (
    <div className="min-h-screen bg-[#F7F7FA]">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href={"/tenants/bookings/" + bookingId} className="inline-flex items-center gap-1.5 text-sm text-[#8B8680] hover:text-[#0B1229] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to booking
        </Link>

        <h1 className="text-xl font-semibold text-[#0B1229] mb-1">Payment Center</h1>
        <p className="text-sm text-[#8B8680] mb-8">{booking.property?.name ?? "Your booking"}</p>

        <div className="bg-white rounded-3xl shadow-lg shadow-black/[0.05] p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-[#8B8680] mb-1">Total cost</p>
              <p className="text-lg font-bold tabular-nums text-[#0B1229]">{formatGHS(totalCost)}</p>
            </div>
            <div>
              <p className="text-xs text-[#8B8680] mb-1">Paid</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: "#1D9A6C" }}>{formatGHS(paidSoFar)}</p>
            </div>
            <div>
              <p className="text-xs text-[#8B8680] mb-1">Outstanding</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: outstanding > 0 ? ORANGE : "#8B8680" }}>{formatGHS(outstanding)}</p>
            </div>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-[#0B1229] mb-3">Receipts</h2>

        {(!payments || payments.length === 0) ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <Receipt className="w-8 h-8 text-[#B5B0A8] mx-auto mb-3" />
            <p className="text-sm text-[#8B8680]">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" style={{ color: payment.paymentStatus === "Paid" ? "#1D9A6C" : "#8B8680" }} />
                    <span className="text-sm font-semibold text-[#0B1229]">{payment.paymentStatus}</span>
                  </div>
                  <span className="text-lg font-bold tabular-nums" style={{ color: NAVY }}>{formatGHS(payment.amountPaid)}</span>
                </div>
                <div className="space-y-1 text-xs text-[#8B8680]">
                  <p>Date: {payment.paymentDate ? formatDate(payment.paymentDate) : formatDate(payment.createdAt)}</p>
                  {payment.paystackReference && <p className="font-mono">Ref: {payment.paystackReference}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}