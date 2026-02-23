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
import { cleanParams, cn, formatPriceValue } from "@/lib/utils";
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
import { PropertyTypeIcons } from "@/lib/constants";

// REAL TARKWA AREAS - These are actual neighborhoods in Tarkwa
const TARKWA_AREAS = [
  { value: "any", label: "All Areas" },
  { value: "tarkwa-market", label: "Tarkwa Market" },
  { value: "new-town", label: "New Town" },
  { value: "akoon", label: "Akoon" },
  { value: "tamso", label: "Tamso" },
  { value: "nsuta", label: "Nsuta" },
  { value: "new-site", label: "New Site" },
  { value: "kwabedu", label: "Kwabedu" },
  { value: "cyanide", label: "Cyanide" },
];

// REAL GHANA PRICES - Based on actual Tarkwa rental market (in GH₵)
const MIN_PRICES = [300, 500, 700, 1000, 1500, 2000];
const MAX_PRICES = [500, 700, 1000, 1500, 2000, 3000, 5000];

// PROPERTY TYPES - Simple and clear for Ghana market
const PROPERTY_TYPES = [
  { value: "any", label: "Any Type" },
  { value: "single-room", label: "Single Room" },
  { value: "chamber-and-hall", label: "Chamber & Hall" },
  { value: "1-bedroom", label: "1 Bedroom" },
  { value: "2-bedroom", label: "2 Bedroom" },
  { value: "3-bedroom", label: "3 Bedroom" },
  { value: "self-contain", label: "Self Contain" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
];

const FiltersBar = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useAppSelector((state) => state.global.filters);
  const isFiltersFullOpen = useAppSelector(
    (state) => state.global.isFiltersFullOpen
  );
  const viewMode = useAppSelector((state) => state.global.viewMode);
  
  // Local state for search
  const [searchInput, setSearchInput] = useState(filters.location || "");
  const [selectedArea, setSelectedArea] = useState(filters.area || "any");

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

    // Handle price range (Ghana Cedis)
    if (key === "priceRange") {
      const currentArrayRange = [...(filters.priceRange || [null, null])];
      if (isMin !== null) {
        const index = isMin ? 0 : 1;
        currentArrayRange[index] = value === "any" ? null : Number(value);
      }
      newValue = currentArrayRange;
    } 
    // Handle other filters
    else {
      newValue = value === "any" ? null : value;
    }

    const newFilters = { ...filters, [key]: newValue };
    dispatch(setFilters(newFilters));
    updateURL(newFilters);
  };

  const handleAreaChange = (area: string) => {
    setSelectedArea(area);
    handleFilterChange("area", area);
  };

  const handleQuickSearch = () => {
    if (searchInput.trim()) {
      handleFilterChange("location", searchInput);
    }
  };

  // Format Ghana Cedi prices
  const formatGhanaPrice = (price: number | null, isMin: boolean) => {
    if (!price) {
      return isMin ? "Min Price" : "Max Price";
    }
    return `GH₵${price}`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Main Filters Row */}
      <div className="flex flex-wrap justify-between items-center gap-3 py-4">
        {/* Left Side - Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* All Filters Button */}
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

          {/* Area Quick Select - REAL TARKWA AREAS */}
          <Select value={selectedArea} onValueChange={handleAreaChange}>
            <SelectTrigger className="w-40 rounded-xl border-2 border-orange-400 font-semibold">
              <MapPin className="w-4 h-4 mr-2 text-orange-600" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {TARKWA_AREAS.map((area) => (
                <SelectItem key={area.value} value={area.value}>
                  {area.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Price Range - REAL GHANA CEDIS */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border-2 border-orange-400">
            <DollarSign className="w-4 h-4 text-orange-600 ml-2" />
            
            {/* Min Price */}
            <Select
              value={filters.priceRange?.[0]?.toString() || "any"}
              onValueChange={(value) =>
                handleFilterChange("priceRange", value, true)
              }
            >
              <SelectTrigger className="w-28 border-0 bg-transparent">
                <SelectValue>
                  {formatGhanaPrice(filters.priceRange?.[0], true)}
                </SelectValue>
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

            {/* Max Price */}
            <Select
              value={filters.priceRange?.[1]?.toString() || "any"}
              onValueChange={(value) =>
                handleFilterChange("priceRange", value, false)
              }
            >
              <SelectTrigger className="w-28 border-0 bg-transparent">
                <SelectValue>
                  {formatGhanaPrice(filters.priceRange?.[1], false)}
                </SelectValue>
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

          {/* Rooms - Simple for Ghana */}
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

          {/* Property Type - Ghana Specific */}
          <Select
            value={filters.propertyType || "any"}
            onValueChange={(value) =>
              handleFilterChange("propertyType", value)
            }
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

          {/* Search Box - Find specific property */}
          <div className="flex items-center bg-white rounded-xl border-2 border-orange-400 overflow-hidden">
            <Input
              placeholder="Search property..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleQuickSearch()}
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

        {/* Right Side - View Toggle */}
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

      {/* Active Filters Display - Show what user selected */}
      {(filters.area !== "any" || 
        filters.priceRange?.[0] || 
        filters.priceRange?.[1] || 
        filters.beds !== "any" || 
        filters.propertyType !== "any") && (
        <div className="flex flex-wrap items-center gap-2 px-2">
          <span className="text-sm text-gray-600 font-semibold">Active:</span>
          
          {filters.area && filters.area !== "any" && (
            <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              {TARKWA_AREAS.find(a => a.value === filters.area)?.label}
              <button
                onClick={() => handleAreaChange("any")}
                className="hover:text-orange-900"
              >
                ×
              </button>
            </div>
          )}

          {(filters.priceRange?.[0] || filters.priceRange?.[1]) && (
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-3 h-3" />
              {filters.priceRange?.[0] ? `GH₵${filters.priceRange[0]}` : "Any"} - {filters.priceRange?.[1] ? `GH₵${filters.priceRange[1]}` : "Any"}
              <button
                onClick={() => handleFilterChange("priceRange", [null, null])}
                className="hover:text-green-900"
              >
                ×
              </button>
            </div>
          )}

          {filters.beds && filters.beds !== "any" && (
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold flex items-center gap-2">
              {filters.beds === "1" ? "Single Room" : `${filters.beds} Rooms`}
              <button
                onClick={() => handleFilterChange("beds", "any")}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </div>
          )}

          {filters.propertyType && filters.propertyType !== "any" && (
            <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold flex items-center gap-2">
              {PROPERTY_TYPES.find(t => t.value === filters.propertyType)?.label}
              <button
                onClick={() => handleFilterChange("propertyType", "any")}
                className="hover:text-purple-900"
              >
                ×
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setSelectedArea("any");
              dispatch(setFilters({
                area: "any",
                priceRange: [null, null],
                beds: "any",
                propertyType: "any",
                location: ""
              }));
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