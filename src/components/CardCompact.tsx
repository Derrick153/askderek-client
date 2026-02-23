import { Bath, Bed, Heart, House, Star, Share2, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Property } from "@/types/prismaTypes";

interface CardCompactProps {
  property: Property;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  showFavoriteButton?: boolean;
  propertyLink: string;
}

const CardCompact = ({
  property,
  isFavorite,
  onFavoriteToggle,
  showFavoriteButton = true,
  propertyLink,
}: CardCompactProps) => {
  const [imgSrc, setImgSrc] = useState(
    property.photoUrls?.[0] || "/x.jpg"
  );
  const [showCopied, setShowCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${propertyLink}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      alert("Failed to copy link");
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border-2 border-gray-100 hover:shadow-2xl hover:border-orange-200 transition-all duration-300 group">
      <div className="flex flex-col sm:flex-row h-auto sm:h-48">
        {/* ✅ IMAGE SECTION - Responsive */}
        <div className="relative w-full sm:w-2/5 h-48 sm:h-full flex-shrink-0">
          <Link href={propertyLink} scroll={false}>
            <Image
              src={imgSrc}
              alt={property.name}
              fill
              unoptimized
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, 40vw"
              onError={() => setImgSrc("/osu.jpg")}
            />
          </Link>
          
          {/* BADGES */}
          <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
            {property.isPetsAllowed && (
              <span className="bg-white/95 backdrop-blur-sm text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                🐾 Pets
              </span>
            )}
            {property.isParkingIncluded && (
              <span className="bg-white/95 backdrop-blur-sm text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                🚗 Parking
              </span>
            )}
          </div>

          {/* PROPERTY TYPE */}
          <div className="absolute top-3 left-3">
            <span className="bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
              {property.propertyType?.replace(/-/g, ' ').toUpperCase() || 'PROPERTY'}
            </span>
          </div>
        </div>

        {/* ✅ CONTENT SECTION - Enhanced */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          {/* TOP SECTION */}
          <div>
            <div className="flex justify-between items-start gap-3 mb-2">
              <h2 className="text-xl font-black text-gray-900 line-clamp-1 flex-1">
                <Link
                  href={propertyLink}
                  className="hover:text-orange-600 transition-colors"
                  scroll={false}
                >
                  {property.name}
                </Link>
              </h2>
              
              {/* ACTION BUTTONS */}
              <div className="flex gap-2 flex-shrink-0">
                {showFavoriteButton && (
                  <button
                    className="bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 border border-gray-200"
                    onClick={onFavoriteToggle}
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        isFavorite ? "text-red-500 fill-red-500" : "text-gray-600"
                      }`}
                    />
                  </button>
                )}
                <button
                  className="bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 border border-gray-200 relative"
                  onClick={handleShare}
                >
                  <Share2 className="w-5 h-5 text-gray-600" />
                  {showCopied && (
                    <div className="absolute -top-10 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                      ✓ Copied!
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* LOCATION */}
            <p className="text-sm text-gray-600 flex items-center gap-1 mb-2 line-clamp-1">
              <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0" />
              {property?.location?.address}, {property?.location?.city || 'Tarkwa'}
            </p>

            {/* RATING */}
            <div className="flex items-center gap-2 text-sm mb-3">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-gray-900">
                  {property.averageRating?.toFixed(1) || '4.5'}
                </span>
              </div>
              <span className="text-gray-500">
                ({property.numberOfReviews || 0} reviews)
              </span>
            </div>
          </div>

          {/* BOTTOM SECTION */}
          <div className="space-y-3">
            {/* PROPERTY DETAILS */}
            <div className="flex items-center gap-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
              <span className="flex items-center gap-1 font-semibold">
                <Bed className="w-4 h-4 text-orange-600" />
                {property.beds}
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <Bath className="w-4 h-4 text-orange-600" />
                {property.baths}
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <House className="w-4 h-4 text-orange-600" />
                {property.squareFeet} ft²
              </span>
            </div>

            {/* PRICE & CTA */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-orange-600">
                  GH₵{property.pricePerMonth?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-gray-500 font-semibold">per month</p>
              </div>
              
              <Link href={propertyLink} scroll={false}>
                <button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg text-sm">
                  View
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardCompact;