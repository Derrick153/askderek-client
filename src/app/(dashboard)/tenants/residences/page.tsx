"use client";

import { useUser } from "@clerk/nextjs";
import { useGetCurrentResidencesQuery } from "@/state/api";
import Link from "next/link";
import { 
  Home, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText, 
  ArrowRight, 
  Building2,
  Phone,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download
} from "lucide-react";
import { format, differenceInDays, isPast, isFuture } from "date-fns";
import { Button } from "@/components/ui/button";

export default function ResidencesPage() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const { data: residences, isLoading, error } = useGetCurrentResidencesQuery(userId || "", {
    skip: !userId,
  });

  // ✅ PROFESSIONAL LOADING STATE - Ghana Style
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-20 h-20 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Loading Your Residences</h3>
            <p className="text-gray-600">Please wait while we fetch your rental information...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ PROFESSIONAL ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border-2 border-red-200">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3">Unable to Load Residences</h2>
            <p className="text-gray-600 mb-6">
              We're having trouble connecting to our servers. Please check your internet connection and try again.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate total rent across all residences
  const totalMonthlyRent = residences?.reduce((sum, property) => sum + (property.pricePerMonth || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* ✅ PROFESSIONAL HEADER - Ghana Brand */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">My Residences</h1>
              <p className="text-gray-600">
                {residences?.length || 0} active {residences?.length === 1 ? 'rental' : 'rentals'} in Tarkwa
              </p>
            </div>
          </div>

          {/* ✅ STATS CARDS - Financial Overview */}
          {residences && residences.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white rounded-xl p-5 border-2 border-orange-200 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Active Rentals</p>
                    <p className="text-2xl font-black text-orange-600">{residences.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border-2 border-green-200 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Monthly Rent</p>
                    <p className="text-2xl font-black text-green-600">GH₵{totalMonthlyRent.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Status</p>
                    <p className="text-2xl font-black text-blue-600">All Active</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ✅ EMPTY STATE - Professional Ghana Style */}
        {!residences || residences.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200">
            <div className="text-center py-20 px-6">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-12 h-12 text-orange-600" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-3">No Active Residences</h2>
              <p className="text-gray-600 mb-2 max-w-md mx-auto leading-relaxed">
                You don't have any active rental agreements yet. Find your perfect home in Tarkwa today!
              </p>
              <p className="text-sm text-orange-600 font-semibold mb-8">
                🇬🇭 Verified properties | 📱 WhatsApp landlords | ✅ No agent fees
              </p>
              
              <Link href="/search">
                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-300">
                  <Home className="w-5 h-5 mr-2" />
                  Find Your Home
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>

              {/* ✅ BENEFITS - Why rent with Ask Derek */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 max-w-3xl mx-auto">
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-bold text-green-900 text-sm">Derek Verified</p>
                  <p className="text-xs text-green-700 mt-1">All properties inspected</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <MessageCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-bold text-blue-900 text-sm">Direct Contact</p>
                  <p className="text-xs text-blue-700 mt-1">WhatsApp landlords instantly</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                  <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="font-bold text-purple-900 text-sm">No Hidden Fees</p>
                  <p className="text-xs text-purple-700 mt-1">Transparent pricing only</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ✅ RESIDENCES GRID - Professional Cards */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {residences.map((property: any) => {
              // Find the active lease
              const activeLease = property.leases?.find((lease: any) => 
                lease.status === "active" || isFuture(new Date(lease.endDate))
              );

              // Calculate days until lease ends
              const daysUntilEnd = activeLease ? differenceInDays(new Date(activeLease.endDate), new Date()) : 0;
              const isExpiringSoon = daysUntilEnd > 0 && daysUntilEnd <= 30;

              return (
                <div
                  key={property.id}
                  className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-orange-300 group"
                >
                  {/* ✅ PROPERTY IMAGE */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={property.photoUrls?.[0] || "/placeholder-property.jpg"}
                      alt={property.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* STATUS BADGES */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <div className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-black shadow-lg flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Active Lease
                      </div>
                      {isExpiringSoon && (
                        <div className="bg-orange-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires in {daysUntilEnd} days
                        </div>
                      )}
                    </div>

                    {/* DEREK VERIFIED BADGE */}
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg border border-green-200">
                      <p className="text-xs font-bold text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Derek Verified
                      </p>
                    </div>
                  </div>

                  {/* ✅ PROPERTY DETAILS */}
                  <div className="p-6">
                    <h3 className="text-2xl font-black text-gray-900 mb-2 line-clamp-1">{property.name}</h3>
                    
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-semibold">
                        {property.location?.city || 'Tarkwa'}, {property.location?.state || 'Western Region'}
                      </span>
                    </div>

                    {/* ✅ LEASE INFO - Ghana Format */}
                    {activeLease && (
                      <div className="space-y-3 mb-5 pb-5 border-b-2 border-gray-100">
                        <div className="flex items-center justify-between bg-orange-50 p-3 rounded-xl">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-orange-600" />
                            <span className="text-sm font-bold text-gray-700">Monthly Rent</span>
                          </div>
                          <span className="text-2xl font-black text-orange-600">
                            GH₵{property.pricePerMonth?.toLocaleString() || '0'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 p-3 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 text-gray-600" />
                              <span className="text-xs font-bold text-gray-600">Lease Start</span>
                            </div>
                            <p className="text-sm font-black text-gray-900">
                              {format(new Date(activeLease.startDate), "MMM dd, yyyy")}
                            </p>
                          </div>

                          <div className="bg-gray-50 p-3 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 text-gray-600" />
                              <span className="text-xs font-bold text-gray-600">Lease End</span>
                            </div>
                            <p className="text-sm font-black text-gray-900">
                              {format(new Date(activeLease.endDate), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-900">Security Deposit</span>
                            <span className="text-sm font-black text-blue-600">
                              GH₵{activeLease.deposit?.toLocaleString() || '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ✅ PROPERTY FEATURES - Ghana Style */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 text-center border border-orange-200">
                        <p className="text-2xl font-black text-orange-600">{property.beds}</p>
                        <p className="text-xs font-bold text-orange-900">Bedrooms</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center border border-blue-200">
                        <p className="text-2xl font-black text-blue-600">{property.baths}</p>
                        <p className="text-xs font-bold text-blue-900">Bathrooms</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center border border-green-200">
                        <p className="text-2xl font-black text-green-600">{property.squareFeet}</p>
                        <p className="text-xs font-bold text-green-900">Sq Ft</p>
                      </div>
                    </div>

                    {/* ✅ ACTION BUTTONS - Professional Ghana */}
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href={`/search/${property.id}`}
                        className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm shadow-lg hover:shadow-xl"
                      >
                        <Home className="w-4 h-4" />
                        View Details
                      </Link>
                      
                      {activeLease && (
                        <Link
                          href={`/tenants/residences/${property.id}`}
                          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm shadow-lg hover:shadow-xl"
                        >
                          <FileText className="w-4 h-4" />
                          Payments
                        </Link>
                      )}
                    </div>

                    {/* ✅ LANDLORD CONTACT - WhatsApp Priority */}
                    {property.manager && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-100">
                        <p className="text-xs font-bold text-gray-600 mb-2">Need help? Contact landlord:</p>
                        <div className="flex gap-2">
                          <a
                            href={`https://wa.me/${property.manager.phoneNumber?.replace(/^0/, '233')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white px-3 py-2 rounded-lg transition-all duration-200 font-bold text-xs"
                          >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                          </a>
                          <a
                            href={`tel:${property.manager.phoneNumber}`}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-all duration-200 font-bold text-xs"
                          >
                            <Phone className="w-4 h-4" />
                            Call
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ✅ FOOTER NOTE - Ghana Transparency */}
        {residences && residences.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl p-6 border-2 border-green-200 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-black text-green-900 mb-2">🇬🇭 All Properties Derek Verified</h3>
                <p className="text-sm text-green-700 leading-relaxed">
                  Every property listed here has been personally inspected by the Ask Derek team. 
                  All photos are real, landlords are verified, and locations are accurate. 
                  We're committed to honest, transparent property rentals in Tarkwa and Western Region.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}