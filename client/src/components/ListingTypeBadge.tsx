import { Home, Building2, Hotel, Landmark, Briefcase, Tag } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  ListingTypeBadge.tsx
//
//  Displays the listing type of a property as a coloured badge.
//  Used on every property card and detail page across AskDerek.
//
//  Listing types match the backend ListingType enum:
//    RENT · FOR_SALE · SHORT_STAY · HOSTEL · LAND · OFFICE
// ─────────────────────────────────────────────────────────────────────────────

export type ListingType =
  | "RENT"
  | "FOR_SALE"
  | "SHORT_STAY"
  | "HOSTEL"
  | "LAND"
  | "OFFICE";

interface BadgeMeta {
  label:    string;
  icon:     React.ElementType;
  bg:       string;
  text:     string;
  ring:     string;
  dot:      string;
}

const BADGE_MAP: Record<ListingType, BadgeMeta> = {
  RENT: {
    label: "For Rent",
    icon:  Home,
    bg:    "bg-blue-50",
    text:  "text-blue-700",
    ring:  "ring-blue-200",
    dot:   "bg-blue-500",
  },
  FOR_SALE: {
    label: "For Sale",
    icon:  Tag,
    bg:    "bg-emerald-50",
    text:  "text-emerald-700",
    ring:  "ring-emerald-200",
    dot:   "bg-emerald-500",
  },
  SHORT_STAY: {
    label: "Short Stay",
    icon:  Building2,
    bg:    "bg-violet-50",
    text:  "text-violet-700",
    ring:  "ring-violet-200",
    dot:   "bg-violet-500",
  },
  HOSTEL: {
    label: "Hostel",
    icon:  Hotel,
    bg:    "bg-amber-50",
    text:  "text-amber-700",
    ring:  "ring-amber-200",
    dot:   "bg-amber-500",
  },
  LAND: {
    label: "Land",
    icon:  Landmark,
    bg:    "bg-lime-50",
    text:  "text-lime-700",
    ring:  "ring-lime-200",
    dot:   "bg-lime-500",
  },
  OFFICE: {
    label: "Office",
    icon:  Briefcase,
    bg:    "bg-slate-50",
    text:  "text-slate-700",
    ring:  "ring-slate-200",
    dot:   "bg-slate-500",
  },
};

const DEFAULT_META: BadgeMeta = {
  label: "Property",
  icon:  Home,
  bg:    "bg-gray-50",
  text:  "text-gray-600",
  ring:  "ring-gray-200",
  dot:   "bg-gray-400",
};

export type BadgeSize = "sm" | "md" | "lg";

interface ListingTypeBadgeProps {
  type:      string;
  size?:     BadgeSize;
  showIcon?: boolean;
  showDot?:  boolean;
  className?: string;
}

const SIZE_CLASSES: Record<BadgeSize, { wrapper: string; text: string; icon: string; dot: string }> = {
  sm: {
    wrapper: "px-2 py-0.5 gap-1",
    text:    "text-xs",
    icon:    "w-3 h-3",
    dot:     "w-1.5 h-1.5",
  },
  md: {
    wrapper: "px-2.5 py-1 gap-1.5",
    text:    "text-xs",
    icon:    "w-3.5 h-3.5",
    dot:     "w-2 h-2",
  },
  lg: {
    wrapper: "px-3 py-1.5 gap-2",
    text:    "text-sm",
    icon:    "w-4 h-4",
    dot:     "w-2 h-2",
  },
};

export default function ListingTypeBadge({
  type,
  size      = "md",
  showIcon  = true,
  showDot   = false,
  className = "",
}: ListingTypeBadgeProps) {
  const meta  = BADGE_MAP[type as ListingType] ?? DEFAULT_META;
  const Icon  = meta.icon;
  const sizes = SIZE_CLASSES[size];

  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-lg ring-1
        ${sizes.wrapper}
        ${sizes.text}
        ${meta.bg}
        ${meta.text}
        ${meta.ring}
        ${className}
      `}
    >
      {showDot && (
        <span className={`rounded-full flex-shrink-0 ${sizes.dot} ${meta.dot}`} />
      )}
      {showIcon && !showDot && (
        <Icon className={`flex-shrink-0 ${sizes.icon}`} />
      )}
      {meta.label}
    </span>
  );
}