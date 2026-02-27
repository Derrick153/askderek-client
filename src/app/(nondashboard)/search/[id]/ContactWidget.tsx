"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  MessageCircle,
  Calendar,
  MapPin,
  Clock,
  Copy,
  Check,
  Shield,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useGetAuthUserQuery,
  useGetPropertyQuery,
} from "@/state/api";

interface ContactWidgetProps {
  onOpenModal: () => void;
  propertyId?: number;
}

const ContactWidget = ({
  onOpenModal,
  propertyId,
}: ContactWidgetProps) => {
  const router = useRouter();
  const { data: authUser } = useGetAuthUserQuery();

  const { data: property } = useGetPropertyQuery(propertyId ?? 0, {
    skip: !propertyId,
  });

  const [showCopied, setShowCopied] = useState(false);

  // Real data from API
  const phoneNumber = property?.manager?.phoneNumber || "0558153803";
  const managerName = property?.manager?.name || "Property Manager";
  const managerRating = 4.8;
  const avgResponseTime = "20min";

  /** Handle application - requires auth */
  const handleApplyClick = () => {
    if (authUser) {
      onOpenModal();
    } else {
      router.push(`/sign-in?redirect_url=${window.location.pathname}`);
    }
  };

  /** Direct communication - no auth needed */
  const handleCallClick = () => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleWhatsAppClick = () => {
    const formattedNumber = phoneNumber.startsWith("0")
      ? "233" + phoneNumber.slice(1)
      : phoneNumber;

    const propertyName = property?.name || "this property";
    const message = `Hello! I'm interested in ${propertyName}. Is it still available?`;

    window.open(
      `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch {
      console.error("Copy failed");
    }
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-5 text-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Verified Agent</span>
            </div>
            <p className="font-bold text-lg">{managerName}</p>
            <p className="text-xs text-gray-300">Licensed Property Consultant</p>
          </div>
          <div className="bg-white/20 p-2.5 rounded-xl">
            <Phone className="w-5 h-5" />
          </div>
        </div>

        {/* Performance Stats */}
        <div className="flex items-center gap-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold">{managerRating}</span>
          </div>
          <div className="h-3 w-px bg-white/20" />
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-300">Usually responds in {avgResponseTime}</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3.5">
        {/* Phone Number Section */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-green-900 uppercase tracking-wide">
              Direct Line
            </span>
            {showCopied && (
              <span className="text-xs text-green-600 flex items-center gap-1 bg-white px-2 py-1 rounded-full">
                <Check className="w-3 h-3" />
                Copied!
              </span>
            )}
          </div>

          <p className="text-2xl font-bold text-green-800 mb-3">
            {phoneNumber}
          </p>

          <div className="flex gap-2">
            <Button
              onClick={handleCallClick}
              size="sm"
              className="flex-1 bg-green-600 text-white hover:bg-green-700 h-10 rounded-xl font-medium"
            >
              <Phone className="w-4 h-4 mr-1.5" />
              Call Now
            </Button>

            <Button
              onClick={handleCopyNumber}
              size="sm"
              variant="outline"
              className="flex-1 border-2 border-green-600 text-green-700 hover:bg-green-50 h-10 rounded-xl font-medium"
            >
              <Copy className="w-4 h-4 mr-1.5" />
              Copy
            </Button>
          </div>
        </div>

        {/* WhatsApp - Primary CTA (No Auth Required) */}
        <Button
          onClick={handleWhatsAppClick}
          className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold h-13 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Chat on WhatsApp
          <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">Instant</span>
        </Button>

        {/* Formal Application (Auth Required) */}
        <Button
          onClick={handleApplyClick}
          className="w-full bg-gray-900 hover:bg-black text-white font-semibold h-13 rounded-xl shadow-md transition-all duration-300"
        >
          <Calendar className="w-4 h-4 mr-2" />
          {authUser ? "Submit Application" : "Sign In to Apply"}
        </Button>

        {/* Viewing Hours */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-blue-900">
              Viewing Hours
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-blue-900">Available Today</span>
          </div>
          <p className="text-xs text-blue-700">
            Monday – Sunday, 8:00 AM – 6:00 PM
          </p>
        </div>

        {/* Property Location */}
        {property?.location && (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-3.5">
            <div className="flex gap-2.5">
              <div className="bg-orange-600 p-1.5 rounded-lg flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-orange-900 mb-1">
                  Property Location
                </p>
                <p className="text-xs text-orange-700 mb-2">
                  {property.location.address}, {property.location.city}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-2 border-orange-400 text-orange-700 hover:bg-orange-100 h-8 rounded-lg text-xs font-medium"
                  onClick={() => {
                    const { latitude, longitude } = property.location.coordinates;
                    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
                  }}
                >
                  <MapPin className="w-3 h-3 mr-1.5" />
                  Open in Maps
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Trust Footer */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-center">
          <p className="text-xs text-gray-600 mb-1">
            <span className="font-semibold">Languages:</span> English • Twi • Ga
          </p>
          <p className="text-xs text-gray-500">
            🇬🇭 Licensed Agent • Quick Response
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactWidget;