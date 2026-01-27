import { useGetPropertyQuery } from "@/state/api";
import { MapPin, Star, Shield } from "lucide-react";
import React from "react";

const PropertyOverview = ({ propertyId }: PropertyOverviewProps) => {
  const {
    data: property,
    isError,
    isLoading,
  } = useGetPropertyQuery(propertyId);

  if (isLoading) return <>Loading...</>;
  if (isError || !property) {
    return <>Property not Found</>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
          <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-200">
            🇬🇭 {property.location?.country || "Ghana"}
          </span>
          / {property.location?.state || "Western Region"} /{" "}
          <span className="font-semibold text-gray-600">
            {property.location?.city || "Tarkwa"}
          </span>
        </div>
        <h1 className="text-3xl font-bold my-5">{property.name}</h1>
        <div className="flex justify-between items-center">
          <span className="flex items-center text-gray-500">
            <MapPin className="w-4 h-4 mr-1 text-gray-700" />
            {property.location?.city || "Tarkwa"},{" "}
            {property.location?.state || "Western Region"},{" "}
            {property.location?.country || "Ghana"}
          </span>
          <div className="flex justify-between items-center gap-3">
            <span className="flex items-center text-yellow-500">
              <Star className="w-4 h-4 mr-1 fill-current" />
              {property.averageRating.toFixed(1)} ({property.numberOfReviews}{" "}
              Reviews)
            </span>
            <span className="flex items-center gap-1 text-green-600 font-semibold">
              <Shield className="w-4 h-4" />
              Derek Verified
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="border border-primary-200 rounded-xl p-6 mb-6 bg-gradient-to-br from-orange-50/50 to-white">
        <div className="flex justify-between items-center gap-4 px-5">
          <div>
            <div className="text-sm text-gray-500">Monthly Rent</div>
            <div className="font-semibold text-orange-600">
              GH₵ {property.pricePerMonth.toLocaleString()}
            </div>
          </div>
          <div className="border-l border-gray-300 h-10"></div>
          <div>
            <div className="text-sm text-gray-500">Bedrooms</div>
            <div className="font-semibold">{property.beds} bd</div>
          </div>
          <div className="border-l border-gray-300 h-10"></div>
          <div>
            <div className="text-sm text-gray-500">Bathrooms</div>
            <div className="font-semibold">{property.baths} ba</div>
          </div>
          <div className="border-l border-gray-300 h-10"></div>
          <div>
            <div className="text-sm text-gray-500">Square Feet</div>
            <div className="font-semibold">
              {property.squareFeet.toLocaleString()} sq ft
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="my-16">
        <h2 className="text-xl font-semibold mb-5">About {property.name}</h2>
        <p className="text-gray-600 leading-7">
          {property.description}
        </p>
        
        {/* Derek Verified Badge */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Derek Verified Property</h3>
              <p className="text-sm text-green-700">
                This property has been personally inspected and verified by the Ask Derek team. 
                All photos are real, the landlord is verified, and the location is accurate. 
                No agent fees. No scams. Just honest property listings in Tarkwa.
              </p>
            </div>
          </div>
        </div>

        {/* Location Context */}
        <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <h3 className="font-semibold text-orange-900 mb-2">📍 Perfect Location in Tarkwa</h3>
          <p className="text-sm text-orange-700 leading-relaxed">
            Conveniently located in {property.location?.city || "Tarkwa"}, 
            this property offers easy access to UMaT campus, Tarkwa market, 
            and major transport routes. Close to shops, restaurants, and essential services. 
            Safe neighborhood with 24/7 security. Ideal for students, young professionals, 
            and families looking for quality housing in Western Region.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PropertyOverview;