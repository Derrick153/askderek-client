"use client";

import { NAVBAR_HEIGHT } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/state/redux";
import { useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import FiltersBar from "./FiltersBar";
import FiltersFull from "./FiltersFull";
import { cleanParams } from "@/lib/utils";
import { setFilters } from "@/state";
import Listings from "./Listings";

const SearchPage = () => {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const isFiltersFullOpen = useAppSelector(
    (state) => state.global.isFiltersFullOpen
  );

  useEffect(() => {
    const initialFilters = Array.from(searchParams.entries()).reduce(
      (acc: any, [key, value]) => {
        if (key === "priceRange" || key === "squareFeet") {
          acc[key] = value.split(",").map((v) => (v === "" ? null : Number(v)));
        } else if (key === "coordinates") {
          acc[key] = value.split(",").map(Number);
        } else if (key === "amenities") {
          acc[key] = value.split(",");
        } else {
          acc[key] = value === "any" ? "any" : value;
        }
        return acc;
      },
      {}
    );
    const cleanedFilters = cleanParams(initialFilters);
    dispatch(setFilters(cleanedFilters));
  }, [searchParams, dispatch]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Filters Bar */}
      <div 
        className="sticky bg-white border-b shadow-sm z-30"
        style={{ top: `${NAVBAR_HEIGHT}px` }}
      >
        <div className="max-w-[1600px] mx-auto">
          <FiltersBar />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-6 p-6">
          {/* Filters Sidebar - Desktop Only */}
          {isFiltersFullOpen && (
            <aside className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky" style={{ top: `${NAVBAR_HEIGHT + 90}px` }}>
                <FiltersFull />
              </div>
            </aside>
          )}

          {/* Listings */}
          <main className="flex-1 min-w-0">
            <Listings />
          </main>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {isFiltersFullOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" style={{ top: `${NAVBAR_HEIGHT}px` }}>
          <div className="bg-white h-full overflow-auto">
            <FiltersFull />
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;