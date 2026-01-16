"use client";

import { useGetPropertyQuery } from "@/state/api";
import { MapPin, Navigation, Phone } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useEffect, useRef } from "react";

mapboxgl.accessToken = process.env
  .NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

/* =======================
   Types
======================= */
interface PropertyDetailsProps {
  propertyId: string;
}

/* =======================
   Component
======================= */
const PropertyLocation = ({ propertyId }: PropertyDetailsProps) => {
  const {
    data: property,
    isError,
    isLoading,
  } = useGetPropertyQuery(propertyId);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isLoading || isError || !property || !mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [
        property.location.coordinates.longitude,
        property.location.coordinates.latitude,
      ],
      zoom: 15,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const el = document.createElement("div");
    el.className = "custom-marker";
    el.style.backgroundImage =
      "url(https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png)";
    el.style.width = "40px";
    el.style.height = "40px";
    el.style.backgroundSize = "100%";
    el.style.filter = "hue-rotate(20deg) saturate(150%)";

    const marker = new mapboxgl.Marker(el)
      .setLngLat([
        property.location.coordinates.longitude,
        property.location.coordinates.latitude,
      ])
      .addTo(map);

    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div class="p-2">
        <h3 class="font-bold text-orange-600">${property.name}</h3>
        <p class="text-sm text-gray-600">
          ${property.location?.address || "Tarkwa, Ghana"}
        </p>
      </div>
    `);

    marker.setPopup(popup);

    return () => {
      map.remove();
    };
  }, [property, isError, isLoading]);

  if (isLoading) return <>Loading...</>;
  if (isError || !property) return <>Property not found</>;

  const shareOnWhatsApp = () => {
    const address = property.location?.address || "Tarkwa, Ghana";
    const coords = `${property.location.coordinates.latitude},${property.location.coordinates.longitude}`;
    const message = `Check out this property in Tarkwa: ${property.name}
Location: ${address}
View on map: https://maps.google.com/?q=${coords}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <div className="py-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-orange-500" />
          Map and Location
        </h3>
        <span className="text-sm px-3 py-1 bg-green-50 text-green-700 rounded-full font-semibold border border-green-200">
          📍 Exact Location
        </span>
      </div>

      {/* Address Bar */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center text-sm text-orange-600 font-semibold mb-1">
              <MapPin className="w-4 h-4 mr-2" />
              Property Address
            </div>
            <p className="text-gray-900 font-bold text-lg">
              {property.location?.address ||
                "Tarkwa, Western Region, Ghana"}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {property.location?.city || "Tarkwa"},{" "}
              {property.location?.state || "Western Region"},{" "}
              {property.location?.country || "Ghana"}
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href={`https://maps.google.com/?q=${property.location.coordinates.latitude},${property.location.coordinates.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-orange-500 text-orange-600 rounded-lg hover:bg-orange-500 hover:text-white transition-all font-semibold"
            >
              <Navigation className="w-4 h-4" />
              Directions
            </a>

            <button
              onClick={shareOnWhatsApp}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold"
            >
              <Phone className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border-2 border-orange-200 shadow-lg">
        <div ref={mapContainerRef} className="h-[400px] w-full" />

        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Coordinates</p>
          <p className="text-sm font-mono font-semibold text-gray-900">
            {property.location.coordinates.latitude.toFixed(6)},{" "}
            {property.location.coordinates.longitude.toFixed(6)}
          </p>
        </div>
      </div>

      {/* Nearby Landmarks */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-1">🎓 Near UMaT</h4>
          <p className="text-sm text-blue-700">
            Close to University of Mines and Technology campus
          </p>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-semibold text-purple-900 mb-1">🛒 Shopping</h4>
          <p className="text-sm text-purple-700">
            Local markets and shops nearby
          </p>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-1">🚌 Transport</h4>
          <p className="text-sm text-green-700">
            Easy access to public transport
          </p>
        </div>
      </div>
    </div>
  );
};

export default PropertyLocation;
