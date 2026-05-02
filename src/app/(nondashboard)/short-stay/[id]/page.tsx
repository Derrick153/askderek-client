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

export default function ShortStayListingPage() {
  const router  = useRouter();
  const [search, setSearch] = useState("");

  const { data: propsRaw, isLoading } = useGetPropertiesQuery({ propertyType: "SHORT_STAY" } as any);

  const properties: any[] = useMemo(() => {
    if (!propsRaw) return [];
    if (Array.isArray(propsRaw)) return propsRaw;
    return (propsRaw as any).data ?? [];
  }, [propsRaw]);

  const filtered = properties.filter((p: any) =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.location?.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-900 to-violet-800 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="w-14 h-14 bg-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black mb-3">Short Stay in Ghana</h1>
          <p className="text-violet-300 text-sm mb-8">
            Book by the hour, night, week or month — flexible stays across Ghana
          </p>
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 text-sm bg-white text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500 mb-6">
          <span className="font-bold text-gray-900">{filtered.length}</span> short stays found
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-20 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No short stays found</h3>
            <p className="text-sm text-gray-500">Try a different search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p: any) => (
              <div
                key={p.id}
                onClick={() => router.push(`/short-stay/${p.id}`)}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="relative h-48 bg-gray-100">
                  {p.photoUrls?.[0] ? (
                    <Image src={p.photoUrls[0]} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Home className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <ListingTypeBadge type="SHORT_STAY" size="sm" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate mb-1">{p.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    <MapPin className="w-3 h-3" />
                    {p.location?.city}, {p.location?.region}
                  </div>
                  <ShortStayPriceCard
                    propertyId={p.id}
                    structures={p.paymentStructures ?? [{ durationType: "DAILY", amount: p.pricePerMonth ?? 200 }]}
                    className="border-0 p-0 shadow-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SHORT STAY DETAIL PAGE  —  /short-stay/[id]
// ─────────────────────────────────────────────────────────────────────────────