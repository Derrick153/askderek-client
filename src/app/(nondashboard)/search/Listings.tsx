"use client";

import {
  useAddFavoritePropertyMutation,
  useGetPropertiesQuery,
  useGetTenantQuery,
  useRemoveFavoritePropertyMutation,
} from "@/state/api";
import { useAppSelector } from "@/state/redux";
import { Property } from "@/types/prismaTypes";
import Card from "@/components/Card";
import React, { useState, useMemo } from "react";
import CardCompact from "@/components/CardCompact";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Home } from "lucide-react";
import { useUser } from "@clerk/nextjs";

const Listings = () => {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const { data: tenant } = useGetTenantQuery(userId || "", { skip: !userId });
  const [addFavorite] = useAddFavoritePropertyMutation();
  const [removeFavorite] = useRemoveFavoritePropertyMutation();

  const viewMode = useAppSelector((state) => state.global.viewMode);
  const filters = useAppSelector((state) => state.global.filters);

  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const { data: properties, isLoading, isError } = useGetPropertiesQuery(filters);

  // ✅ PROFESSIONAL SORTING - Ghana-optimized
  const sortedProperties = useMemo(() => {
    if (!properties) return [];
    const sorted = [...properties];

    switch (sortBy) {
      case "price-low":
        return sorted.sort((a, b) => a.pricePerMonth - b.pricePerMonth);
      case "price-high":
        return sorted.sort((a, b) => b.pricePerMonth - a.pricePerMonth);
      case "newest":
        return sorted.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
      case "popular":
        return sorted.sort((a, b) => (b.numberOfReviews || 0) - (a.numberOfReviews || 0));
      default:
        return sorted;
    }
  }, [properties, sortBy]);

  // ✅ PAGINATION
  const totalPages = Math.ceil((sortedProperties?.length || 0) / itemsPerPage);
  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedProperties.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProperties, currentPage]);

  // ✅ FAVORITE TOGGLE
  const handleFavoriteToggle = async (propertyId: number) => {
    if (!userId) return;
    const isFavorite = tenant?.favorites?.some((fav: Property) => fav.id === propertyId);
    if (isFavorite) {
      await removeFavorite({ userId, propertyId });
    } else {
      await addFavorite({ userId, propertyId });
    }
  };

  // ✅ PROFESSIONAL LOADING STATE - Ghana-styled
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-md">
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ✅ PROFESSIONAL ERROR STATE
  if (isError || !properties) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Properties</h3>
          <p className="text-gray-600 mb-4">
            We're having trouble connecting to our servers. Please check your internet connection and try again.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  // ✅ EMPTY STATE - Ghana-friendly
  if (sortedProperties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Properties Found</h3>
          <p className="text-gray-600 mb-4">
            We couldn't find any properties matching your search in {filters.location || 'this area'}. 
            Try adjusting your filters or searching in a different area.
          </p>
          <Button 
            onClick={() => window.location.href = '/search'} 
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Clear Filters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ PROFESSIONAL HEADER - Ghana Context */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border-2 border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-900">
            {sortedProperties.length} {sortedProperties.length === 1 ? 'Property' : 'Properties'}
          </h2>
          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
            <MapPin className="w-4 h-4 text-orange-600" />
            {filters.location || 'Tarkwa, Western Region'}
          </p>
        </div>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-52 border-2 border-gray-200 rounded-xl h-11 font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-2 border-gray-200 rounded-xl">
            <SelectItem value="newest" className="font-semibold">Newest First</SelectItem>
            <SelectItem value="price-low" className="font-semibold">Price: Low to High</SelectItem>
            <SelectItem value="price-high" className="font-semibold">Price: High to Low</SelectItem>
            <SelectItem value="popular" className="font-semibold">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ✅ PROPERTY GRID - Responsive */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProperties.map((property) => (
            <Card
              key={property.id}
              property={property}
              isFavorite={tenant?.favorites?.some((fav: Property) => fav.id === property.id) || false}
              onFavoriteToggle={() => handleFavoriteToggle(property.id)}
              showFavoriteButton={!!user}
              propertyLink={`/search/${property.id}`}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedProperties.map((property) => (
            <CardCompact
              key={property.id}
              property={property}
              isFavorite={tenant?.favorites?.some((fav: Property) => fav.id === property.id) || false}
              onFavoriteToggle={() => handleFavoriteToggle(property.id)}
              showFavoriteButton={!!user}
              propertyLink={`/search/${property.id}`}
            />
          ))}
        </div>
      )}

      {/* ✅ PROFESSIONAL PAGINATION */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border-2 border-gray-100 shadow-sm">
          <p className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedProperties.length)} of {sortedProperties.length}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-2 border-gray-200 rounded-lg h-10 px-4 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                      currentPage === pageNum
                        ? 'bg-orange-600 text-white shadow-lg'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="px-2 text-gray-400">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                      currentPage === totalPages
                        ? 'bg-orange-600 text-white shadow-lg'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="border-2 border-gray-200 rounded-lg h-10 px-4 disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ✅ RESULTS SUMMARY */}
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">
          Verified properties in Tarkwa and surrounding areas
        </p>
      </div>
    </div>
  );
};

export default Listings;