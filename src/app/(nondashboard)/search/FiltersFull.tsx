import { FiltersState, initialState, setFilters } from "@/state";
import { useAppSelector } from "@/state/redux";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { debounce } from "lodash";
import { cleanParams, cn, formatEnumString } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { AmenityIcons, PropertyTypeIcons } from "@/lib/constants";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
      updatedSearchParams.set(
        key,
        Array.isArray(value) ? value.join(",") : value.toString()
      );
    });

    router.push(`?`);
  });

  const handleSubmit = () => {
    dispatch(setFilters(localFilters));
    updateURL(localFilters);
  };

  const handleReset = () => {
    setLocalFilters(initialState.filters);
    dispatch(setFilters(initialState.filters));
    updateURL(initialState.filters);
  };

  const handleAmenityChange = (amenity: AmenityEnum) => {
    setLocalFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleLocationSearch = async () => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/.json?access_token=&fuzzyMatch=true`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setLocalFilters((prev) => ({
          ...prev,
          coordinates: [lng, lat],
        }));
      }
    } catch (err) {
      console.error("Error search location:", err);
    }
  };

  if (!isFiltersFullOpen) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg h-full overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
        <h2 className="text-lg font-bold text-gray-900">All Filters</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'global/toggleFiltersFullOpen' })}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-700">Location</Label>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter location"
              value={localFilters.location}
              onChange={(e) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              className="rounded-lg border-gray-300 focus:border-primary-500"
            />
            <Button
              onClick={handleLocationSearch}
              size="sm"
              className="bg-primary-600 hover:bg-primary-700"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-700">Property Type</Label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(PropertyTypeIcons).map(([type, Icon]) => (
              <button
                key={type}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200",
                  localFilters.propertyType === type
                    ? "border-primary-600 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
                onClick={() =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    propertyType: type as PropertyTypeEnum,
                  }))
                }
              >
                <Icon className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">{type}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-700">Price Range (Monthly)</Label>
          <Slider
            min={0}
            max={10000}
            step={100}
            value={[
              localFilters.priceRange[0] ?? 0,
              localFilters.priceRange[1] ?? 10000,
            ]}
            onValueChange={(value: any) =>
              setLocalFilters((prev) => ({
                ...prev,
                priceRange: value as [number, number],
              }))
            }
            className="py-4"
          />
          <div className="flex justify-between text-sm font-medium text-gray-600">
            <span>`$`{localFilters.priceRange[0] ?? 0}</span>
            <span>`$`{localFilters.priceRange[1] ?? 10000}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">Beds</Label>
            <Select
              value={localFilters.beds || "any"}
              onValueChange={(value) =>
                setLocalFilters((prev) => ({ ...prev, beds: value }))
              }
            >
              <SelectTrigger className="rounded-lg border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="any">Any beds</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">Baths</Label>
            <Select
              value={localFilters.baths || "any"}
              onValueChange={(value) =>
                setLocalFilters((prev) => ({ ...prev, baths: value }))
              }
            >
              <SelectTrigger className="rounded-lg border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="any">Any baths</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-700">Square Feet</Label>
          <Slider
            min={0}
            max={5000}
            step={100}
            value={[
              localFilters.squareFeet[0] ?? 0,
              localFilters.squareFeet[1] ?? 5000,
            ]}
            onValueChange={(value) =>
              setLocalFilters((prev) => ({
                ...prev,
                squareFeet: value as [number, number],
              }))
            }
            className="py-4"
          />
          <div className="flex justify-between text-sm font-medium text-gray-600">
            <span>{localFilters.squareFeet[0] ?? 0} sq ft</span>
            <span>{localFilters.squareFeet[1] ?? 5000} sq ft</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-700">Amenities</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(AmenityIcons).map(([amenity, Icon]) => (
              <button
                key={amenity}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 text-sm",
                  localFilters.amenities.includes(amenity as AmenityEnum)
                    ? "border-primary-600 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
                onClick={() => handleAmenityChange(amenity as AmenityEnum)}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{formatEnumString(amenity)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-700">Available From</Label>
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
                availableFrom: e.target.value ? e.target.value : "any",
              }))
            }
            className="rounded-lg border-gray-300"
          />
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
        <Button
          onClick={handleReset}
          variant="outline"
          className="flex-1 rounded-lg border-2"
        >
          Reset
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1 bg-primary-600 hover:bg-primary-700 rounded-lg"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default FiltersFull;
