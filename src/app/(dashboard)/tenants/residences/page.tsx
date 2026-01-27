"use client";

import { useUser } from "@clerk/nextjs";
import { useGetCurrentResidencesQuery } from "@/state/api";
import Link from "next/link";
import { Home, MapPin, Calendar, DollarSign, FileText, ArrowRight, Building2 } from "lucide-react";
import { format } from "date-fns";

export default function ResidencesPage() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const { data: residences, isLoading, error } = useGetCurrentResidencesQuery(userId || "", {
    skip: !userId,
  });

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your residences...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Home className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Error loading residences</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Current Residences</h1>
          <p className="text-gray-600">
            {residences?.length || 0} active {residences?.length === 1 ? 'rental' : 'rentals'}
          </p>
        </div>

        {/* Empty state */}
        {!residences || residences.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <Building2 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No active residences</h2>
            <p className="text-gray-500 mb-6">You don't have any active rental agreements yet.</p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition"
            >
              Find a Home
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          /* Residences list */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {residences.map((property: any) => {
              // Find the active lease for this property
              const activeLease = property.leases?.find((lease: any) => lease.status === "active");

              return (
                <div
                  key={property.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-all overflow-hidden"
                >
                  {/* Property Image */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={property.photoUrls?.[0] || "/placeholder-property.jpg"}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Active Lease
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{property.name}</h3>
                    
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">
                        {property.location?.city}, {property.location?.state}
                      </span>
                    </div>

                    {/* Lease Info */}
                    {activeLease && (
                      <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-sm">Monthly Rent</span>
                          </div>
                          <span className="font-bold text-gray-900">GH₵{property.pricePerMonth}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">Lease Start</span>
                          </div>
                          <span className="text-sm text-gray-900">
                            {format(new Date(activeLease.startDate), "MMM dd, yyyy")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">Lease End</span>
                          </div>
                          <span className="text-sm text-gray-900">
                            {format(new Date(activeLease.endDate), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Property Features */}
                    <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-orange-500">{property.beds}</p>
                        <p className="text-xs text-gray-600">Bedrooms</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-orange-500">{property.baths}</p>
                        <p className="text-xs text-gray-600">Bathrooms</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-orange-500">{property.squareFeet}</p>
                        <p className="text-xs text-gray-600">Sq Ft</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/search/${property.id}`}
                        className="flex-1 text-center bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition font-medium text-sm"
                      >
                        View Details
                      </Link>
                      {activeLease && (
                        <Link
                          href={`/tenants/payments?leaseId=${activeLease.id}`}
                          className="flex-1 text-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium text-sm flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Payments
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}