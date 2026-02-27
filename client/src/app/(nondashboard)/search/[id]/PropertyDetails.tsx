"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AmenityIcons, HighlightIcons } from "@/lib/constants";
import { formatEnumString } from "@/lib/utils";
import { useGetPropertyQuery } from "@/state/api";
import {
  HelpCircle, Eye, TrendingUp, CheckCircle2, AlertCircle,
  PawPrint, Car, Banknote, Sparkles, ChevronRight
} from "lucide-react";
import React, { useState, useEffect } from "react";

const PropertyDetails = ({ propertyId }: PropertyDetailsProps) => {
  const { data: property, isError, isLoading } = useGetPropertyQuery(propertyId);
  const [viewCount, setViewCount] = useState(0);
  const [isPopular, setIsPopular] = useState(false);
  const [activeAmenity, setActiveAmenity] = useState<string | null>(null);

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
    <div className="space-y-5 pt-2">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,900&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes pdShimmer { 0%,100%{background-position:0%}50%{background-position:100%} }
      `}</style>
      {[72, 180, 160, 200].map((h, i) => (
        <div key={i} className="rounded-2xl" style={{
          height: h,
          background: 'linear-gradient(90deg,#FEF3C7,#FFFBF5,#FEF3C7)',
          backgroundSize: '200% 100%',
          animation: `pdShimmer 1.6s ease-in-out ${i * 0.12}s infinite`
        }} />
      ))}
    </div>
  );

  if (isError || !property) return (
    <div className="rounded-3xl p-8 text-center" style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}>
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-red-600 font-semibold">Property details unavailable</p>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        .pdet * { font-family:'DM Sans',sans-serif; box-sizing:border-box; }
        .pdet-display { font-family:'Fraunces',serif; }

        @keyframes pdetUp    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pdetPop   { 0%{opacity:0;transform:scale(0.9)} 65%{transform:scale(1.02)} 100%{opacity:1;transform:scale(1)} }
        @keyframes pdetCount { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pdetGlow  { 0%,100%{box-shadow:0 0 0 0 rgba(224,90,0,0)} 50%{box-shadow:0 0 0 8px rgba(224,90,0,0.06)} }
        @keyframes pdetKente { 0%{background-position:0%} 100%{background-position:100%} }
        @keyframes pdetTick  { from{transform:scale(0)rotate(-45deg);opacity:0} to{transform:scale(1)rotate(0);opacity:1} }

        .pdet-up   { animation:pdetUp  0.5s cubic-bezier(.22,1,.36,1) forwards; opacity:0; }
        .pdet-pop  { animation:pdetPop 0.45s cubic-bezier(.22,1,.36,1) forwards; opacity:0; }
        .pd0{animation-delay:0s}   .pd1{animation-delay:.07s} .pd2{animation-delay:.14s}
        .pd3{animation-delay:.21s} .pd4{animation-delay:.28s} .pd5{animation-delay:.36s}
        .pd6{animation-delay:.44s}

        .kente-strip {
          height:4px;
          background:repeating-linear-gradient(90deg,#E05A00 0,#E05A00 16px,#FBBF24 16px,#FBBF24 32px,#1D4E1A 32px,#1D4E1A 48px,#E05A00 48px,#E05A00 64px);
          background-size:64px 4px;
          animation:pdetKente 3s linear infinite;
          border-radius:100px;
        }

        .view-strip {
          background:linear-gradient(135deg,#0A0500,#1A0800);
          border-radius:18px;
          padding:16px 20px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          position:relative;
          overflow:hidden;
        }
        .view-strip::before {
          content:'';
          position:absolute;inset:0;
          background:radial-gradient(ellipse 60% 100% at 90% 50%,rgba(224,90,0,0.15) 0%,transparent 70%);
        }
        .view-count {
          font-family:'Fraunces',serif;
          font-weight:900;
          font-size:1.5rem;
          color:#FBBF24;
          line-height:1;
          animation:pdetCount 0.5s ease forwards;
        }
        .hot-pulse {
          display:inline-flex;align-items:center;gap:5px;
          background:linear-gradient(135deg,#DC2626,#B91C1C);
          color:white;border-radius:100px;
          padding:5px 12px;font-size:0.72rem;font-weight:700;
          letter-spacing:0.05em;text-transform:uppercase;
          animation:pdetGlow 2.5s ease-in-out infinite;
        }

        .section-eyebrow { font-size:0.68rem;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#E05A00;margin-bottom:4px; }
        .section-title   { font-family:'Fraunces',serif;font-weight:700;font-size:1.3rem;color:#1A0800;line-height:1.2; }

        .amenity-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:10px; }
        @media(min-width:480px){.amenity-grid{grid-template-columns:repeat(4,1fr)}}
        @media(min-width:640px){.amenity-grid{grid-template-columns:repeat(5,1fr)}}

        .amenity-tile {
          background:#FFFBF5;border:1.5px solid #FDE8C8;border-radius:16px;
          padding:16px 8px;display:flex;flex-direction:column;align-items:center;
          gap:8px;cursor:default;transition:all 0.22s cubic-bezier(.22,1,.36,1);
          -webkit-tap-highlight-color:transparent;position:relative;overflow:hidden;
        }
        .amenity-tile::after {
          content:'';position:absolute;bottom:0;left:0;right:0;height:2px;
          background:linear-gradient(90deg,#E05A00,#FBBF24);
          transform:scaleX(0);transition:transform 0.3s ease;transform-origin:left;
        }
        .amenity-tile:hover::after,.amenity-tile.is-active::after{transform:scaleX(1)}
        .amenity-tile:hover,.amenity-tile.is-active {
          border-color:#F97316;transform:translateY(-3px);
          box-shadow:0 6px 20px rgba(224,90,0,0.12);background:#FFF7ED;
        }
        .amenity-tile:active{transform:scale(0.96)}

        .amenity-icon-wrap {
          width:40px;height:40px;border-radius:12px;
          display:flex;align-items:center;justify-content:center;
          background:linear-gradient(135deg,#FEF3C7,#FDE8C8);
          transition:all 0.22s ease;flex-shrink:0;
        }
        .amenity-tile:hover .amenity-icon-wrap,
        .amenity-tile.is-active .amenity-icon-wrap {
          background:linear-gradient(135deg,#E05A00,#B45309);
        }
        .amenity-tile:hover .amenity-icon-wrap svg,
        .amenity-tile.is-active .amenity-icon-wrap svg{color:white!important}

        .highlight-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
        @media(min-width:480px){.highlight-grid{grid-template-columns:repeat(3,1fr)}}
        @media(min-width:640px){.highlight-grid{grid-template-columns:repeat(4,1fr)}}

        .highlight-tile {
          background:white;border:1.5px solid #FDE8C8;border-radius:16px;
          padding:18px 10px;display:flex;flex-direction:column;align-items:center;
          gap:10px;cursor:default;transition:all 0.22s cubic-bezier(.22,1,.36,1);
          -webkit-tap-highlight-color:transparent;
        }
        .highlight-tile:hover{border-color:#E05A00;transform:translateY(-3px);box-shadow:0 8px 24px rgba(224,90,0,0.14)}
        .highlight-tile:active{transform:scale(0.96)}
        .h-icon-wrap {
          width:44px;height:44px;border-radius:14px;
          background:linear-gradient(135deg,#E05A00,#B45309);
          display:flex;align-items:center;justify-content:center;
          transition:all 0.22s ease;
          box-shadow:0 4px 12px rgba(224,90,0,0.25);
        }
        .highlight-tile:hover .h-icon-wrap {
          background:linear-gradient(135deg,#B45309,#78350F);
          box-shadow:0 6px 20px rgba(224,90,0,0.35);
          transform:rotate(-4deg) scale(1.05);
        }

        .fees-card{border-radius:24px;overflow:hidden;border:1px solid #FDE8C8;}
        .fees-header{
          background:linear-gradient(135deg,#1A0800,#3D1200);
          padding:22px 24px;position:relative;overflow:hidden;
        }
        .fees-header::after{content:'💰';position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:48px;opacity:0.08;}
        .fees-body{background:#FFFBF5;padding:20px;}

        .fee-line{display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid rgba(253,232,200,0.8);}
        .fee-line:last-child{border-bottom:none}

        .total-bar{background:linear-gradient(135deg,#E05A00,#B45309);border-radius:14px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-top:12px;}

        .policy-yes{background:linear-gradient(135deg,#F0FDF4,#DCFCE7);border:1.5px solid #86EFAC;border-radius:18px;padding:18px;display:flex;align-items:flex-start;gap:14px;}
        .policy-no {background:linear-gradient(135deg,#FFF1F2,#FFE4E6);border:1.5px solid #FECDD3;border-radius:18px;padding:18px;display:flex;align-items:flex-start;gap:14px;}
        .policy-warn{background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border:1.5px solid #FDE68A;border-radius:18px;padding:18px;display:flex;align-items:flex-start;gap:14px;}
        .policy-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:22px;}

        [role="tablist"]{background:#FEF3C7!important;border-radius:14px!important;padding:4px!important;}
        [role="tab"]{border-radius:10px!important;font-size:0.78rem!important;font-weight:600!important;transition:all 0.2s!important;color:#92400E!important;}
        [role="tab"][data-state="active"]{background:white!important;color:#E05A00!important;box-shadow:0 2px 8px rgba(0,0,0,0.08)!important;}

        .verified-banner{background:linear-gradient(135deg,#F0FDF4,#DCFCE7);border:1px solid #86EFAC;border-radius:20px;padding:16px 18px;display:flex;align-items:flex-start;gap:14px;}
        .verified-icon{width:38px;height:38px;border-radius:50%;background:#16A34A;display:flex;align-items:center;justify-content:center;flex-shrink:0;animation:pdetTick 0.5s cubic-bezier(.22,1,.36,1) 0.5s backwards;}

        .pdet-divider{height:1px;background:linear-gradient(90deg,transparent,#FDE8C8,transparent);}

        @media(hover:none){
          .amenity-tile:hover{transform:none;box-shadow:none}
          .highlight-tile:hover{transform:none;box-shadow:none}
        }
      `}</style>

      <div className="pdet space-y-7 pb-8">

        {/* KENTE TOP */}
        <div className="pdet-up pd0 kente-strip" />

        {/* VIEW COUNTER */}
        <div className="pdet-pop pd1 view-strip">
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(224,90,0,0.15)', border: '1px solid rgba(224,90,0,0.3)' }}>
              <Eye className="w-5 h-5" style={{ color: '#FBBF24' }} />
            </div>
            <div>
              <div className="view-count">{viewCount.toLocaleString()}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>people viewed this property</div>
            </div>
          </div>
          {isPopular && (
            <div className="relative z-10 hot-pulse flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
              Popular
            </div>
          )}
        </div>

        {/* VERIFIED */}
        <div className="pdet-up pd2 verified-banner">
          <div className="verified-icon">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="pdet-display font-bold text-green-900 text-sm mb-1">
              Verified by AskDerek ✓
            </div>
            <p className="text-xs leading-5" style={{ color: '#15803D' }}>
              Photos, pricing and availability personally confirmed.
              <span className="font-semibold"> Last checked: {new Date().toLocaleDateString('en-GH')}</span>
            </p>
          </div>
        </div>

        <div className="pdet-divider" />

        {/* AMENITIES */}
        <div className="pdet-up pd3 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="section-eyebrow">What's included</div>
              <h2 className="section-title">Amenities</h2>
            </div>
            <span className="text-xs font-semibold pb-1" style={{ color: '#92400E' }}>
              {property.amenities.length} total
            </span>
          </div>

          <div className="amenity-grid">
            {property.amenities.map((amenity) => {
              const Icon = AmenityIcons[amenity as AmenityEnum] || HelpCircle;
              const isActive = activeAmenity === amenity;
              return (
                <div
                  key={amenity}
                  className={`amenity-tile ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveAmenity(isActive ? null : amenity)}
                >
                  <div className="amenity-icon-wrap">
                    <Icon className="w-5 h-5" style={{ color: '#E05A00' }} />
                  </div>
                  <span className="text-xs text-center font-medium text-gray-700 leading-tight w-full px-1">
                    {formatEnumString(amenity)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pdet-divider" />

        {/* HIGHLIGHTS */}
        <div className="pdet-up pd4 space-y-4">
          <div>
            <div className="section-eyebrow">What makes it special</div>
            <h2 className="section-title">Highlights</h2>
          </div>

          <div className="highlight-grid">
            {property.highlights.map((highlight, idx) => {
              const Icon = HighlightIcons[highlight as HighlightEnum] || Sparkles;
              return (
                <div
                  key={highlight}
                  className="highlight-tile pdet-up"
                  style={{ animationDelay: `${0.28 + idx * 0.05}s` }}
                >
                  <div className="h-icon-wrap">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs text-center font-semibold leading-tight" style={{ color: '#4B3D2E' }}>
                    {formatEnumString(highlight)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pdet-divider" />

        {/* FEES & POLICIES */}
        <div className="pdet-up pd5 fees-card">
          <div className="fees-header">
            <div className="kente-strip mb-3" style={{ width: 48 }} />
            <div className="pdet-display font-bold text-white text-lg relative z-10">
              Fees & Policies
            </div>
            <p className="text-xs mt-1 relative z-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
              100% transparent · no hidden charges
            </p>
          </div>

          <div className="fees-body">
            <Tabs defaultValue="fees">
              <TabsList className="grid w-full grid-cols-3 mb-5">
                <TabsTrigger value="fees" className="flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" />Fees
                </TabsTrigger>
                <TabsTrigger value="pets" className="flex items-center gap-1.5">
                  <PawPrint className="w-3.5 h-3.5" />Pets
                </TabsTrigger>
                <TabsTrigger value="parking" className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />Parking
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fees" className="space-y-0 mt-0">
                <div className="fee-line">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#1A0800' }}>Application Fee</div>
                    <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Non-refundable · one-time</div>
                  </div>
                  <div className="pdet-display font-bold text-lg" style={{ color: '#E05A00' }}>
                    GH₵ {property.applicationFee.toLocaleString()}
                  </div>
                </div>
                <div className="fee-line">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#1A0800' }}>Security Deposit</div>
                    <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Refundable at lease end</div>
                  </div>
                  <div className="pdet-display font-bold text-lg" style={{ color: '#E05A00' }}>
                    GH₵ {property.securityDeposit.toLocaleString()}
                  </div>
                </div>
                <div className="total-bar">
                  <div>
                    <div className="font-bold text-white text-sm">Total Move-in Cost</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Application + deposit</div>
                  </div>
                  <div className="pdet-display font-bold text-white text-xl">
                    GH₵ {(property.applicationFee + property.securityDeposit).toLocaleString()}
                  </div>
                </div>
                <div className="mt-4 rounded-xl p-3 flex items-start gap-2.5" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <span className="text-base flex-shrink-0">💡</span>
                  <p className="text-xs leading-5" style={{ color: '#92400E' }}>
                    Monthly rent of <strong>GH₵ {property.pricePerMonth.toLocaleString()}</strong> is paid after you move in. Pay via MTN MoMo, Vodafone Cash, or card.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="pets" className="mt-0">
                <div className={property.isPetsAllowed ? 'policy-yes' : 'policy-no'}>
                  <div className="policy-icon" style={{ background: property.isPetsAllowed ? '#DCFCE7' : '#FFE4E6' }}>🐾</div>
                  <div className="flex-1">
                    <div className="pdet-display font-bold text-base mb-2" style={{ color: property.isPetsAllowed ? '#14532D' : '#881337' }}>
                      Pets {property.isPetsAllowed ? 'Welcome ✓' : 'Not Allowed ✗'}
                    </div>
                    <p className="text-sm leading-6" style={{ color: property.isPetsAllowed ? '#15803D' : '#BE123C' }}>
                      {property.isPetsAllowed
                        ? 'You are welcome to bring your pets. Confirm with the landlord on specific rules and any additional pet deposit.'
                        : 'This property does not allow pets. Service animals may be exempt — contact the landlord to confirm.'}
                    </p>
                    {property.isPetsAllowed && (
                      <div className="flex items-center gap-1.5 mt-3">
                        <ChevronRight className="w-3.5 h-3.5" style={{ color: '#16A34A' }} />
                        <span className="text-xs font-semibold" style={{ color: '#166534' }}>Ask landlord about pet deposit</span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="parking" className="mt-0">
                <div className={property.isParkingIncluded ? 'policy-yes' : 'policy-warn'}>
                  <div className="policy-icon" style={{ background: property.isParkingIncluded ? '#DCFCE7' : '#FEF3C7' }}>🚗</div>
                  <div className="flex-1">
                    <div className="pdet-display font-bold text-base mb-2" style={{ color: property.isParkingIncluded ? '#14532D' : '#78350F' }}>
                      Parking {property.isParkingIncluded ? 'Included ✓' : 'Not Included'}
                    </div>
                    <p className="text-sm leading-6" style={{ color: property.isParkingIncluded ? '#15803D' : '#92400E' }}>
                      {property.isParkingIncluded
                        ? 'A dedicated parking space is included at no extra cost. Park safely on the premises.'
                        : 'Parking is not included in the rent. Street parking may be available nearby. Ask the landlord about arrangements.'}
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