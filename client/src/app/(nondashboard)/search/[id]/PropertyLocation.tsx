"use client";

import { useGetPropertyQuery } from "@/state/api";
import { MapPin, Navigation, Share2, ExternalLink } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useEffect, useRef } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

interface PropertyDetailsProps {
  propertyId: number;
}

const PropertyLocation = ({ propertyId }: PropertyDetailsProps) => {
  const { data: property, isError, isLoading } = useGetPropertyQuery(propertyId);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isLoading || isError || !property || !mapContainerRef.current) return;

    const lng = property.location.coordinates.longitude;
    const lat = property.location.coordinates.latitude;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom: 15,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    // Custom orange marker
    const el = document.createElement("div");
    el.style.cssText = `
      width: 48px; height: 48px;
      background: linear-gradient(135deg, #E05A00, #B45309);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 16px rgba(224,90,0,0.4);
      border: 3px solid white;
      cursor: pointer;
      transition: transform 0.2s ease;
    `;
    el.onmouseenter = () => { el.style.transform = 'rotate(-45deg) scale(1.1)'; };
    el.onmouseleave = () => { el.style.transform = 'rotate(-45deg) scale(1)'; };

    // Inner dot
    const inner = document.createElement("div");
    inner.style.cssText = `
      width: 12px; height: 12px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    `;
    el.appendChild(inner);

    const popup = new mapboxgl.Popup({
      offset: 36,
      closeButton: false,
      className: "askderek-popup",
    }).setHTML(`
      <div style="font-family: 'DM Sans', sans-serif; padding: 12px 16px; min-width: 180px;">
        <div style="font-weight: 700; color: #E05A00; margin-bottom: 4px; font-size: 0.9rem;">${property.name}</div>
        <div style="color: #6B7280; font-size: 0.75rem; display: flex; align-items: center; gap: 4px;">
          <span>📍</span> ${property.location?.address || 'Tarkwa, Ghana'}
        </div>
      </div>
    `);

    new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);

    // Style the map after load
    map.on("load", () => {
      // Darken water
      if (map.getLayer("water")) {
        map.setPaintProperty("water", "fill-color", "#EBF4FB");
      }
    });

    return () => { map.remove(); };
  }, [property, isError, isLoading]);

  if (isLoading) return (
    <div className="py-12 space-y-4 animate-pulse">
      <div className="h-6 bg-amber-100 rounded w-40" />
      <div className="h-72 bg-amber-50 rounded-2xl" />
    </div>
  );

  if (isError || !property) return (
    <div className="py-12 rounded-2xl bg-red-50 border border-red-200 text-center p-8">
      <p className="text-red-500 font-semibold">Location unavailable</p>
    </div>
  );

  const lat = property.location.coordinates.latitude;
  const lng = property.location.coordinates.longitude;
  const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

  const shareOnWhatsApp = () => {
    const msg = `Check out this property on AskDerek:\n*${property.name}*\n📍 ${property.location?.address || 'Tarkwa, Ghana'}\n🗺️ ${googleMapsUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const landmarks = [
    { icon: "🎓", title: "Near UMaT", desc: "University of Mines and Technology campus" },
    { icon: "🛒", title: "Market Access", desc: "Local markets and shops nearby" },
    { icon: "🚌", title: "Transport Links", desc: "Easy access to public transport" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .pl-syne { font-family: 'Syne', sans-serif; }
        .pl-sans { font-family: 'DM Sans', sans-serif; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .pl-anim { animation: fadeUp 0.5s ease forwards; }
        .pl-d1 { animation-delay: 0s; opacity: 0; }
        .pl-d2 { animation-delay: 0.1s; opacity: 0; }
        .pl-d3 { animation-delay: 0.2s; opacity: 0; }
        .pl-d4 { animation-delay: 0.3s; opacity: 0; }

        .landmark-card {
          background: #FFFBF5;
          border: 1px solid #FDE8C8;
          border-radius: 14px;
          padding: 16px;
          transition: all 0.25s ease;
        }
        .landmark-card:hover {
          border-color: #F97316;
          box-shadow: 0 4px 16px rgba(224,90,0,0.1);
          transform: translateY(-2px);
        }

        .mapboxgl-ctrl-group {
          border: 1px solid #FDE8C8 !important;
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
        }
        .mapboxgl-ctrl-group button { border: none !important; }

        .askderek-popup .mapboxgl-popup-content {
          border-radius: 12px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
          padding: 0 !important;
          border: 1px solid #FDE8C8 !important;
        }
        .askderek-popup .mapboxgl-popup-tip { border-top-color: white !important; }

        .coord-badge {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(224,90,0,0.15);
          border-radius: 12px;
          padding: 10px 14px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
      `}</style>

      <div className="pl-sans py-12 space-y-6">

        {/* Section header */}
        <div className="pl-anim pl-d1 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#E05A00' }}>Where you'll live</div>
            <h3 className="pl-syne font-bold text-gray-900 text-xl flex items-center gap-2">
              <MapPin className="w-5 h-5" style={{ color: '#E05A00' }} />
              Map & Location
            </h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #86EFAC' }}>
            📍 Exact Location Shown
          </span>
        </div>

        {/* Address card */}
        <div className="pl-anim pl-d2 rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #FFFBF5, #FEF3C7)', border: '1px solid #FDE8C8' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: '#E05A00' }}>Property Address</div>
              <div className="pl-syne font-bold text-gray-900 text-lg">
                {property.location?.address || 'Tarkwa, Western Region, Ghana'}
              </div>
              <div className="text-sm mt-1" style={{ color: '#6B7280' }}>
                {property.location?.city || 'Tarkwa'}, {property.location?.state || 'Western Region'}, {property.location?.country || 'Ghana'}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'white', border: '1.5px solid #E05A00', color: '#E05A00' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E05A00'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; (e.currentTarget as HTMLElement).style.color = '#E05A00'; }}
              >
                <Navigation className="w-4 h-4" />
                Directions
              </a>

              <button
                onClick={shareOnWhatsApp}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#16A34A' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#15803D'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#16A34A'; }}
              >
                <Share2 className="w-4 h-4" />
                Share on WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="pl-anim pl-d3 relative rounded-2xl overflow-hidden" style={{ border: '1.5px solid #FDE8C8', boxShadow: '0 4px 24px rgba(224,90,0,0.1)' }}>
          <div ref={mapContainerRef} style={{ height: '420px', width: '100%' }} />

          {/* Coordinates badge */}
          <div className="absolute bottom-4 left-4 coord-badge">
            <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Coordinates</div>
            <div className="font-mono text-sm font-semibold text-gray-900">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
          </div>

          {/* Open full map */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#E05A00', border: '1px solid #FDE8C8', backdropFilter: 'blur(8px)' }}
          >
            <ExternalLink className="w-3 h-3" />
            Open in Google Maps
          </a>
        </div>

        {/* Nearby landmarks */}
        <div className="pl-anim pl-d4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {landmarks.map((l, i) => (
            <div key={i} className="landmark-card">
              <div className="text-2xl mb-2">{l.icon}</div>
              <div className="pl-syne font-bold text-gray-900 text-sm mb-1">{l.title}</div>
              <p className="text-xs leading-5" style={{ color: '#6B7280' }}>{l.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </>
  );
};

export default PropertyLocation;