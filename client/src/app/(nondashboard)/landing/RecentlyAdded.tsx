"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Bed, Bath, ArrowRight, Clock } from "lucide-react";
import { useGetPropertiesQuery } from "@/state/api";
import { Property } from "@/types/prismaTypes";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function formatPrice(price: number, type: string): string {
  const formatted = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(price);
  const isMonthly = !["sale", "Sale", "land", "Land"].includes(type);
  return isMonthly ? `${formatted}/mo` : formatted;
}

function timeAgo(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
}

/* ─────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="w-[100px] h-[100px] flex-shrink-0 rounded-xl bg-gray-100 animate-pulse" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
        <div className="flex gap-2">
          <div className="h-3 bg-gray-100 rounded animate-pulse w-14" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-14" />
        </div>
        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RECENTLY ADDED CARD
───────────────────────────────────────────── */
function RecentCard({ property }: { property: Property }) {
  const [imgError, setImgError] = useState(false);

  const photo = property.photoUrls?.[0];
  const location = property.location as any;
  const locationStr = [location?.area, location?.city].filter(Boolean).join(", ");
  const isLand = property.propertyType.toLowerCase() === "land";
  const posted = (property as any).postedDate ?? (property as any).createdAt;

  return (
    <Link
      href={`/search/${property.id}`}
      className="
        group flex gap-4 p-4
        rounded-2xl border border-gray-100 bg-white
        shadow-sm hover:shadow-lg
        transition-all duration-200 hover:-translate-y-0.5
      "
    >
      {/* Thumbnail */}
      <div className="relative w-[100px] h-[100px] flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
        {photo && !imgError ? (
          <Image
            src={photo}
            alt={property.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
            sizes="100px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-gray-100">
            <span className="text-2xl">🏠</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 py-0.5">
        {/* Name */}
        <h3 className="text-[14px] font-bold text-gray-900 truncate group-hover:text-orange-600 transition-colors mb-1">
          {property.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 mb-2">
          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="text-[12px] text-gray-500 truncate">{locationStr}</span>
        </div>

        {/* Beds / Baths */}
        {!isLand && (
          <div className="flex items-center gap-3 mb-2">
            {property.beds > 0 && (
              <span className="flex items-center gap-1 text-[12px] text-gray-500">
                <Bed className="w-3 h-3 text-gray-400" />
                {property.beds} bd
              </span>
            )}
            {property.baths > 0 && (
              <span className="flex items-center gap-1 text-[12px] text-gray-500">
                <Bath className="w-3 h-3 text-gray-400" />
                {property.baths} ba
              </span>
            )}
          </div>
        )}

        {/* Price + time ago */}
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-extrabold text-orange-600">
            {formatPrice(property.pricePerMonth, property.propertyType)}
          </p>
          {posted && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Clock className="w-3 h-3" />
              {timeAgo(posted)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────
   RECENTLY ADDED
   Place at: src/app/(nondashboard)/landing/RecentlyAdded.tsx
   Import in page.tsx after ExploreCategories
───────────────────────────────────────────── */
export default function RecentlyAdded() {
  const { data: properties, isLoading, isError } = useGetPropertiesQuery({});

  // API already returns DESC by postedDate — take last 3
  const recent = properties?.slice(0, 3) ?? [];

  if (!isLoading && (isError || recent.length === 0)) return null;

  return (
    <section className="py-14 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[12px] font-bold text-orange-600 uppercase tracking-widest mb-1">
              Recently Added
            </p>
            <h2 className="text-[26px] sm:text-[30px] font-extrabold text-gray-900 tracking-tight">
              Fresh Listings Just In
            </h2>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-1.5 text-[13px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ── Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            : recent.map((property) => (
                <RecentCard key={property.id} property={property} />
              ))}
        </div>

      </div>
    </section>
  );
}