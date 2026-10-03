"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useGetStudentBookingsQuery } from "@/state/api";
import { ArrowLeft, Building2, Layers, DoorClosed, BedDouble } from "lucide-react";

const NAVY = "#0F1B2E";
const ORANGE = "#E85D2C";

function HierarchyStep({ icon: Icon, label, value, isLast }: { icon: any; label: string; value: string; isLast?: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: isLast ? ORANGE : "#F0EDE7" }}>
          <Icon className="w-4.5 h-4.5" style={{ color: isLast ? "#FFFFFF" : NAVY }} />
        </div>
        {!isLast && <div className="w-px flex-1 my-1" style={{ backgroundColor: "#E5E1DA", minHeight: "24px" }} />}
      </div>
      <div className="pb-6">
        <p className="text-xs font-medium text-[#8B8680] mb-0.5">{label}</p>
        <p className={isLast ? "text-lg font-bold" : "text-base font-semibold"} style={{ color: isLast ? ORANGE : NAVY }}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default function RoomBedPage() {
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

  const room = booking.bed?.room;
  const capacity = room?.capacity;

  return (
    <div className="min-h-screen bg-[#F7F7FA]">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href={"/tenants/bookings/" + bookingId} className="inline-flex items-center gap-1.5 text-sm text-[#8B8680] hover:text-[#0B1229] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to booking
        </Link>

        <h1 className="text-xl font-semibold text-[#0B1229] mb-1">My Room &amp; Bed</h1>
        <p className="text-sm text-[#8B8680] mb-8">Your exact location at {booking.property?.name ?? "your hostel"}</p>

        <div className="bg-white rounded-3xl shadow-lg shadow-black/[0.05] p-8">
          <HierarchyStep icon={Building2} label="Hostel" value={booking.property?.name ?? "Hostel"} />
          {room?.block && <HierarchyStep icon={Layers} label="Block" value={room.block} />}
          {room?.floor && <HierarchyStep icon={Layers} label="Floor" value={room.floor} />}
          <HierarchyStep icon={DoorClosed} label="Room" value={booking.roomNumber ?? room?.roomNumber ?? "-"} />
          <HierarchyStep icon={BedDouble} label="Your Bed" value={"Bed " + (booking.bed?.bedNumber ?? "-")} isLast />
        </div>

        {capacity ? (
          <div className="mt-4 bg-white rounded-2xl p-5 text-sm text-[#8B8680] text-center">
            This room has {capacity} bed{capacity === 1 ? "" : "s"} in total.
          </div>
        ) : null}
      </div>
    </div>
  );
}