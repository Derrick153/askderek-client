"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppSelector } from "@/state/redux";
import { useGetPropertiesQuery } from "@/state/api";
import { Property } from "@/types/prismaTypes";

const TARKWA_CENTER: [number, number] = [-1.9856, 5.3068];
const GHANA_BOUNDS: mapboxgl.LngLatBoundsLike = [[-3.5, 4.2], [-0.5, 6.0]];

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

const Map = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeProperty, setActiveProperty] = useState<number | null>(null);

  const filters = useAppSelector((state) => state.global.filters);
  const { data: properties, isLoading, isError } = useGetPropertiesQuery(filters);

  // Init map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: filters.coordinates || TARKWA_CENTER,
      zoom: 12,
      maxBounds: GHANA_BOUNDS,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 80, unit: "metric" }), "bottom-right");

    map.on("load", () => {
      setMapLoaded(true);

      // Style water and roads for Ghana vibe
      try {
        if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", "#D4EAF7");
        if (map.getLayer("land")) map.setPaintProperty("land", "background-color", "#FAFAF8");
      } catch (_) {}
    });

    mapRef.current = map;

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => map.resize(), 200); };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly to filter coordinates
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !filters.coordinates) return;
    mapRef.current.flyTo({ center: filters.coordinates, zoom: 13, duration: 1200, essential: true });
  }, [filters.coordinates, mapLoaded]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !properties) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    properties.forEach((property) => {
      if (!property.location?.coordinates) return;
      const marker = buildMarker(property, mapRef.current!, setActiveProperty);
      markersRef.current.push(marker);
    });
  }, [properties, mapLoaded]);

  if (isLoading) return (
    <div className="basis-5/12 grow relative rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: '#FFFBF5', border: '1px solid #FDE8C8' }}>
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-orange-500 border-orange-200 animate-spin mx-auto" />
        <p className="text-sm font-medium" style={{ color: '#92400E' }}>Loading Tarkwa map…</p>
      </div>
    </div>
  );

  if (isError || !properties) return (
    <div className="basis-5/12 grow relative rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: '#FFF7F7', border: '1px solid #FECACA' }}>
      <div className="text-center space-y-2 p-8">
        <div className="text-3xl">⚠️</div>
        <p className="font-semibold text-red-600 text-sm">Could not load map</p>
        <p className="text-xs text-gray-500">Please check your connection</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
        .map-syne { font-family: 'Syne', sans-serif; }
        .map-sans { font-family: 'DM Sans', sans-serif; }

        .property-pin {
          cursor: pointer;
          transition: transform 0.2s ease;
          filter: drop-shadow(0 4px 8px rgba(224,90,0,0.35));
        }
        .property-pin:hover { transform: scale(1.15) translateY(-2px); }

        .mapboxgl-ctrl-group {
          border: 1px solid #FDE8C8 !important;
          border-radius: 12px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
        }
        .mapboxgl-ctrl-group button {
          border-color: #FEF3C7 !important;
        }
        .mapboxgl-ctrl-scale {
          background: rgba(255,255,255,0.9) !important;
          border: 1px solid #FDE8C8 !important;
          border-radius: 8px !important;
          font-size: 10px !important;
          color: #92400E !important;
          backdrop-filter: blur(4px) !important;
        }

        .askderek-map-popup .mapboxgl-popup-content {
          border-radius: 16px !important;
          padding: 0 !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12) !important;
          border: 1px solid #FDE8C8 !important;
          overflow: hidden !important;
        }
        .askderek-map-popup .mapboxgl-popup-close-button {
          color: #9CA3AF !important;
          font-size: 16px !important;
          padding: 6px 10px !important;
          z-index: 10;
        }
        .askderek-map-popup .mapboxgl-popup-tip {
          border-top-color: white !important;
        }

        @keyframes markerPop {
          0% { transform: scale(0) translateY(10px); opacity: 0; }
          70% { transform: scale(1.1) translateY(-2px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .marker-anim { animation: markerPop 0.4s ease forwards; }
      `}</style>

      <div className="basis-5/12 grow relative rounded-2xl overflow-hidden map-sans" style={{ border: '1px solid #FDE8C8', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Property count */}
        <div className="absolute top-4 left-4 rounded-xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid #FDE8C8', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div className="map-syne font-bold" style={{ color: '#E05A00', fontSize: '1rem' }}>
            {properties.length}
          </div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>properties</div>
        </div>

        {/* Reset button */}
        <button
          onClick={() => mapRef.current?.flyTo({ center: TARKWA_CENTER, zoom: 12, duration: 1000 })}
          className="absolute top-16 right-4 w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all"
          style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #FDE8C8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', backdropFilter: 'blur(8px)' }}
          title="Reset to Tarkwa"
        >
          🏠
        </button>

        {/* Legend */}
        <div className="absolute bottom-10 left-4 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #FDE8C8', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div className="map-syne font-bold text-xs text-gray-700 mb-2">Property Types</div>
          <div className="space-y-1.5">
            {[
              { color: '#E05A00', label: 'House / Room' },
              { color: '#8B5CF6', label: 'Apartment' },
              { color: '#10B981', label: 'Land' },
              { color: '#F59E0B', label: 'Commercial' },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                <span className="text-xs" style={{ color: '#6B7280' }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Marker builder ───────────────────────────────────────────────────────────
function buildMarker(
  property: Property,
  map: mapboxgl.Map,
  setActive: (id: number | null) => void
): mapboxgl.Marker {
  const typeColors: Record<string, string> = {
    apartment: "#8B5CF6",
    land: "#10B981",
    commercial: "#F59E0B",
  };
  const color = typeColors[property.propertyType?.toLowerCase() ?? ""] ?? "#E05A00";

  const el = document.createElement("div");
  el.className = "property-pin marker-anim";
  el.innerHTML = `
    <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 0C8.954 0 0 8.954 0 20c0 14.142 20 32 20 32s20-17.858 20-32C40 8.954 31.046 0 20 0z" fill="${color}"/>
      <circle cx="20" cy="19" r="9" fill="white" opacity="0.9"/>
      <text x="20" y="24" text-anchor="middle" font-size="11" font-family="DM Sans, sans-serif" font-weight="700" fill="${color}">
        ₵${Math.round(property.pricePerMonth / 1000)}k
      </text>
    </svg>
  `;

  const popupHTML = `
    <div style="font-family: 'DM Sans', sans-serif; width: 240px;">
      <div style="background: linear-gradient(135deg, ${color}, ${color}CC); padding: 14px 16px;">
        <div style="font-weight: 700; color: white; font-size: 0.9rem; margin-bottom: 2px;">${property.name}</div>
        <div style="color: rgba(255,255,255,0.8); font-size: 0.72rem;">📍 ${property.location?.address || 'Tarkwa, Ghana'}</div>
      </div>
      <div style="padding: 12px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <div style="font-weight: 800; color: #E05A00; font-size: 1.1rem; font-family: 'Syne', sans-serif;">GH₵ ${property.pricePerMonth.toLocaleString()}</div>
            <div style="color: #9CA3AF; font-size: 0.68rem;">per month</div>
          </div>
          <div style="display: flex; gap: 6px;">
            ${property.beds ? `<span style="background: #FEF3C7; color: #92400E; padding: 3px 8px; border-radius: 100px; font-size: 0.7rem; font-weight: 600;">${property.beds} bd</span>` : ''}
            ${property.baths ? `<span style="background: #EFF6FF; color: #1D4ED8; padding: 3px 8px; border-radius: 100px; font-size: 0.7rem; font-weight: 600;">${property.baths} ba</span>` : ''}
          </div>
        </div>
        <a href="/search/${property.id}"
           style="display: block; width: 100%; background: linear-gradient(135deg, #E05A00, #B45309); color: white; text-align: center; padding: 9px; border-radius: 10px; font-weight: 600; font-size: 0.8rem; text-decoration: none; transition: all 0.2s;"
           onmouseover="this.style.background='linear-gradient(135deg, #F97316, #E05A00)'"
           onmouseout="this.style.background='linear-gradient(135deg, #E05A00, #B45309)'">
          View Property →
        </a>
      </div>
    </div>
  `;

  const popup = new mapboxgl.Popup({
    offset: 48,
    closeButton: true,
    className: "askderek-map-popup",
  }).setHTML(popupHTML);

  const marker = new mapboxgl.Marker(el)
    .setLngLat([property.location.coordinates.longitude, property.location.coordinates.latitude])
    .setPopup(popup)
    .addTo(map);

  el.addEventListener("click", (e) => {
    e.stopPropagation();
    setActive(property.id);
    map.flyTo({
      center: [property.location.coordinates.longitude, property.location.coordinates.latitude],
      zoom: 15,
      duration: 900,
    });
  });

  return marker;
}

export default Map;