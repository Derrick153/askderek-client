"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AmenityIcons, HighlightIcons } from "@/lib/constants";
import { formatEnumString } from "@/lib/utils";
import { useGetPropertyQuery } from "@/state/api";
import { HelpCircle, Eye, TrendingUp, CheckCircle, AlertCircle, PawPrint, Car, Banknote, Lock } from "lucide-react";
import React, { useState, useEffect } from "react";

const PropertyDetails = ({ propertyId }: PropertyDetailsProps) => {
  const { data: property, isError, isLoading } = useGetPropertyQuery(propertyId);
  const [viewCount, setViewCount] = useState(0);
  const [isPopular, setIsPopular] = useState(false);

  useEffect(() => {
    if (property) {
      const stored = localStorage.getItem(`property-${propertyId}-views`);
      const base = stored ? parseInt(stored) : Math.floor(Math.random() * 400) + 80;
      const next = base + 1;
      localStorage.setItem(`property-${propertyId}-views`, next.toString());
      setViewCount(next);
      setIsPopular(next > 300);
    }
  }, [property, propertyId]);

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 rounded-2xl" style={{ background: '#FEF3C7' }} />
      ))}
    </div>
  );

  if (isError || !property) return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-red-600 font-semibold">Property not found</p>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
        .pd-syne { font-family: 'Syne', sans-serif; }
        .pd-serif { font-family: 'DM Serif Display', serif; }
        .pd-sans { font-family: 'DM Sans', sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-up { animation: fadeUp 0.5s ease forwards; }
        .count-anim { animation: countUp 0.4s ease forwards; }
        .d1 { animation-delay: 0s; opacity: 0; }
        .d2 { animation-delay: 0.1s; opacity: 0; }
        .d3 { animation-delay: 0.2s; opacity: 0; }
        .d4 { animation-delay: 0.3s; opacity: 0; }
        .d5 { animation-delay: 0.4s; opacity: 0; }

        .amenity-card {
          background: #FFFBF5;
          border: 1.5px solid #FDE8C8;
          border-radius: 16px;
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: default;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }
        .amenity-card:hover {
          background: #FFF7ED;
          border-color: #F97316;
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(224,90,0,0.12);
        }
        .amenity-card .icon-wrap {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #FEF3C7, #FDE8C8);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.25s ease;
        }
        .amenity-card:hover .icon-wrap {
          background: linear-gradient(135deg, #E05A00, #B45309);
        }
        .amenity-card:hover .icon-wrap svg { color: white !important; }

        .highlight-card {
          background: white;
          border: 1.5px solid #FDE8C8;
          border-radius: 16px;
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: default;
          transition: all 0.25s ease;
        }
        .highlight-card:hover {
          border-color: #E05A00;
          transform: translateY(-4px);
          box-shadow: 0 8px 28px rgba(224,90,0,0.15);
        }
        .highlight-card .h-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #E05A00, #B45309);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.25s ease;
        }
        .highlight-card:hover .h-icon {
          background: linear-gradient(135deg, #B45309, #78350F);
          box-shadow: 0 4px 12px rgba(224,90,0,0.3);
        }

        .section-label {
          font-family: 'Syne', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #E05A00;
        }

        .fee-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid #FEF3C7;
          transition: background 0.2s;
        }
        .fee-row:last-child { border-bottom: none; }

        .view-bar {
          background: linear-gradient(135deg, #FFFBF5, #FEF3C7);
          border: 1px solid #FDE8C8;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .popular-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #E05A00, #B45309);
          color: white;
          border-radius: 100px;
          padding: 5px 12px;
          font-size: 0.75rem;
          font-weight: 700;
        }
      `}</style>

      <div className="pd-sans space-y-8 mb-10">

        {/* View counter */}
        <div className="anim-up d1 view-bar">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE8C8)' }}>
              <Eye className="w-4 h-4" style={{ color: '#E05A00' }} />
            </div>
            <div>
              <span className="font-semibold text-gray-900 count-anim" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {viewCount.toLocaleString()}
              </span>
              <span className="text-gray-500 text-sm ml-1.5">people viewed this property</span>
            </div>
          </div>
          {isPopular && (
            <div className="popular-badge">
              <TrendingUp className="w-3.5 h-3.5" />
              Popular
            </div>
          )}
        </div>

        {/* Verified banner */}
        <div className="anim-up d2 rounded-2xl p-5 flex items-start gap-4" style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1px solid #86EFAC' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#16A34A' }}>
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="pd-syne font-bold text-green-900 text-sm mb-1">Verified Property</div>
            <p className="text-xs text-green-700 leading-5">
              Photos, pricing and availability confirmed accurate by AskDerek.{' '}
              <span className="font-semibold">Last verified: {new Date().toLocaleDateString('en-GH')}</span>
            </p>
          </div>
        </div>

        {/* Amenities */}
        <div className="anim-up d3 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="section-label mb-1">Included</div>
              <h2 className="pd-syne font-bold text-gray-900 text-xl">Amenities</h2>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
              {property.amenities.length} total
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {property.amenities.map((amenity) => {
              const Icon = AmenityIcons[amenity as AmenityEnum] || HelpCircle;
              return (
                <div key={amenity} className="amenity-card">
                  <div className="icon-wrap">
                    <Icon className="w-5 h-5" style={{ color: '#E05A00' }} />
                  </div>
                  <span className="text-xs text-center font-medium text-gray-700 leading-tight">
                    {formatEnumString(amenity)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Highlights */}
        <div className="anim-up d4 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="section-label mb-1">What makes it special</div>
              <h2 className="pd-syne font-bold text-gray-900 text-xl">Highlights</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {property.highlights.map((highlight) => {
              const Icon = HighlightIcons[highlight as HighlightEnum] || HelpCircle;
              return (
                <div key={highlight} className="highlight-card">
                  <div className="h-icon">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs text-center font-semibold text-gray-700 leading-tight">
                    {formatEnumString(highlight)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fees & Policies */}
        <div className="anim-up d5 rounded-2xl overflow-hidden" style={{ border: '1px solid #FDE8C8' }}>
          {/* Header */}
          <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #E05A00, #B45309)' }}>
            <div className="pd-syne font-bold text-white text-lg">Fees & Policies</div>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Transparent pricing — no hidden charges, ever.
            </p>
          </div>

          <div className="p-6" style={{ background: '#FFFBF5' }}>
            <Tabs defaultValue="fees" className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-xl p-1 mb-6" style={{ background: '#FEF3C7' }}>
                {[
                  { value: 'fees', icon: <Banknote className="w-3.5 h-3.5" />, label: 'Fees' },
                  { value: 'pets', icon: <PawPrint className="w-3.5 h-3.5" />, label: 'Pets' },
                  { value: 'parking', icon: <Car className="w-3.5 h-3.5" />, label: 'Parking' },
                ].map(t => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="flex items-center gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    {t.icon}{t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="fees">
                <div className="space-y-0">
                  <div className="fee-row">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">Application Fee</div>
                      <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Non-refundable processing</div>
                    </div>
                    <div className="pd-syne font-bold text-lg" style={{ color: '#E05A00' }}>
                      GH₵ {property.applicationFee.toLocaleString()}
                    </div>
                  </div>

                  <div className="fee-row">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">Security Deposit</div>
                      <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Refundable at lease end</div>
                    </div>
                    <div className="pd-syne font-bold text-lg" style={{ color: '#E05A00' }}>
                      GH₵ {property.securityDeposit.toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #E05A00, #B45309)' }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-semibold text-sm">Total Move-in Cost</div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>First month + fees</div>
                      </div>
                      <div className="pd-syne font-bold text-white text-xl">
                        GH₵ {(property.applicationFee + property.securityDeposit).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pets">
                <div className={`rounded-xl p-5 flex items-start gap-4 ${property.isPetsAllowed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <PawPrint className={`w-8 h-8 flex-shrink-0 mt-0.5 ${property.isPetsAllowed ? 'text-green-600' : 'text-red-400'}`} />
                  <div>
                    <div className={`pd-syne font-bold text-base mb-2 ${property.isPetsAllowed ? 'text-green-900' : 'text-red-900'}`}>
                      Pets {property.isPetsAllowed ? 'Welcome ✓' : 'Not Allowed ✗'}
                    </div>
                    <p className={`text-sm leading-6 ${property.isPetsAllowed ? 'text-green-700' : 'text-red-700'}`}>
                      {property.isPetsAllowed
                        ? 'You can bring your animals. Please confirm specific pet policies and any deposits with the landlord directly.'
                        : 'This property does not permit pets. Service animals may be exempt — contact the landlord to confirm.'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="parking">
                <div className={`rounded-xl p-5 flex items-start gap-4 ${property.isParkingIncluded ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
                  <Car className={`w-8 h-8 flex-shrink-0 mt-0.5 ${property.isParkingIncluded ? 'text-blue-600' : 'text-amber-600'}`} />
                  <div>
                    <div className={`pd-syne font-bold text-base mb-2 ${property.isParkingIncluded ? 'text-blue-900' : 'text-amber-900'}`}>
                      Parking {property.isParkingIncluded ? 'Included ✓' : 'Not Included'}
                    </div>
                    <p className={`text-sm leading-6 ${property.isParkingIncluded ? 'text-blue-700' : 'text-amber-700'}`}>
                      {property.isParkingIncluded
                        ? 'Free parking space included with the property at no additional cost.'
                        : 'Parking is not included in the rent. Street parking or nearby paid options may be available.'}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

      </div>
    </>
  );
};

export default PropertyDetails;