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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";

const Listings = () => {
  // Get Clerk user
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const { data: tenant } = useGetTenantQuery(
    userId || "",
    {
      skip: !userId,
    }
  );
  const [addFavorite] = useAddFavoritePropertyMutation();
  const [removeFavorite] = useRemoveFavoritePropertyMutation();
  const viewMode = useAppSelector((state) => state.global.viewMode);
  const filters = useAppSelector((state) => state.global.filters);

  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const {
    data: properties,
    isLoading,
    isError,
    error,
  } = useGetPropertiesQuery(filters);

  // DEBUG: Log everything to console
  console.log('🔍 Listings Debug Info:', {
    filters,
    properties,
    isLoading,
    isError,
    error,
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    propertiesCount: properties?.length || 0,
    clerkUser: user,
    userId
  });

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
      case "oldest":
        return sorted.sort((a, b) => new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime());
      default:
        return sorted;
    }
  }, [properties, sortBy]);

  const totalPages = Math.ceil((sortedProperties?.length || 0) / itemsPerPage);
  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedProperties.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProperties, currentPage]);

  const handleFavoriteToggle = async (propertyId: number) => {
    if (!userId) return;

    const isFavorite = tenant?.favorites?.some(
      (fav: Property) => fav.id === propertyId
    );

    if (isFavorite) {
      await removeFavorite({
        userId,
        propertyId,
      });
    } else {
      await addFavorite({
        userId,
        propertyId,
      });
    }
  };

  if (!isLoaded || isLoading) {
    console.log('⏳ Loading properties...');
    return <div className="p-4">Loading...</div>;
  }
  
  if (isError || !properties) {
    console.error('❌ Error fetching properties:', error);
    console.error('❌ Full error object:', JSON.stringify(error, null, 2));
    return (
      <div className="p-4">
        <div className="text-red-600 font-semibold">Failed to fetch properties</div>
        <div className="text-sm text-gray-600 mt-2">
          Check the browser console (F12) for detailed error information
        </div>
        {error && (
          <pre className="mt-2 p-2 bg-gray-100 text-xs overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  console.log('✅ Properties loaded successfully:', properties.length);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-bold">
          {sortedProperties.length}{" "}
          <span className="text-gray-700 font-normal">
            Places in {filters.location || 'your area'}
          </span>
        </h3>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {paginatedProperties?.map((property) =>
            viewMode === "grid" ? (
              <Card
                key={property.id}
                property={property}
                isFavorite={
                  tenant?.favorites?.some(
                    (fav: Property) => fav.id === property.id
                  ) || false
                }
                onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                showFavoriteButton={!!user}
                propertyLink={`/search/${property.id}`}
              />
            ) : (
              <CardCompact
                key={property.id}
                property={property}
                isFavorite={
                  tenant?.favorites?.some(
                    (fav: Property) => fav.id === property.id
                  ) || false
                }
                onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                showFavoriteButton={!!user}
                propertyLink={`/search/${property.id}`}
              />
            )
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default Listings;