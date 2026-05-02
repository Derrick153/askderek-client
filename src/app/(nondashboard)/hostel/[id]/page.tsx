"use client";

import { useState, useMemo }          from "react";
import { useParams, useRouter }        from "next/navigation";
import {
  useGetPropertiesQuery,
  useGetPropertyQuery,
  useGetAllSchoolsQuery,
  useCreateSemesterBookingMutation,
  useVerifyReceiptQuery,
} from "@/state/api";
import { useUser }              from "@clerk/nextjs";
import HostelRoomCard           from "@/components/HostelRoomCard";
import SchoolSemesterCard       from "@/components/SchoolSemesterCard";
import ListingTypeBadge         from "@/components/ListingTypeBadge";
import Image                    from "next/image";
import {
  Search, MapPin, Home, GraduationCap,
  ArrowLeft, CheckCircle, Loader2,
  ShieldCheck, XCircle, AlertCircle,
  Calendar, RefreshCw,
} from "lucide-react";
import type { HostelRoom } from "@/components/HostelRoomCard";
import type { School }     from "@/state/api";

// ─────────────────────────────────────────────────────────────────────────────
//  HOSTEL LISTING PAGE  —  /hostel
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-2xl ${className}`} />
);

const formatGHS = (n?: number) =>
  n != null ? `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0 })}` : "—";

export default function HostelListingPage() {
  const router  = useRouter();
  const [search, setSearch] = useState("");

  const { data: propsRaw, isLoading } = useGetPropertiesQuery({ propertyType: "HOSTEL" } as any);

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
      <div className="bg-gradient-to-br from-amber-900 to-amber-800 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black mb-3">Student Hostels in Ghana</h1>
          <p className="text-amber-300 text-sm mb-8">
            Find affordable hostel accommodation near KNUST, UMAT, UG, UCC and more
          </p>
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by hostel name or university town..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 text-sm bg-white text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500 mb-6">
          <span className="font-bold text-gray-900">{filtered.length}</span> hostels found
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-20 text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No hostels found</h3>
            <p className="text-sm text-gray-500">Try a different search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p: any) => (
              <div
                key={p.id}
                onClick={() => router.push(`/hostel/${p.id}`)}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="relative h-48 bg-gray-100">
                  {p.photoUrls?.[0] ? (
                    <Image src={p.photoUrls[0]} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <GraduationCap className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <ListingTypeBadge type="HOSTEL" size="sm" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate mb-1">{p.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    <MapPin className="w-3 h-3" />
                    {p.location?.city}, {p.location?.region}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-black text-amber-600">
                        {formatGHS(p.pricePerMonth)}
                      </p>
                      <p className="text-xs text-gray-400">per semester</p>
                    </div>
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
                      Hostel
                    </span>
                  </div>
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
//  HOSTEL DETAIL PAGE  —  /hostel/[id]
// ─────────────────────────────────────────────────────────────────────────────