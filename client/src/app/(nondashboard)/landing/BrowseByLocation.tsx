"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { useGetPropertiesQuery } from "@/state/api";
import { Property } from "@/types/prismaTypes";

/* ─────────────────────────────────────────────
   LOCATIONS CONFIG
   These are the cities shown as quick-browse
   buttons. Linked to /search?location=X
───────────────────────────────────────────── */
const BROWSE_LOCATIONS = [
  { name: "Accra",       coordinates: [-0.1870, 5.6037] },
  { name: "East Legon",  coordinates: [-0.1563, 5.6369] },
  { name: "Tema",        coordinates: [0.0166,  5.6698] },
  { name: "Kumasi",      coordinates: [-1.6236, 6.6885] },
  { name: "Spintex",     coordinates: [-0.1170, 5.6494] },
  { name: "Takoradi",    coordinates: [-1.7547, 4.8845] },
  { name: "Tarkwa",      coordinates: [-1.9933, 5.3000] },
  { name: "Cape Coast",  coordinates: [-1.2459, 5.1053] },
];

/* ─────────────────────────────────────────────
   LOCATION CARD
───────────────────────────────────────────── */
function LocationCard({
  name,
  coordinates,
  count,
}: {
  name: string;
  coordinates: number[];
  count: number;
}) {
  const href = `/search?location=${encodeURIComponent(name)}&coordinates=${coordinates[0]},${coordinates[1]}`;

  return (
    <Link
      href={href}
      className="
        group flex items-center justify-between
        px-5 py-4 rounded-xl
        border border-gray-100 bg-white
        hover:border-orange-200 hover:bg-orange-50
        shadow-sm hover:shadow-md
        transition-all duration-150
      "
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center transition-colors flex-shrink-0">
          <MapPin className="w-4 h-4 text-orange-500" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-gray-900 group-hover:text-orange-700 transition-colors leading-tight">
            {name}
          </p>
          <p className="text-[12px] text-gray-400 leading-tight mt-0.5">
            {count > 0 ? `${count}+ listing${count !== 1 ? "s" : ""}` : "Coming soon"}
          </p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all duration-150 flex-shrink-0" />
    </Link>
  );
}

/* ─────────────────────────────────────────────
   SKELETON CARD
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="flex items-center justify-between px-5 py-4 rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse" />
        <div className="space-y-2">
          <div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="w-4 h-4 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   BROWSE BY LOCATION
   - Replaces DiscoverSection.tsx
   - Place at: src/app/(nondashboard)/landing/BrowseByLocation.tsx
   - In page.tsx: replace <DiscoverSection /> with <BrowseByLocation />
   - Also update the import
───────────────────────────────────────────── */
export default function BrowseByLocation() {
  const { data: properties, isLoading } = useGetPropertiesQuery({});

  // Count how many approved properties exist per city
  const countByCity = useMemo(() => {
    if (!properties) return {} as Record<string, number>;
    return properties.reduce((acc: Record<string, number>, p: Property) => {
      const loc = p.location as any;
      const city: string = loc?.city ?? loc?.area ?? "";
      if (city) acc[city] = (acc[city] ?? 0) + 1;
      return acc;
    }, {});
  }, [properties]);

  // Get count for a location name (tries exact city match, then area match)
  const getCount = (name: string): number => {
    return countByCity[name] ?? 0;
  };

  return (
    <section className="py-14 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[12px] font-bold text-orange-600 uppercase tracking-widest mb-1">
              Browse by Location
            </p>
            <h2 className="text-[26px] sm:text-[30px] font-extrabold text-gray-900 tracking-tight">
              Find Homes Near You
            </h2>
          </div>
          <Link
            href="/regions"
            className="flex items-center gap-1.5 text-[13px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ── Location Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : BROWSE_LOCATIONS.map((loc) => (
                <LocationCard
                  key={loc.name}
                  name={loc.name}
                  coordinates={loc.coordinates}
                  count={getCount(loc.name)}
                />
              ))}
        </div>

      </div>
    </section>
  );
}