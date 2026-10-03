"use client";

import {
  FiltersState,
  setFilters,
  setViewMode,
  toggleFiltersFullOpen,
} from "@/state";
import { useAppSelector } from "@/state/redux";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { debounce } from "lodash";
import { cleanParams, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Filter, Grid, List, Search, MapPin, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllRegions, getCitiesByRegion } from "@/lib/ghanaLocations";

// ── PRICE DATA ────────────────────────────────────────────
const MIN_PRICES = [300, 500, 700, 1000, 1500, 2000];
const MAX_PRICES = [500, 700, 1000, 1500, 2000, 3000, 5000];

// ── PROPERTY TYPES ────────────────────────────────────────
const PROPERTY_TYPES = [
  { value: "any",           label: "Any Type"       },
  { value: "Rooms",         label: "Single Room"    },
  { value: "Chamber",       label: "Chamber & Hall" },
  { value: "SelfContained", label: "Self-Contained" },
  { value: "Apartment",     label: "Apartment"      },
  { value: "CompoundHouse", label: "Compound House" },
  { value: "Office",        label: "Office Space"   },
  { value: "Shop",          label: "Shop / Store"   },
];

// ─────────────────────────────────────────────────────────
const FiltersBar = () => {
  const dispatch   = useDispatch();
  const router     = useRouter();
  const pathname   = usePathname();
  const filters    = useAppSelector((state) => state.global.filters);
  const isFiltersFullOpen = useAppSelector((state) => state.global.isFiltersFullOpen);
  const viewMode   = useAppSelector((state) => state.global.viewMode);

  const [searchInput, setSearchInput] = useState(filters.location || "");

  // ── All regions from ghanaLocations ──────────────────────
  const regions = getAllRegions();

  // ── Cities change when region changes ────────────────────
  const cities = filters.regionSlug
    ? (() => {
        try { return getCitiesByRegion(filters.regionSlug).cities; }
        catch { return []; }
      })()
    : [];

  // ── URL sync ──────────────────────────────────────────────
  const updateURL = debounce((newFilters: FiltersState) => {
    const cleanFilters = cleanParams(newFilters);
    const updatedSearchParams = new URLSearchParams();
    Object.entries(cleanFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "any") {
        updatedSearchParams.set(
          key,
          Array.isArray(value) ? value.join(",") : value.toString()
        );
      }
    });
    router.push(`${pathname}?${updatedSearchParams.toString()}`);
  }, 300);

  const handleFilterChange = (
    key: string,
    value: any,
    isMin: boolean | null = null
  ) => {
    let newValue = value;
    if (key === "priceRange") {
      const currentRange = [...(filters.priceRange || [null, null])];
      if (isMin !== null) {
        currentRange[isMin ? 0 : 1] = value === "any" ? null : Number(value);
      }
      newValue = currentRange;
    } else {
      newValue = value === "any" ? null : value;
    }
    const newFilters = { ...filters, [key]: newValue };
    dispatch(setFilters(newFilters));
    updateURL(newFilters);
  };

  // ── Region change — reset city ────────────────────────────
  const handleRegionChange = (regionSlug: string) => {
    const region = regions.find((r) => r.slug === regionSlug);
    const newFilters = {
      ...filters,
      region:     regionSlug === "any" ? null : region?.name ?? null,
      regionSlug: regionSlug === "any" ? null : regionSlug,
      city:       null,
      citySlug:   null,
    };
    dispatch(setFilters(newFilters));
    updateURL(newFilters);
  };

  // ── City change ───────────────────────────────────────────
  const handleCityChange = (citySlug: string) => {
    const city = cities.find((c) => c.slug === citySlug);
    const newFilters = {
      ...filters,
      city:     citySlug === "any" ? null : city?.name ?? null,
      citySlug: citySlug === "any" ? null : citySlug,
    };
    dispatch(setFilters(newFilters));
    updateURL(newFilters);
  };

  const handleQuickSearch = () => {
    if (searchInput.trim()) handleFilterChange("location", searchInput);
  };

  const formatPrice = (price: number | null, isMin: boolean) => {
    if (!price) return isMin ? "Min Price" : "Max Price";
    return `GH₵${price}`;
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3 py-4">

        {/* ── Left Side ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">

          {/* All Filters toggle */}
          <Button
            variant="outline"
            className={cn(
              "gap-2 rounded-xl border-2 border-orange-400 hover:bg-orange-500 hover:text-white transition-all",
              isFiltersFullOpen && "bg-orange-600 text-white"
            )}
            onClick={() => dispatch(toggleFiltersFullOpen())}
          >
            <Filter className="w-4 h-4" />
            <span className="font-semibold">All Filters</span>
          </Button>

          {/* ── Region ─────────────────────────────────── */}
          <Select
            value={filters.regionSlug || "any"}
            onValueChange={handleRegionChange}
          >
            <SelectTrigger className="w-44 rounded-xl border-2 border-orange-400 font-semibold">
              <MapPin className="w-4 h-4 mr-2 text-orange-600" />
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-80 overflow-y-auto">
              <SelectItem value="any">All Regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.slug} value={r.slug}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* ── City (only shown when region is selected) ── */}
          {filters.regionSlug && cities.length > 0 && (
            <Select
              value={filters.citySlug || "any"}
              onValueChange={handleCityChange}
            >
              <SelectTrigger className="w-40 rounded-xl border-2 border-orange-400 font-semibold">
                <MapPin className="w-4 h-4 mr-2 text-orange-600" />
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-80 overflow-y-auto">
                <SelectItem value="any">All Cities</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* ── Price Range ─────────────────────────────── */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border-2 border-orange-400">
            <DollarSign className="w-4 h-4 text-orange-600 ml-2" />
            <Select
              value={filters.priceRange?.[0]?.toString() || "any"}
              onValueChange={(value) => handleFilterChange("priceRange", value, true)}
            >
              <SelectTrigger className="w-28 border-0 bg-transparent">
                <SelectValue>{formatPrice(filters.priceRange?.[0], true)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="any">Any Min</SelectItem>
                {MIN_PRICES.map((price) => (
                  <SelectItem key={price} value={price.toString()}>
                    GH₵{price}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-gray-400">-</span>

            <Select
              value={filters.priceRange?.[1]?.toString() || "any"}
              onValueChange={(value) => handleFilterChange("priceRange", value, false)}
            >
              <SelectTrigger className="w-28 border-0 bg-transparent">
                <SelectValue>{formatPrice(filters.priceRange?.[1], false)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="any">Any Max</SelectItem>
                {MAX_PRICES.map((price) => (
                  <SelectItem key={price} value={price.toString()}>
                    GH₵{price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Beds ────────────────────────────────────── */}
          <Select
            value={filters.beds || "any"}
            onValueChange={(value) => handleFilterChange("beds", value)}
          >
            <SelectTrigger className="w-32 rounded-xl border-2 border-orange-400 font-semibold">
              <SelectValue placeholder="Rooms" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="any">Any Rooms</SelectItem>
              <SelectItem value="1">Single Room</SelectItem>
              <SelectItem value="2">2 Rooms</SelectItem>
              <SelectItem value="3">3 Rooms</SelectItem>
              <SelectItem value="4">4+ Rooms</SelectItem>
            </SelectContent>
          </Select>

          {/* ── Property Type ────────────────────────────── */}
          <Select
            value={filters.propertyType || "any"}
            onValueChange={(value) => handleFilterChange("propertyType", value)}
          >
            <SelectTrigger className="w-40 rounded-xl border-2 border-orange-400 font-semibold">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-80 overflow-y-auto">
              {PROPERTY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* ── Search Box ──────────────────────────────── */}
          <div className="flex items-center bg-white rounded-xl border-2 border-orange-400 overflow-hidden">
            <Input
              placeholder="Search property..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickSearch()}
              className="w-44 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              onClick={handleQuickSearch}
              className="rounded-none bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-none h-10"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Right Side — View Toggle ──────────────────── */}
        <div className="flex items-center gap-2">
          <div className="flex border-2 border-orange-400 rounded-xl overflow-hidden">
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 rounded-none hover:bg-orange-100",
                viewMode === "list" && "bg-orange-600 text-white hover:bg-orange-700 hover:text-white"
              )}
              onClick={() => dispatch(setViewMode("list"))}
            >
              <List className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 rounded-none hover:bg-orange-100",
                viewMode === "grid" && "bg-orange-600 text-white hover:bg-orange-700 hover:text-white"
              )}
              onClick={() => dispatch(setViewMode("grid"))}
            >
              <Grid className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Active Filters Display ────────────────────── */}
      {(filters.region ||
        filters.city ||
        filters.priceRange?.[0] ||
        filters.priceRange?.[1] ||
        filters.beds ||
        filters.propertyType) && (
        <div className="flex flex-wrap items-center gap-2 px-2">
          <span className="text-sm text-gray-600 font-semibold">Active:</span>

          {filters.region && (
            <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              {filters.region}
              <button onClick={() => handleRegionChange("any")} className="hover:text-orange-900">×</button>
            </div>
          )}

          {filters.city && (
            <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              {filters.city}
              <button onClick={() => handleCityChange("any")} className="hover:text-amber-900">×</button>
            </div>
          )}

          {(filters.priceRange?.[0] || filters.priceRange?.[1]) && (
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-3 h-3" />
              {filters.priceRange?.[0] ? `GH₵${filters.priceRange[0]}` : "Any"} –{" "}
              {filters.priceRange?.[1] ? `GH₵${filters.priceRange[1]}` : "Any"}
              <button onClick={() => handleFilterChange("priceRange", [null, null])} className="hover:text-green-900">×</button>
            </div>
          )}

          {filters.beds && (
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold flex items-center gap-2">
              {filters.beds === "1" ? "Single Room" : `${filters.beds} Rooms`}
              <button onClick={() => handleFilterChange("beds", "any")} className="hover:text-blue-900">×</button>
            </div>
          )}

          {filters.propertyType && (
            <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold flex items-center gap-2">
              {PROPERTY_TYPES.find((t) => t.value === filters.propertyType)?.label}
              <button onClick={() => handleFilterChange("propertyType", "any")} className="hover:text-purple-900">×</button>
            </div>
          )}

          <button
            onClick={() => {
              const cleared = {
                ...filters,
                region:     null,
                regionSlug: null,
                city:       null,
                citySlug:   null,
                priceRange: [null, null] as [null, null],
                beds:       null,
                propertyType: null,
                location:   "",
              };
              dispatch(setFilters(cleared));
              updateURL(cleared);
            }}
            className="text-sm text-red-600 hover:text-red-800 font-semibold ml-2"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default FiltersBar;