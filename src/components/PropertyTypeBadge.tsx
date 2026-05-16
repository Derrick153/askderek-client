import React from "react";

interface PropertyTypeBadgeProps {
  listingType: string;
  className?:  string;
}

const BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  FOR_RENT:   { label: "For Rent",   className: "bg-blue-100 text-blue-700" },
  FOR_SALE:   { label: "For Sale",   className: "bg-green-100 text-green-700" },
  SHORT_STAY: { label: "Short Stay", className: "bg-purple-100 text-purple-700" },
  HOSTEL:     { label: "Hostel",     className: "bg-amber-100 text-amber-700" },
  LAND:       { label: "Land",       className: "bg-stone-100 text-stone-700" },
  OFFICE:     { label: "Office",     className: "bg-slate-100 text-slate-700" },
};

const DEFAULT_BADGE = { label: "Property", className: "bg-gray-100 text-gray-700" };

const PropertyTypeBadge = ({ listingType, className = "" }: PropertyTypeBadgeProps) => {
  const config = BADGE_CONFIG[listingType] ?? DEFAULT_BADGE;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${config.className} ${className}`}>
      {config.label}
    </span>
  );
};

export default PropertyTypeBadge;
