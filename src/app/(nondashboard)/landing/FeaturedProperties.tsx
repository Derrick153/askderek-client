"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Bed, Bath, ArrowRight, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { useGetPropertiesQuery } from "@/state/api";
import { Property } from "@/types/prismaTypes";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const TYPE_LABEL: Record<string, string> = {
  Rooms:      "For Rent",
  Apartment:  "Apartment",
  Villa:      "Villa",
  Townhouse:  "Townhouse",
  Cottage:    "Cottage",
  Tinyhouse:  "Tiny House",
  rent:       "For Rent",
  sale:       "For Sale",
  shortStay:  "Short Stay",
  land:       "Land",
};

const TYPE_COLOR: Record<string, string> = {
  Rooms:      "bg-blue-100 text-blue-700",
  Apartment:  "bg-blue-100 text-blue-700",
  Villa:      "bg-purple-100 text-purple-700",
  Townhouse:  "bg-green-100 text-green-700",
  Cottage:    "bg-amber-100 text-amber-700",
  Tinyhouse:  "bg-orange-100 text-orange-700",
  rent:       "bg-blue-100 text-blue-700",
  sale:       "bg-green-100 text-green-700",
  shortStay:  "bg-purple-100 text-purple-700",
  land:       "bg-amber-100 text-amber-700",
};

function formatPrice(price: number, type: string): string {
  const formatted = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(price);
  const isMonthly = !["sale", "Sale", "land", "Land"].includes(type);
  return isMonthly ? `${formatted}/mo` : formatted;
}

/* ─────────────────────────────────────────────
   SKELETON CARD
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[272px] rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
      <div className="h-[172px] bg-gray-100 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-100 rounded-lg animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-1/2" />
        <div className="flex gap-3">
          <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-14" />
          <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-14" />
        </div>
        <div className="h-5 bg-gray-100 rounded-lg animate-pulse w-1/3 mt-1" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROPERTY CARD
───────────────────────────────────────────── */
function PropertyCard({ property }: { property: Property }) {
  const [imgError, setImgError] = useState(false);

  const photo = property.photoUrls?.[0];
  const location = property.location as any;
  const locationStr = [location?.area, location?.city].filter(Boolean).join(", ");
  const typeLabel = TYPE_LABEL[property.propertyType] ?? property.propertyType;
  const typeColor = TYPE_COLOR[property.propertyType] ?? "bg-gray-100 text-gray-700";
  const isLand = property.propertyType.toLowerCase() === "land";

  return (
    <Link
      href={`/search/${property.id}`}
      className="
        group flex-shrink-0 w-[272px]
        rounded-2xl overflow-hidden
        border border-gray-100 bg-white
        shadow-sm hover:shadow-xl
        transition-all duration-200 hover:-translate-y-1
      "
    >
      {/* ── Image ── */}
      <div className="relative h-[172px] bg-gray-100 overflow-hidden">
        {photo && !imgError ? (
          <Image
            src={photo}
            alt={property.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
            sizes="272px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-gray-100">
            <span className="text-4xl">🏠</span>
          </div>
        )}

        {/* Type badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold ${typeColor}`}>
          {typeLabel}
        </span>

        {/* Verified badge */}
        <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold text-green-700 shadow-sm">
          <CheckCircle className="w-3 h-3" />
          Verified
        </span>
      </div>

      {/* ── Details ── */}
      <div className="p-4">
        {/* Name */}
        <h3 className="text-[14px] font-bold text-gray-900 leading-snug truncate mb-1 group-hover:text-orange-600 transition-colors">
          {property.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="text-[12px] text-gray-500 truncate">{locationStr}</span>
        </div>

        {/* Beds / Baths — hidden for land */}
        {!isLand && (
          <div className="flex items-center gap-3 mb-3">
            {property.beds > 0 && (
              <span className="flex items-center gap-1 text-[12px] text-gray-600 font-medium">
                <Bed className="w-3.5 h-3.5 text-gray-400" />
                {property.beds} bd
              </span>
            )}
            {property.baths > 0 && (
              <span className="flex items-center gap-1 text-[12px] text-gray-600 font-medium">
                <Bath className="w-3.5 h-3.5 text-gray-400" />
                {property.baths} ba
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <p className="text-[16px] font-extrabold text-orange-600">
          {formatPrice(property.pricePerMonth, property.propertyType)}
        </p>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────
   FEATURED PROPERTIES
   - Fetches real approved properties from your backend
   - Replaces old FeaturesSection.tsx
   - Place at: src/app/(nondashboard)/landing/FeaturedProperties.tsx
   - Import in page.tsx as: import FeaturedProperties from "./FeaturedProperties"
───────────────────────────────────────────── */
export default function FeaturedProperties() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: allProperties, isLoading, isError } = useGetPropertiesQuery({});

  // Show up to 8 most recent approved properties
  const properties = allProperties?.slice(0, 8) ?? [];

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  // Hide section entirely if API failed or returned nothing
  if (!isLoading && (isError || properties.length === 0)) return null;

  return (
    <section className="py-14 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[12px] font-bold text-orange-600 uppercase tracking-widest mb-1">
              Featured Properties
            </p>
            <h2 className="text-[26px] sm:text-[30px] font-extrabold text-gray-900 tracking-tight">
              Verified Homes Across Ghana
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Scroll controls — desktop only */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scroll("left")}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Link
              href="/search"
              className="flex items-center gap-1.5 text-[13px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ── Cards ── */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
        </div>

      </div>
    </section>
  );
}