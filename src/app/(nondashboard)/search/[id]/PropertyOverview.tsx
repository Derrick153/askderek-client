"use client";

import { useGetPropertyQuery } from "@/state/api";
import { MapPin, Star, Shield, Bed, Bath, Maximize2, ChevronRight, CheckCircle2, Flame } from "lucide-react";
import React, { useEffect, useState } from "react";

const PropertyOverview = ({ propertyId }: PropertyOverviewProps) => {
  const { data: property, isError, isLoading } = useGetPropertyQuery(propertyId);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  if (isLoading) return (
    <div className="space-y-4 pt-2">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      {[80, 48, 120, 96].map((h, i) => (
        <div key={i} className="rounded-2xl" style={{ height: h, background: '#FEF3C7', animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
      ))}
    </div>
  );

  if (isError || !property) return (
    <div className="rounded-3xl p-8 text-center" style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}>
      <div className="text-3xl mb-3">😕</div>
      <p className="font-semibold text-red-600">Property not available</p>
      <p className="text-sm text-red-400 mt-1">It may have been removed or rented out</p>
    </div>
  );

  const isAffordable = property.pricePerMonth < 2000;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&display=swap');

        .po-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
        .po-display { font-family: 'Fraunces', serif; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.88); }
          70%  { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmerMove {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(224,90,0,0); }
          50%       { box-shadow: 0 0 0 6px rgba(224,90,0,0.08); }
        }
        @keyframes tickIn {
          from { transform: scale(0) rotate(-30deg); opacity: 0; }
          to   { transform: scale(1) rotate(0); opacity: 1; }
        }

        .po-enter   { animation: slideUp    0.55s cubic-bezier(.22,1,.36,1) forwards; opacity: 0; }
        .po-right   { animation: slideRight 0.45s cubic-bezier(.22,1,.36,1) forwards; opacity: 0; }
        .po-pop     { animation: popIn      0.45s cubic-bezier(.22,1,.36,1) forwards; opacity: 0; }
        .d0  { animation-delay: 0s; }
        .d1  { animation-delay: 0.07s; }
        .d2  { animation-delay: 0.14s; }
        .d3  { animation-delay: 0.21s; }
        .d4  { animation-delay: 0.28s; }
        .d5  { animation-delay: 0.36s; }
        .d6  { animation-delay: 0.44s; }

        .price-hero {
          background: linear-gradient(135deg, #1A0800 0%, #3D1200 50%, #1A0800 100%);
          border-radius: 24px;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .price-hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 70% 60% at 80% 50%, rgba(224,90,0,0.25) 0%, transparent 70%);
        }
        .price-hero::after {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 160px; height: 160px;
          border-radius: 50%;
          border: 1px solid rgba(251,191,36,0.12);
        }
        .price-amount {
          font-family: 'Fraunces', serif;
          font-size: clamp(2rem, 7vw, 2.6rem);
          font-weight: 900;
          line-height: 1;
          background: linear-gradient(90deg, #FBBF24, #F97316, #FBBF24);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerMove 3s linear infinite;
        }

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 12px 14px;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          cursor: default;
        }
        .stat-pill:active { background: rgba(224,90,0,0.15); transform: scale(0.97); }
        .stat-pill-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .stat-pill-val {
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 1.1rem;
          color: white;
          line-height: 1;
        }
        .stat-pill-label {
          font-size: 0.68rem;
          color: rgba(255,255,255,0.45);
          margin-top: 2px;
          font-weight: 500;
        }

        .prop-title {
          font-family: 'Fraunces', serif;
          font-weight: 900;
          font-style: italic;
          line-height: 1.1;
          color: #1A0800;
          font-size: clamp(1.6rem, 5.5vw, 2.4rem);
        }

        .breadcrumb-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 0.72rem;
          font-weight: 600;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .rating-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #FFFBF5;
          border: 1px solid #FDE8C8;
          border-radius: 100px;
          padding: 5px 12px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #92400E;
          animation: breathe 3s ease-in-out infinite;
        }

        .verified-card {
          background: linear-gradient(135deg, #F0FDF4, #DCFCE7);
          border: 1px solid #86EFAC;
          border-radius: 20px;
          padding: 16px 18px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .verified-tick {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: #16A34A;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          animation: tickIn 0.5s cubic-bezier(.22,1,.36,1) 0.6s backwards;
        }

        .location-card {
          background: linear-gradient(135deg, #FFFBF5 0%, #FEF3C7 100%);
          border: 1px solid #FDE8C8;
          border-radius: 20px;
          padding: 18px;
          position: relative;
          overflow: hidden;
        }
        .location-card::after {
          content: '📍';
          position: absolute;
          right: -8px; bottom: -12px;
          font-size: 80px;
          opacity: 0.06;
          pointer-events: none;
          transform: rotate(-10deg);
        }

        .desc-text {
          font-size: 0.9rem;
          line-height: 1.85;
          color: #4B3D2E;
        }

        .hot-deal {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: linear-gradient(135deg, #DC2626, #B91C1C);
          color: white;
          border-radius: 100px;
          padding: 4px 11px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .po-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #FDE8C8, transparent);
          margin: 4px 0;
        }

        .fact-tile {
          border-radius: 18px;
          padding: 14px 16px;
          background: #FFFBF5;
          border: 1px solid #FDE8C8;
          transition: border-color 0.2s;
        }
        .fact-tile:active { border-color: #F97316; }
      `}</style>

      <div className={`po-root space-y-5 pb-6 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>

        {/* BREADCRUMB */}
        <div className="po-right d0 flex items-center gap-1.5 flex-wrap">
          <span className="breadcrumb-item" style={{ background: '#F0FDF4', border: '1px solid #86EFAC', color: '#1