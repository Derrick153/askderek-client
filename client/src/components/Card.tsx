import { Bath, Bed, Heart, MapPin, Star, Share2, Home as HouseIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Property } from "@/types/prismaTypes";

interface CardProps {
  property: Property;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  showFavoriteButton?: boolean;
  propertyLink: string;
}

const Card = ({
  property,
  isFavorite,
  onFavoriteToggle,
  showFavoriteButton = true,
  propertyLink,
}: CardProps) => {
  const [imgSrc, setImgSrc] = useState(
    property.photoUrls?.[0] || "/x.jpg"
  );
  const [showCopied, setShowCopied] = useState(false);

  // ✅ PROFESSIONAL SHARE FUNCTION
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
      {/* ✅ IMAGE CONTAINER - Professional */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Link href={propertyLink} scroll={false}>
          <Image
            src={imgSrc}
            alt={property.name}
            fill
            unoptimized
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => setImgSrc("/osu.jpg")}
          />
        </Link>
        
        {/* ✅ OVERLAY BADGES */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {property.isPetsAllowed && (
            <span className="bg-white/95 backdrop-blur-sm text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-gray-200">
              🐾 Pets OK
            </span>
          )}
          {property.isParkingIncluded && (
            <span className="bg-white/95 backdrop-blur-sm text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-gray-200">
              🚗 Parking
            </span>
          )}
        </div>

        {/* ✅ ACTION BUTTONS - Top Right */}
        <div className="absolute top-3 right-3 flex gap-2">
          {showFavoriteButton && (
            <button
              className="bg-white/95 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:scale-110 transition-all duration-200 border border-gray-200"
              onClick={onFavoriteToggle}
            >
              <Heart
                className={`w-5 h-5 ${
                  isFavorite ? "text-red-500 fill-red-500" : "text-gray-700"
                }`}
              />
            </button>
          )}
          <button
            className="bg-white/95 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:scale-110 transition-all duration-200 border border-gray-200 relative"
            onClick={handleShare}
          >
            <Share2 className="w-5 h-5 text-gray-700" />
            {showCopied && (
              <div className="absolute -top-10 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap animate-bounce">
                ✓ Link Copied!
              </div>
            )}
          </button>
        </div>

        {/* ✅ PROPERTY TYPE BADGE - Bottom Left */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
            {property.propertyType?.replace(/-/g, ' ').toUpperCase() || 'PROPERTY'}
          </span>
        </div>
      </div>

      {/* ✅ CARD CONTENT - Professional Layout */}
      <div className="p-5 space-y-3">
        {/* TITLE & LOCATION */}
        <div>
          <h2 className="text-lg font-black text-gray-900 mb-1 line-clamp-1">
            <Link
              href={propertyLink}
              className="hover:text-orange-600 transition-colors"
              scroll={false}
            >
              {property.name}
            </Link>
          </h2>
          
          <p className="text-sm text-gray-600 flex items-center gap-1 line-clamp-1">
            <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0" />
            {property?.location?.address}, {property?.location?.city || 'Tarkwa'}
          </p>
        </div>

        {/* ✅ RATING - Professional */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="font-bold text-gray-900">
              {property.averageRating?.toFixed(1) || '4.5'}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            ({property.numberOfReviews || 0} reviews)
          </span>
        </div>

        {/* ✅ PROPERTY DETAILS - Ghana Style */}
        <div className="flex items-center gap-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
          <span className="flex items-center gap-1 font-semibold">
            <Bed className="w-4 h-4 text-orange-600" />
            {property.beds} {property.beds === 1 ? 'Bed' : 'Beds'}
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <Bath className="w-4 h-4 text-orange-600" />
            {property.baths} {property.baths === 1 ? 'Bath' : 'Baths'}
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <HouseIcon className="w-4 h-4 text-orange-600" />
            {property.squareFeet} ft²
          </span>
        </div>

        {/* ✅ PRICE - GHANA CEDIS (GH₵) */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div>
            <p className="text-2xl font-black text-orange-600">
              GH₵{property.pricePerMonth?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-gray-500 font-semibold">per month</p>
          </div>
          
          <Link href={propertyLink} scroll={false}>
            <button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg">
              View Details
            </button>
          </Link>
        </div>

        {/* ✅ VERIFIED BADGE */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-bold">Verified by Ask Derek</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Card;