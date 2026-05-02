import { CheckCircle, Clock, XCircle, Archive, AlertTriangle, Gavel } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  PropertyStatusBadge.tsx
//
//  Displays the current listing status of a property.
//  Different from ListingTypeBadge — this shows AVAILABILITY not TYPE.
//
//  Status values match backend ListingStatus enum:
//    AVAILABLE · RENTED · PENDING · SOLD · ARCHIVED · PENDING_REMOVAL
// ─────────────────────────────────────────────────────────────────────────────

export type ListingStatus =
  | "AVAILABLE"
  | "RENTED"
  | "PENDING"
  | "SOLD"
  | "ARCHIVED"
  | "PENDING_REMOVAL";

interface StatusMeta {
  label: string;
  icon:  React.ElementType;
  bg:    string;
  text:  string;
  ring:  string;
  pulse: boolean;
}

const STATUS_MAP: Record<ListingStatus, StatusMeta> = {
  AVAILABLE: {
    label: "Available",
    icon:  CheckCircle,
    bg:    "bg-emerald-50",
    text:  "text-emerald-700",
    ring:  "ring-emerald-200",
    pulse: false,
  },
  RENTED: {
    label: "Rented",
    icon:  Clock,
    bg:    "bg-blue-50",
    text:  "text-blue-700",
    ring:  "ring-blue-200",
    pulse: false,
  },
  PENDING: {
    label: "Pending Approval",
    icon:  Clock,
    bg:    "bg-amber-50",
    text:  "text-amber-700",
    ring:  "ring-amber-200",
    pulse: true,
  },
  SOLD: {
    label: "Sold",
    icon:  Gavel,
    bg:    "bg-rose-50",
    text:  "text-rose-700",
    ring:  "ring-rose-200",
    pulse: false,
  },
  ARCHIVED: {
    label: "Archived",
    icon:  Archive,
    bg:    "bg-gray-100",
    text:  "text-gray-500",
    ring:  "ring-gray-200",
    pulse: false,
  },
  PENDING_REMOVAL: {
    label: "Pending Removal",
    icon:  AlertTriangle,
    bg:    "bg-rose-50",
    text:  "text-rose-700",
    ring:  "ring-rose-300",
    pulse: true,
  },
};

const DEFAULT_META: StatusMeta = {
  label: "Unknown",
  icon:  XCircle,
  bg:    "bg-gray-50",
  text:  "text-gray-500",
  ring:  "ring-gray-200",
  pulse: false,
};

export type BadgeSize = "sm" | "md" | "lg";

interface PropertyStatusBadgeProps {
  status:     string;
  size?:      BadgeSize;
  showIcon?:  boolean;
  className?: string;
}

const SIZE_CLASSES: Record<BadgeSize, { wrapper: string; text: string; icon: string; dot: string }> = {
  sm: { wrapper: "px-2 py-0.5 gap-1",     text: "text-xs",  icon: "w-3 h-3",   dot: "w-1.5 h-1.5" },
  md: { wrapper: "px-2.5 py-1 gap-1.5",   text: "text-xs",  icon: "w-3.5 h-3.5", dot: "w-2 h-2" },
  lg: { wrapper: "px-3 py-1.5 gap-2",     text: "text-sm",  icon: "w-4 h-4",   dot: "w-2 h-2" },
};

export default function PropertyStatusBadge({
  status,
  size      = "md",
  showIcon  = true,
  className = "",
}: PropertyStatusBadgeProps) {
  const meta  = STATUS_MAP[status as ListingStatus] ?? DEFAULT_META;
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
      {/* Pulse dot for active statuses */}
      {meta.pulse ? (
        <span className="relative flex-shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${
            status === "PENDING_REMOVAL" ? "bg-rose-400" : "bg-amber-400"
          }`} />
          <span className={`relative inline-flex rounded-full ${sizes.dot} ${
            status === "PENDING_REMOVAL" ? "bg-rose-500" : "bg-amber-500"
          }`} />
        </span>
      ) : showIcon ? (
        <Icon className={`flex-shrink-0 ${sizes.icon}`} />
      ) : null}
      {meta.label}
    </span>
  );
}