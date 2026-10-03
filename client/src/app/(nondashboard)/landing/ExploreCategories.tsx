"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Home, Tag, Clock, Landmark, ArrowRight } from "lucide-react";
import { useGetPropertiesQuery } from "@/state/api";
import { Property } from "@/types/prismaTypes";

/* ─────────────────────────────────────────────
   CATEGORIES CONFIG
───────────────────────────────────────────── */
const CATEGORIES = [
  {
    label:       "For Rent",
    type:        "Rent",
    href:        "/search?propertyType=Rent",
    icon:        Home,
    bg:          "bg-blue-50",
    iconColor:   "text-blue-600",
    borderHover: "hover:border-blue-200",
    textHover:   "group-hover:text-blue-700",
  },
  {
    label:       "For Sale",
    type:        "Sale",
    href:        "/search?propertyType=Sale",
    icon:        Tag,
    bg:          "bg-green-50",
    iconColor:   "text-green-600",
    borderHover: "hover:border-green-200",
    textHover:   "group-hover:text-green-700",
  },
  {
    label:       "Short Stay",
    type:        "ShortStay",
    href:        "/search?propertyType=ShortStay",
    icon:        Clock,
    bg:          "bg-purple-50",
    iconColor:   "text-purple-600",
    borderHover: "hover:border-purple-200",
    textHover:   "group-hover:text-purple-700",
  },
  {
    label:       "Land",
    type:        "Land",
    href:        "/search?propertyType=Land",
    icon:        Landmark,
    bg:          "bg-amber-50",
    iconColor:   "text-amber-600",
    borderHover: "hover:border-amber-200",
    textHover:   "group-hover:text-amber-700",
  },
] as const;

/* ─────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="w-14 h-14 rounded-xl bg-gray-100 animate-pulse" />
      <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   EXPLORE CATEGORIES
   Place at: src/app/(nondashboard)/landing/ExploreCategories.tsx
   Import in page.tsx
───────────────────────────────────────────── */
export default function ExploreCategories() {
  const { data: properties, isLoading } = useGetPropertiesQuery({});

  // Count properties per type from real API data
  const countByType = useMemo(() => {
    if (!properties) return {} as Record<string, number>;
    return properties.reduce((acc: Record<string, number>, p: Property) => {
      const t = p.propertyType ?? "";
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
  }, [properties]);

  const getCount = (type: string): number => {
    // Handle both casing variants e.g. "Rent" and "rent"
    return (
      countByType[type] ??
      countByType[type.toLowerCase()] ??
      countByType[type.charAt(0).toUpperCase() + type.slice(1)] ??
      0
    );
  };

  return (
    <section className="py-14 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[12px] font-bold text-orange-600 uppercase tracking-widest mb-1">
              Explore Categories
            </p>
            <h2 className="text-[26px] sm:text-[30px] font-extrabold text-gray-900 tracking-tight">
              What Are You Looking For?
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

        {/* ── Category Grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count = getCount(cat.type);

                return (
                  <Link
                    key={cat.type}
                    href={cat.href}
                    className={`
                      group flex flex-col items-center justify-center gap-3
                      p-6 rounded-2xl
                      border border-gray-100 bg-white
                      ${cat.borderHover}
                      shadow-sm hover:shadow-md
                      transition-all duration-150 hover:-translate-y-1
                      text-center
                    `}
                  >
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-xl ${cat.bg} flex items-center justify-center transition-transform duration-150 group-hover:scale-110`}>
                      <Icon className={`w-6 h-6 ${cat.iconColor}`} />
                    </div>

                    {/* Label */}
                    <p className={`text-[15px] font-extrabold text-gray-900 ${cat.textHover} transition-colors`}>
                      {cat.label}
                    </p>

                    {/* Count */}
                    <p className="text-[12px] text-gray-400 font-medium">
                      {count > 0 ? `${count}+ Properties` : "Coming soon"}
                    </p>
                  </Link>
                );
              })}
        </div>

      </div>
    </section>
  );
}