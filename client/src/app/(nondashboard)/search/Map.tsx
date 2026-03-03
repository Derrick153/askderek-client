// components/Map.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppSelector } from "@/state/redux";
import { useGetPropertiesQuery } from "@/state/api";
import { Property } from "@/types/prismaTypes";

// Replace with your Tarkwa style URL
const MAPBOX_STYLE = "mapbox://styles/askderek-tarkwa/cmkftvlao00cc01sd8lo7gdz6";

// Western Region Ghana coordinates
const WESTERN_REGION_CENTER: [number, number] = [-1.9856, 5.3068]; // Tarkwa
const WESTERN_REGION_BOUNDS: mapboxgl.LngLatBoundsLike = [
  [-3.2, 4.5], // Southwest
  [-2.0, 5.8]  // Northeast
];

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

const Map = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  const filters = useAppSelector((state) => state.global.filters);
  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map only once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLE, // Your custom Tarkwa style
      center: filters.coordinates || WESTERN_REGION_CENTER,
      zoom: 11, // Better zoom for Western Region
      maxBounds: WESTERN_REGION_BOUNDS,
      attributionControl: false
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl());
    
    // Add scale (kilometers for Ghana)
    map.addControl(new mapboxgl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-right');

    map.on('load', () => {
      setMapLoaded(true);
      // Add Western Region specific layers if needed
      addWesternRegionFeatures(map);
    });

    mapRef.current = map;

    // Handle window resize with proper debouncing
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        map.resize();
      }, 250);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty dependency - init only once

  // Update map center when filters change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    if (filters.coordinates) {
      mapRef.current.flyTo({
        center: filters.coordinates,
        zoom: 13,
        duration: 1000
      });
    }
  }, [filters.coordinates, mapLoaded]);

  // Update markers when properties change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !properties) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    properties.forEach((property) => {
      if (property.location?.coordinates) {
        const marker = createPropertyMarker(property, mapRef.current!);
        markersRef.current.push(marker);
      }
    });
  }, [properties, mapLoaded]);

  const addWesternRegionFeatures = (map: mapboxgl.Map) => {
    // Add important locations in Western Region
    const landmarks = [
      { name: "Tarkwa", coordinates: [-1.9856, 5.3068], icon: "🏭" },
      { name: "Takoradi", coordinates: [-1.7831, 4.9016], icon: "🌊" },
      { name: "Sekondi", coordinates: [-1.7040, 4.9431], icon: "⚓" },
      { name: "Axim", coordinates: [-2.2405, 4.8690], icon: "🏖️" },
      { name: "UMaT", coordinates: [-1.9556, 5.2983], icon: "🎓" },
    ];

    landmarks.forEach(landmark => {
      const el = document.createElement('div');
      el.className = 'town-label';
      el.innerHTML = `
        <div class="bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow text-xs font-semibold border border-blue-200">
          ${landmark.icon} ${landmark.name}
        </div>
      `;

      new mapboxgl.Marker(el)
        .setLngLat(landmark.coordinates as [number, number])
        .addTo(map);
    });
  };

  const createPropertyMarker = (property: Property, map: mapboxgl.Map) => {
    // Create custom marker element
    const el = document.createElement('div');
    el.className = 'property-marker';
    
    // Determine marker color based on property type
    let markerColor = '#3B82F6'; // Default blue for houses
    let markerIcon = '🏠';
    
    switch(property.propertyType?.toLowerCase()) {
      case 'land':
        markerColor = '#10B981';
        markerIcon = '📍';
        break;
      case 'commercial':
        markerColor = '#F59E0B';
        markerIcon = '🏢';
        break;
      case 'apartment':
        markerColor = '#8B5CF6';
        markerIcon = '🏘️';
        break;
    }

    el.innerHTML = `
      <div class="relative cursor-pointer">
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-base shadow-lg hover:scale-110 transition-transform"
             style="background-color: ${markerColor};">
          ${markerIcon}
        </div>
        ${property.pricePerMonth && property.pricePerMonth < 1000 ? 
          `<div class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1 rounded-full">Hot</div>` : ''}
      </div>
    `;

    // Create enhanced popup
    const popupContent = `
      <div class="property-popup p-3 max-w-xs">
        <div class="flex items-start gap-3">
          <div class="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
            ${markerIcon}
          </div>
          <div>
            <h4 class="font-bold text-sm mb-1">${property.name || 'Property'}</h4>
            <p class="text-green-600 font-bold text-lg">GH₵ ${property.pricePerMonth?.toLocaleString() || 'N/A'}</p>
            <p class="text-gray-600 text-xs">${property.location?.address || 'Western Region'}</p>
            <div class="flex gap-2 mt-2">
              ${property.beds ? `<span class="text-xs bg-gray-100 px-2 py-1 rounded">${property.beds} beds</span>` : ''}
              ${property.baths ? `<span class="text-xs bg-gray-100 px-2 py-1 rounded">${property.baths} baths</span>` : ''}
            </div>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-gray-200">
          <button onclick="window.open('/search/${property.id}', '_blank')" 
                  class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-medium transition">
            View Details
          </button>
          <button onclick="window.open('https://wa.me/?text=Hello, I\\'m interested in ${encodeURIComponent(property.name || 'this property')}', '_blank')"
                  class="w-full mt-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-medium transition">
            💬 WhatsApp Inquiry
          </button>
        </div>
      </div>
    `;

    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: false,
      className: 'custom-popup'
    }).setHTML(popupContent);

    const marker = new mapboxgl.Marker(el)
      .setLngLat([
        property.location.coordinates.longitude,
        property.location.coordinates.latitude
      ])
      .setPopup(popup)
      .addTo(map);

    // Add click handler
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      // Center map on property
      map.flyTo({
        center: [
          property.location.coordinates.longitude,
          property.location.coordinates.latitude
        ],
        zoom: 15,
        duration: 1000
      });
    });

    return marker;
  };

  if (isLoading) {
    return (
      <div className="basis-5/12 grow relative rounded-xl bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Western Region map...</p>
        </div>
      </div>
    );
  }

  if (isError || !properties) {
    return (
      <div className="basis-5/12 grow relative rounded-xl bg-red-50 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600 font-medium">Failed to load properties</p>
          <p className="text-gray-600 text-sm mt-2">Please check your connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="basis-5/12 grow relative rounded-xl overflow-hidden">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 rounded-xl"
      />
      
      {/* Map Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.flyTo({
                center: WESTERN_REGION_CENTER,
                zoom: 11,
                duration: 1000
              });
            }
          }}
          className="bg-white p-2 rounded shadow hover:shadow-md transition"
          title="Reset to Tarkwa view"
        >
          <span className="text-lg">📍</span>
        </button>
        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.zoomIn();
            }
          }}
          className="bg-white p-2 rounded shadow hover:shadow-md transition"
          title="Zoom in"
        >
          <span className="text-lg">➕</span>
        </button>
        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.zoomOut();
            }
          }}
          className="bg-white p-2 rounded shadow hover:shadow-md transition"
          title="Zoom out"
        >
          <span className="text-lg">➖</span>
        </button>
      </div>
      
      {/* Property Count */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded shadow">
        <div className="font-semibold text-blue-600">
          {properties.length} properties
        </div>
        <div className="text-xs text-gray-500">in Western Region</div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded shadow">
        <h4 className="font-bold text-sm mb-2">Property Types</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs">Houses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs">Land</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs">Commercial</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;