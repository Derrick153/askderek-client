import { FiltersState, initialState, setFilters } from "@/state";
import { useAppSelector } from "@/state/redux";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { debounce } from "lodash";
import { cleanParams, cn, formatEnumString } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, MapPin, Home, Wifi, Zap, Droplet, Car } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// COMPLETE REAL TARKWA COMMUNITIES - ALL 20! ✅
const TARKWA_COMMUNITIES = [
  "New Atuabo",
  "Tamso",
  "Cyanide",
  "UMaT Hostels",
  "Kwabedu",
  "Low Cost",
  "Brahabebom",
  "Nsuta",
  "Bonsa",
  "Aboso",
  "Bonsawire",
  "Kyekyewere",
  "Efuanta",
  "Akoon",
  "Bankyim",
  "Nzema Line",
  "Zongo",
  "Tarkwa & Aboso",
  "Government Hill",
  "Teberebe",
];

// REAL GHANA PROPERTY TYPES
const PROPERTY_TYPES = [
  { value: "single-room", label: "Single Room" },
  { value: "chamber-hall", label: "Chamber & Hall" },
  { value: "1-bedroom", label: "1 Bedroom" },
  { value: "2-bedroom", label: "2 Bedroom" },
  { value: "3-bedroom", label: "3 Bedroom" },
  { value: "self-contain", label: "Self Contain" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" }
];

// REAL GHANA AMENITIES (What actually matters in Tarkwa)
const AMENITIES = [
  { id: "water", label: "Water Supply", icon: Droplet },
  { id: "electricity", label: "Electricity", icon: Zap },
  { id: "internet", label: "Internet Ready", icon: Wifi },
  { id: "parking", label: "Parking Space", icon: Car },
  { id: "furnished", label: "Furnished", icon: Home },
  { id: "security", label: "Security", icon: Home }
];

const FiltersFull = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useAppSelector((state) => state.global.filters);
  const [localFilters, setLocalFilters] = useState(initialState.filters);
  const isFiltersFullOpen = useAppSelector(
    (state) => state.global.isFiltersFullOpen
  );

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

  const handleSubmit = () => {
    dispatch(setFilters(localFilters));
    updateURL(localFilters);
  };

  const handleReset = () => {
    setLocalFilters(initialState.filters);
    dispatch(setFilters(initialState.filters));
    updateURL(initialState.filters);
  };

  const handleAmenityToggle = (amenityId: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      amenities: prev.amenities?.includes(amenityId)
        ? prev.amenities.filter((a) => a !== amenityId)
        : [...(prev.amenities || []), amenityId],
    }));
  };

  if (!isFiltersFullOpen) return null;

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl mx-auto overflow-hidden flex flex-col border-2 border-orange-200">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
        <h2 className="text-xl font-black text-gray-900">All Filters</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'global/toggleFiltersFullOpen' })}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 max-h-[70vh]">
        
        {/* Community Selection - ALL 20 REAL TARKWA AREAS! */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-600" />
            Community in Tarkwa
          </Label>
          <Select
            value={localFilters.area || "any"}
            onValueChange={(value) =>
              setLocalFilters((prev) => ({ ...prev, area: value }))
            }
          >
            <SelectTrigger className="rounded-xl border-2 border-gray-300 h-12 font-semibold">
              <SelectValue placeholder="Select community" />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-[300px]">
              <SelectItem value="any">All Communities</SelectItem>
              {TARKWA_COMMUNITIES.map((community) => (
                <SelectItem 
                  key={community} 
                  value={community.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}
                >
                  {community}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            📍 All 20 major communities in Tarkwa
          </p>
        </div>

        {/* Property Type - GHANA SPECIFIC */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Home className="w-4 h-4 text-orange-600" />
            Property Type
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {PROPERTY_TYPES.map((type) => (
              <button
                key={type.value}
                className={cn(
                  "flex items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 font-semibold",
                  localFilters.propertyType === type.value
                    ? "border-orange-600 bg-orange-50 text-orange-900"
                    : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 text-gray-700"
                )}
                onClick={() =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    propertyType: type.value,
                  }))
                }
              >
                <span className="text-sm">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Price Range - REAL GHANA CEDIS */}
        <div className="space-y-4">
          <Label className="text-sm font-bold text-gray-900">
            Monthly Rent (GH₵)
          </Label>
          <Slider
            min={200}
            max={5000}
            step={100}
            value={[
              localFilters.priceRange?.[0] ?? 200,
              localFilters.priceRange?.[1] ?? 5000,
            ]}
            onValueChange={(value: any) =>
              setLocalFilters((prev) => ({
                ...prev,
                priceRange: value as [number, number],
              }))
            }
            className="py-4"
          />
          <div className="flex justify-between items-center">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Minimum</div>
              <div className="text-lg font-black text-orange-600">
                GH₵{localFilters.priceRange?.[0] ?? 200}
              </div>
            </div>
            <div className="text-gray-400">—</div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Maximum</div>
              <div className="text-lg font-black text-orange-600">
                GH₵{localFilters.priceRange?.[1] ?? 5000}
              </div>
            </div>
          </div>
        </div>

        {/* Number of Rooms - Simple for Ghana */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-gray-900">Number of Rooms</Label>
          <div className="grid grid-cols-4 gap-2">
            {["1", "2", "3", "4+"].map((num) => (
              <button
                key={num}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all duration-200 font-bold text-lg",
                  localFilters.beds === num
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-gray-200 hover:border-orange-300 text-gray-700"
                )}
                onClick={() =>
                  setLocalFilters((prev) => ({ ...prev, beds: num }))
                }
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Bathrooms - Keep it Simple */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-gray-900">Bathrooms</Label>
          <div className="grid grid-cols-4 gap-2">
            {["1", "2", "3", "3+"].map((num) => (
              <button
                key={num}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all duration-200 font-bold text-lg",
                  localFilters.baths === num
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 hover:border-blue-300 text-gray-700"
                )}
                onClick={() =>
                  setLocalFilters((prev) => ({ ...prev, baths: num }))
                }
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Amenities - WHAT ACTUALLY MATTERS IN GHANA */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-gray-900">Important Amenities</Label>
          <div className="grid grid-cols-2 gap-3">
            {AMENITIES.map((amenity) => {
              const Icon = amenity.icon;
              return (
                <button
                  key={amenity.id}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                    localFilters.amenities?.includes(amenity.id)
                      ? "border-green-600 bg-green-50 text-green-900"
                      : "border-gray-200 hover:border-green-300 hover:bg-green-50/30 text-gray-700"
                  )}
                  onClick={() => handleAmenityToggle(amenity.id)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold text-sm">{amenity.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Available From Date */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-gray-900">Available From</Label>
          <Input
            type="date"
            value={
              localFilters.availableFrom !== "any"
                ? localFilters.availableFrom
                : ""
            }
            onChange={(e) =>
              setLocalFilters((prev) => ({
                ...prev,
                availableFrom: e.target.value || "any",
              }))
            }
            className="rounded-xl border-2 border-gray-300 h-12 font-semibold"
          />
          <p className="text-xs text-gray-500">
            Find properties available on or before this date
          </p>
        </div>

        {/* Specific Search (Optional) */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-gray-900">Search Keywords (Optional)</Label>
          <Input
            placeholder="e.g., near school, quiet area, gated..."
            value={localFilters.location || ""}
            onChange={(e) =>
              setLocalFilters((prev) => ({
                ...prev,
                location: e.target.value,
              }))
            }
            className="rounded-xl border-2 border-gray-300 h-12"
          />
          <p className="text-xs text-gray-500">
            Search for specific features or landmarks
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
        <Button
          onClick={handleReset}
          variant="outline"
          className="flex-1 rounded-xl border-2 border-gray-300 font-bold h-12 hover:bg-gray-100"
        >
          Clear All
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold h-12 shadow-lg"
        >
          Apply Filters
        </Button>
      </div>

      {/* Active Filters Count */}
      <div className="px-6 py-2 bg-orange-50 border-t border-orange-100">
        <p className="text-xs text-center text-orange-800 font-semibold">
          {Object.values(localFilters).filter(
            v => v && v !== "any" && (Array.isArray(v) ? v.length > 0 : true)
          ).length} filters active
        </p>
      </div>
    </div>
  );
};

export default FiltersFull;