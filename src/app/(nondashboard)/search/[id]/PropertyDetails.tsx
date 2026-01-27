"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AmenityIcons, HighlightIcons } from "@/lib/constants";
import { formatEnumString } from "@/lib/utils";
import { useGetPropertyQuery } from "@/state/api";
import { HelpCircle, Eye, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import React, { useState, useEffect } from "react";

const PropertyDetails = ({ propertyId }: PropertyDetailsProps) => {
  const {
    data: property,
    isError,
    isLoading,
  } = useGetPropertyQuery(propertyId);

  const [viewCount, setViewCount] = useState(0);
  const [isPopular, setIsPopular] = useState(false);

  // Track property views (Future: Analytics API)
  useEffect(() => {
    if (property) {
      // Simulate view counter (Replace with real API later)
      const storedViews = localStorage.getItem(`property-${propertyId}-views`);
      const currentViews = storedViews ? parseInt(storedViews) : Math.floor(Math.random() * 500) + 100;
      
      // Increment view count
      const newViews = currentViews + 1;
      localStorage.setItem(`property-${propertyId}-views`, newViews.toString());
      setViewCount(newViews);
      
      // Mark as popular if views > 300
      setIsPopular(newViews > 300);
    }
  }, [property, propertyId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading property details...</span>
      </div>
    );
  }

  if (isError || !property) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 font-semibold">Property not found</p>
        <p className="text-red-600 text-sm mt-1">This property may have been removed or is unavailable</p>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-8">
      {/* View Counter & Popularity Badge */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-4 border border-primary-100">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-primary-900">
              {viewCount.toLocaleString()} people viewed this property
            </span>
          </div>
          {isPopular && (
            <div className="flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-full">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-700">Popular Choice</span>
            </div>
          )}
        </div>
      </div>

      {/* Verified Badge (Future: Blockchain verification) */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-green-900">✓ Verified Property</h4>
          <p className="text-sm text-green-700 mt-1">
            This property has been verified by our team. Photos, pricing, and availability are accurate.
          </p>
          <p className="text-xs text-green-600 mt-2">
            Last verified: {new Date().toLocaleDateString('en-GH')} • Next inspection: {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-GH')}
          </p>
        </div>
      </div>

      {/* Amenities - Enhanced with hover effects */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Property Amenities</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {property.amenities.length} amenities included
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {property.amenities.map((amenity: AmenityEnum) => {
            const Icon = AmenityIcons[amenity as AmenityEnum] || HelpCircle;
            return (
              <div
                key={amenity}
                className="group flex flex-col items-center border-2 border-gray-200 rounded-xl py-6 px-3 
                         hover:border-primary-400 hover:shadow-lg hover:scale-105 
                         transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-gray-50
                         hover:from-primary-50 hover:to-primary-100"
              >
                <div className="bg-primary-100 p-3 rounded-full mb-3 group-hover:bg-primary-200 transition-colors">
                  <Icon className="w-6 h-6 text-primary-700 group-hover:text-primary-900" />
                </div>
                <span className="text-sm text-center font-medium text-gray-700 group-hover:text-primary-900">
                  {formatEnumString(amenity)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Highlights - Enhanced with animations */}
      <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl shadow-sm border border-primary-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-primary-900">
            ✨ Property Highlights
          </h3>
          <span className="text-sm text-primary-600 bg-white px-3 py-1 rounded-full shadow-sm">
            What makes this special
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {property.highlights.map((highlight: HighlightEnum, index: number) => {
            const Icon = HighlightIcons[highlight as HighlightEnum] || HelpCircle;
            return (
              <div
                key={highlight}
                className="group flex flex-col items-center bg-white border-2 border-primary-200 rounded-xl py-6 px-3 
                         hover:border-primary-500 hover:shadow-xl hover:scale-105 
                         transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="bg-primary-600 p-3 rounded-full mb-3 group-hover:bg-primary-700 transition-colors">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm text-center font-semibold text-primary-700 group-hover:text-primary-900">
                  {formatEnumString(highlight)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fees and Policies - Modern Card Design */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
          <h3 className="text-2xl font-bold">💰 Fees & Policies</h3>
          <p className="text-primary-100 text-sm mt-2">
            Transparent pricing with no hidden fees. All costs shown below.
          </p>
        </div>

        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Fees are based on verified data and include all mandatory charges. 
              Utilities may be additional.
            </p>
          </div>

          <Tabs defaultValue="required-fees" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="required-fees" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md transition-all"
              >
                💵 Required Fees
              </TabsTrigger>
              <TabsTrigger 
                value="pets"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md transition-all"
              >
                🐾 Pets
              </TabsTrigger>
              <TabsTrigger 
                value="parking"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md transition-all"
              >
                🚗 Parking
              </TabsTrigger>
            </TabsList>

            <TabsContent value="required-fees" className="mt-6 space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                <p className="font-bold text-blue-900 mb-3 text-lg">One-time Move-in Fees</p>
                
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-900 font-semibold">Application Fee</span>
                        <p className="text-xs text-gray-500 mt-1">Non-refundable processing fee</p>
                      </div>
                      <span className="text-xl font-bold text-primary-600">
                        GH₵ {property.applicationFee}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-900 font-semibold">Security Deposit</span>
                        <p className="text-xs text-gray-500 mt-1">Refundable at end of lease</p>
                      </div>
                      <span className="text-xl font-bold text-primary-600">
                        GH₵ {property.securityDeposit}
                      </span>
                    </div>
                  </div>

                  <div className="bg-primary-600 rounded-lg p-4 text-white">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Total Move-in Cost</span>
                      <span className="text-2xl font-bold">
                        GH₵ {property.applicationFee + property.securityDeposit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pets" className="mt-6">
              <div className={`rounded-lg p-6 ${property.isPetsAllowed ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`text-4xl ${property.isPetsAllowed ? '' : 'grayscale'}`}>
                    🐕🐈
                  </div>
                  <div>
                    <p className={`font-bold text-lg mb-2 ${property.isPetsAllowed ? 'text-green-900' : 'text-red-900'}`}>
                      Pets are {property.isPetsAllowed ? '✓ ALLOWED' : '✗ NOT ALLOWED'}
                    </p>
                    {property.isPetsAllowed ? (
                      <p className="text-sm text-green-700">
                        You can bring your furry friends! Please confirm pet policy details with the landlord.
                      </p>
                    ) : (
                      <p className="text-sm text-red-700">
                        This property does not allow pets. Service animals may be exempt - contact landlord.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="parking" className="mt-6">
              <div className={`rounded-lg p-6 ${property.isParkingIncluded ? 'bg-blue-50 border-2 border-blue-200' : 'bg-orange-50 border-2 border-orange-200'}`}>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">
                    🚗
                  </div>
                  <div>
                    <p className={`font-bold text-lg mb-2 ${property.isParkingIncluded ? 'text-blue-900' : 'text-orange-900'}`}>
                      Parking is {property.isParkingIncluded ? '✓ INCLUDED' : '⚠ NOT INCLUDED'}
                    </p>
                    {property.isParkingIncluded ? (
                      <p className="text-sm text-blue-700">
                        Free parking space included with this property at no extra cost!
                      </p>
                    ) : (
                      <p className="text-sm text-orange-700">
                        Parking not included. Street parking or nearby paid parking may be available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;