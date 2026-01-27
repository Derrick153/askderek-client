"use client";

import { useUser } from "@clerk/nextjs";
import { useGetPropertiesQuery } from "@/state/api";
import Link from "next/link";
import { Building2, MapPin, DollarSign, Users, Eye, Plus, Edit, Trash2 } from "lucide-react";

export default function ManagerPropertiesPage() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const { data: properties, isLoading, error } = useGetPropertiesQuery({
    managerClerkId: userId,
  });

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Error loading properties</p>
        </div>
      </div>
    );
  }

  const totalProperties = properties?.length || 0;
  const activeListings = properties?.filter((p: any) => p.availabilityStatus === "available").length || 0;
  const totalRevenue = properties?.reduce((sum: number, p: any) => sum + (p.pricePerMonth || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Properties</h1>
            <p className="text-gray-600">{totalProperties} total properties</p>
          </div>
          <Link
            href="/managers/newproperty"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition font-semibold"
          >
            <Plus className="w-5 h-5" />
            Add New Property
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Properties</p>
                <p className="text-3xl font-bold text-gray-900">{totalProperties}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Listings</p>
                <p className="text-3xl font-bold text-gray-900">{activeListings}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Eye className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Value/Month</p>
                <p className="text-3xl font-bold text-gray-900">GH₵{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {!properties || properties.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <Building2 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No properties yet</h2>
            <p className="text-gray-500 mb-6">Start by adding your first property listing!</p>
            <Link
              href="/managers/newproperty"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition"
            >
              <Plus className="w-5 h-5" />
              Add Your First Property
            </Link>
          </div>
        ) : (
          /* Properties Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property: any) => (
              <div
                key={property.id}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-all overflow-hidden"
              >
                {/* Property Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={property.photoUrls?.[0] || "/placeholder-property.jpg"}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        property.availabilityStatus === "available"
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {property.availabilityStatus === "available" ? "Available" : "Rented"}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    GH₵{property.pricePerMonth}/mo
                  </div>
                </div>

                {/* Property Details */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{property.name}</h3>

                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      {property.location?.city}, {property.location?.state}
                    </span>
                  </div>

                  {/* Property Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-100">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">{property.beds}</p>
                      <p className="text-xs text-gray-500">Beds</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">{property.baths}</p>
                      <p className="text-xs text-gray-500">Baths</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">{property.squareFeet}</p>
                      <p className="text-xs text-gray-500">Sqft</p>
                    </div>
                  </div>

                  {/* Applications Count */}
                  {property._count?.applications > 0 && (
                    <div className="flex items-center gap-2 text-blue-600 mb-4">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {property._count.applications} application{property._count.applications !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/search/${property.id}`}
                      className="flex-1 text-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                    >
                      View
                    </Link>
                    <button className="flex-1 text-center bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition text-sm font-medium flex items-center justify-center gap-1">
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}