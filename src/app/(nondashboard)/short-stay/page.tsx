"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGetPropertiesQuery, useGetPropertyQuery } from "@/state/api";
import { useGuestBooking }    from "@/hooks/useBooking";
import { useUser }            from "@clerk/nextjs";
import BookingCalendar        from "@/components/BookingCalendar";
import PaymentStructurePicker from "@/components/PaymentStructurePicker";
import ShortStayPriceCard     from "@/components/ShortStayPriceCard";
import ListingTypeBadge       from "@/components/ListingTypeBadge";
import Image                  from "next/image";
import {
  Search, MapPin, Home, Star, Wifi, Car, Zap,
  ArrowLeft, Calendar, Users, CheckCircle,
  Loader2, Clock,
} from "lucide-react";
import type { DurationType } from "@/components/PaymentStructurePicker";

// ─────────────────────────────────────────────────────────────────────────────
//  SHORT STAY LISTING PAGE  —  /short-stay
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-2xl ${className}`} />
);

const formatGHS = (n?: number) =>
  n != null ? `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0 })}` : "—";

export default function ShortStayDetailPage() {
  const params    = useParams();
  const router    = useRouter();
  const { user }  = useUser();
  const propertyId = Number(params.id);

  const { data: property, isLoading } = useGetPropertyQuery(propertyId, { skip: !propertyId });

  const [checkIn,    setCheckIn]    = useState<string>("");
  const [checkOut,   setCheckOut]   = useState<string>("");
  const [durationType, setDurationType] = useState<DurationType>("DAILY");
  const [totalAmount, setTotalAmount]   = useState(0);
  const [isBooking,   setIsBooking]     = useState(false);
  const [booked,      setBooked]        = useState(false);

  const { handleCreate } = useGuestBooking();

  const structures = (property as any)?.paymentStructures ??
    [{ durationType: "DAILY", amount: (property as any)?.pricePerMonth ?? 200 }];

  const bookedDates: string[] = useMemo(() => {
    const bookings = (property as any)?.bookings ?? [];
    const dates: string[] = [];
    bookings.forEach((b: any) => {
      let cur = b.checkIn.split("T")[0];
      while (cur <= b.checkOut.split("T")[0]) {
        dates.push(cur);
        const d = new Date(cur);
        d.setDate(d.getDate() + 1);
        cur = d.toISOString().split("T")[0];
      }
    });
    return dates;
  }, [property]);

  const handleBook = async () => {
    if (!user) { router.push("/sign-in"); return; }
    if (!checkIn || !checkOut) return;
    setIsBooking(true);
    try {
      const result = await handleCreate({ propertyId, checkIn, checkOut, durationType });
      if (result.success) setBooked(true);
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-72" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Home className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-gray-900">Property not found</p>
          <button onClick={() => router.push("/short-stay")} className="mt-4 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700">
            Back to listings
          </button>
        </div>
      </div>
    );
  }

  const p = property as any;

  if (booked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center max-w-sm w-full shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your booking for {p.name} has been confirmed. Check your bookings page for details.
          </p>
          <button onClick={() => router.push("/tenants/bookings")} className="w-full py-3 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors">
            View My Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => router.push("/short-stay")}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to listings
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Photos */}
            <div className="relative h-72 bg-gray-100 rounded-2xl overflow-hidden">
              {p.photoUrls?.[0] ? (
                <Image src={p.photoUrls[0]} alt={p.name} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Home className="w-16 h-16 text-gray-300" />
                </div>
              )}
              <div className="absolute top-4 left-4">
                <ListingTypeBadge type="SHORT_STAY" />
              </div>
            </div>

            {/* Info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h1 className="text-xl font-bold text-gray-900 mb-2">{p.name}</h1>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                <MapPin className="w-4 h-4" />
                {p.location?.address ?? p.location?.city}, {p.location?.region}
              </div>
              {p.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{p.description}</p>
              )}
            </div>

            {/* Amenities */}
            {(p.amenities?.length ?? 0) > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {p.amenities.map((a: string) => (
                    <span key={a} className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg font-medium">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar */}
            <BookingCalendar
              bookedDates={bookedDates}
              checkIn={checkIn}
              checkOut={checkOut}
              onSelect={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
            />
          </div>

          {/* Right — booking */}
          <div className="space-y-4">
            <ShortStayPriceCard
              propertyId={p.id}
              structures={structures}
              onBook={(type) => setDurationType(type)}
            />

            {checkIn && checkOut && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Confirm Booking</h3>
                <PaymentStructurePicker
                  structures={structures}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onSelect={(s) => {
                    setDurationType(s.durationType);
                    setTotalAmount(s.totalAmount);
                  }}
                />
                <button
                  onClick={handleBook}
                  disabled={isBooking || !checkIn || !checkOut}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
                >
                  {isBooking
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Booking...</>
                    : <><Calendar className="w-4 h-4" /> Confirm Booking</>
                  }
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Payment collected at property
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}