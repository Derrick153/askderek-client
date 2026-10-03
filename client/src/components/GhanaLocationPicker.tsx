"use client";

import { useState, useMemo } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import {
  getAllRegions,
  getCitiesByRegion,
  getAreasByCity,
} from "@/lib/ghanaLocations";

// ── TYPES ─────────────────────────────────────────────────

interface LocationValue {
  region: string;
  regionSlug: string;
  city: string;
  citySlug: string;
  area: string;
  areaSlug: string;
}

interface GhanaLocationPickerProps {
  value?: Partial<LocationValue>;
  onChange: (value: LocationValue) => void;
  required?: boolean;
  disabled?: boolean;
}

// ── COMPONENT ─────────────────────────────────────────────

export default function GhanaLocationPicker({
  value,
  onChange,
  required = false,
  disabled = false,
}: GhanaLocationPickerProps) {
  const [selectedRegion, setSelectedRegion] = useState(value?.regionSlug ?? "");
  const [selectedCity, setSelectedCity] = useState(value?.citySlug ?? "");
  const [selectedArea, setSelectedArea] = useState(value?.areaSlug ?? "");

  // ── DATA — only recalculate when the relevant slug changes ────────────
  const regions = useMemo(() => getAllRegions(), []);

  const cities = useMemo(() => {
    if (!selectedRegion) return [];
    try {
      return getCitiesByRegion(selectedRegion).cities;
    } catch {
      return [];
    }
  }, [selectedRegion]);

  const areas = useMemo(() => {
    if (!selectedRegion || !selectedCity) return [];
    try {
      return getAreasByCity(selectedRegion, selectedCity).areas;
    } catch {
      return [];
    }
  }, [selectedRegion, selectedCity]);

  // ── HANDLERS ──────────────────────────────────────────────────────────

  const handleRegionChange = (slug: string) => {
    setSelectedRegion(slug);
    setSelectedCity("");
    setSelectedArea("");

    const region = regions.find((r) => r.slug === slug);
    if (!region) return;

    onChange({
      region: region.name,
      regionSlug: region.slug,
      city: "",
      citySlug: "",
      area: "",
      areaSlug: "",
    });
  };

  const handleCityChange = (slug: string) => {
    setSelectedCity(slug);
    setSelectedArea("");

    const region = regions.find((r) => r.slug === selectedRegion);
    const city = cities.find((c) => c.slug === slug);
    if (!region || !city) return;

    onChange({
      region: region.name,
      regionSlug: region.slug,
      city: city.name,
      citySlug: city.slug,
      area: "",
      areaSlug: "",
    });
  };

  const handleAreaChange = (areaSlug: string) => {
    setSelectedArea(areaSlug);

    const region = regions.find((r) => r.slug === selectedRegion);
    const city = cities.find((c) => c.slug === selectedCity);
    // ✅ Use the real slug and name from ghanaLocations data — not a manual rebuild
    const area = areas.find((a) => a.slug === areaSlug);
    if (!region || !city || !area) return;

    onChange({
      region: region.name,
      regionSlug: region.slug,
      city: city.name,
      citySlug: city.slug,
      area: area.name,
      areaSlug: area.slug,
    });
  };

  // ── DERIVED DISPLAY VALUES ────────────────────────────────────────────
  const selectedCityName = cities.find((c) => c.slug === selectedCity)?.name;
  const selectedRegionName = regions.find((r) => r.slug === selectedRegion)?.name;
  const selectedAreaName = areas.find((a) => a.slug === selectedArea)?.name;

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* ── REGION ─────────────────────────────────── */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Region {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={selectedRegion}
            onChange={(e) => handleRegionChange(e.target.value)}
            disabled={disabled}
            required={required}
            className="w-full appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-10 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <option value="">Select a region</option>
            {regions.map((region) => (
              <option key={region.slug} value={region.slug}>
                {region.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── CITY ───────────────────────────────────── */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          City {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={selectedCity}
            onChange={(e) => handleCityChange(e.target.value)}
            disabled={disabled || !selectedRegion}
            required={required}
            className="w-full appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-10 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <option value="">
              {selectedRegion ? "Select a city" : "Select a region first"}
            </option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── AREA ───────────────────────────────────── */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Area / Neighbourhood {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={selectedArea}
            onChange={(e) => handleAreaChange(e.target.value)}
            disabled={disabled || !selectedCity}
            required={required}
            className="w-full appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-10 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <option value="">
              {selectedCity ? "Select an area" : "Select a city first"}
            </option>
            {areas.map((area) => (
              // ✅ value is area.slug (consistent), display is area.name
              <option key={area.slug} value={area.slug}>
                {area.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── SELECTION SUMMARY ──────────────────────── */}
      {selectedRegion && selectedCity && selectedArea && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl">
          <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-orange-700">
            {selectedAreaName}, {selectedCityName}, {selectedRegionName}
          </p>
        </div>
      )}
    </div>
  );
}