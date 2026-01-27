"use client";
import { useUser } from "@clerk/nextjs";
import { useGetTenantQuery } from "@/state/api";
import Link from "next/link";
import { Heart, MapPin, Bed, Bath, Maximize, ArrowRight } from "lucide-react";

export default function Favorites() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const { data: tenant, isLoading, error } = useGetTenantQuery(userId || "", {
    skip: !userId,
  });

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Heart className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Error loading favorites</p>
        </div>
      </div>
    );
  }

  const favorites = tenant?.favorites || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
          <p className="text-gray-600">
            {favorites.length} {favorites.length === 1 ? 'property' : 'properties'} saved
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <Heart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No favorites yet</h2>
            <p className="text-gray-500 mb-6">Start adding properties to your favorites!</p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition"
            >
              Browse Properties
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((property: any) => (
              <Link
                key={property.id}
                href={`/search/${property.id}`}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-all overflow-hidden group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={property.photoUrls?.[0] || "/placeholder-property.jpg"}
                    alt={property.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full">
                    <Heart className="w-5 h-5 fill-current" />
                  </div>
                  <div className="absolute bottom-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    GH₵{property.pricePerMonth}/mo
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-500 transition">
                    {property.name}
                  </h3>

                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      {property.location?.city}, {property.location?.state}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      <span>{property.beds} beds</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4" />
                      <span>{property.baths} baths</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize className="w-4 h-4" />
                      <span>{property.squareFeet} sqft</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500">
                      {property.propertyType}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}