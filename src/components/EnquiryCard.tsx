import {
  MessageSquare,
  Phone,
  Eye,
  Clock,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Handshake,
  XCircle,
  Mail,
} from "lucide-react";
import type { Enquiry, EnquiryStatus, EnquiryType } from "@/state/api";

// ─────────────────────────────────────────────────────────────────────────────
//  EnquiryCard.tsx
//
//  Displays a single enquiry as a card.
//  Used on:
//    — manager/enquiries page (landlord view)
//    — tenant/enquiries page (buyer view)
//    — admin/enquiries page (platform view)
//
//  Shows: property, status, enquiry type, last message, date, actions
// ─────────────────────────────────────────────────────────────────────────────

// ── Status config ─────────────────────────────────────────────────────────────

interface StatusMeta {
  label: string;
  icon:  React.ElementType;
  bg:    string;
  text:  string;
  ring:  string;
}

const STATUS_MAP: Record<EnquiryStatus, StatusMeta> = {
  NEW: {
    label: "New",
    icon:  AlertCircle,
    bg:    "bg-blue-50",
    text:  "text-blue-700",
    ring:  "ring-blue-200",
  },
  CONTACTED: {
    label: "Contacted",
    icon:  Mail,
    bg:    "bg-violet-50",
    text:  "text-violet-700",
    ring:  "ring-violet-200",
  },
  NEGOTIATING: {
    label: "Negotiating",
    icon:  MessageSquare,
    bg:    "bg-amber-50",
    text:  "text-amber-700",
    ring:  "ring-amber-200",
  },
  AGREED: {
    label: "Deal Agreed",
    icon:  Handshake,
    bg:    "bg-emerald-50",
    text:  "text-emerald-700",
    ring:  "ring-emerald-200",
  },
  COMPLETED: {
    label: "Completed",
    icon:  CheckCircle,
    bg:    "bg-emerald-50",
    text:  "text-emerald-700",
    ring:  "ring-emerald-200",
  },
  LOST: {
    label: "Lost",
    icon:  XCircle,
    bg:    "bg-gray-100",
    text:  "text-gray-500",
    ring:  "ring-gray-200",
  },
};

// ── Enquiry type config ───────────────────────────────────────────────────────

const TYPE_MAP: Record<EnquiryType, { label: string; icon: React.ElementType; color: string }> = {
  MESSAGE:      { label: "Message",      icon: MessageSquare, color: "text-blue-500"   },
  CALL_REQUEST: { label: "Call Request", icon: Phone,         color: "text-emerald-500" },
  VIEWING:      { label: "Viewing",      icon: Eye,           color: "text-violet-500"  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
  const date = new Date(iso);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;

  return date.toLocaleDateString("en-GH", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const formatGHS = (amount?: number) =>
  amount != null
    ? `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 0 })}`
    : null;

// ── Component ─────────────────────────────────────────────────────────────────

interface EnquiryCardProps {
  enquiry:    Enquiry;
  onClick?:   (enquiry: Enquiry) => void;
  onReply?:   (enquiry: Enquiry) => void;
  showProperty?: boolean;
  compact?:   boolean;
  className?: string;
}

export default function EnquiryCard({
  enquiry,
  onClick,
  onReply,
  showProperty = true,
  compact      = false,
  className    = "",
}: EnquiryCardProps) {
  const statusMeta = STATUS_MAP[enquiry.status] ?? STATUS_MAP.NEW;
  const typeMeta   = TYPE_MAP[enquiry.enquiryType]  ?? TYPE_MAP.MESSAGE;
  const StatusIcon = statusMeta.icon;
  const TypeIcon   = typeMeta.icon;

  const isUnread   = !enquiry.isRead && enquiry.status === "NEW";
  const isArchived = enquiry.isArchived;

  return (
    <div
      onClick={() => onClick?.(enquiry)}
      className={`
        bg-white rounded-2xl border transition-all duration-200
        ${onClick ? "cursor-pointer hover:shadow-md hover:border-orange-200" : ""}
        ${isUnread   ? "border-blue-200 shadow-sm shadow-blue-50" : "border-gray-200"}
        ${isArchived ? "opacity-60" : ""}
        ${compact    ? "p-4" : "p-5"}
        ${className}
      `}
    >
      {/* ── Top row ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Unread dot */}
          {isUnread && (
            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-0.5" />
          )}

          {/* Status badge */}
          <span className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ring-1
            ${statusMeta.bg} ${statusMeta.text} ${statusMeta.ring}
          `}>
            <StatusIcon className="w-3 h-3" />
            {statusMeta.label}
          </span>

          {/* Enquiry type */}
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${typeMeta.color}`}>
            <TypeIcon className="w-3 h-3" />
            {typeMeta.label}
          </span>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
          <Clock className="w-3 h-3" />
          {formatDate(enquiry.createdAt)}
        </div>
      </div>

      {/* ── Property info ── */}
      {showProperty && enquiry.property && (
        <div className="mb-2">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {enquiry.property.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {enquiry.property.listingType?.replace(/_/g, " ")} ·{" "}
            GHS {enquiry.property.pricePerMonth?.toLocaleString("en-GH")}
          </p>
        </div>
      )}

      {/* ── Message preview ── */}
      <p className={`text-gray-600 line-clamp-2 ${compact ? "text-xs" : "text-sm"}`}>
        {enquiry.message}
      </p>

      {/* ── Price negotiation row ── */}
      {(enquiry.offeredPrice || enquiry.agreedPrice) && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
          {enquiry.offeredPrice && (
            <div>
              <p className="text-xs text-gray-400">Offered</p>
              <p className="text-sm font-bold text-gray-700">
                {formatGHS(enquiry.offeredPrice)}
              </p>
            </div>
          )}
          {enquiry.offeredPrice && enquiry.agreedPrice && (
            <ChevronRight className="w-4 h-4 text-gray-300" />
          )}
          {enquiry.agreedPrice && (
            <div>
              <p className="text-xs text-gray-400">Agreed</p>
              <p className="text-sm font-bold text-emerald-600">
                {formatGHS(enquiry.agreedPrice)}
              </p>
            </div>
          )}
          {enquiry.commissionDue && (
            <div className="ml-auto">
              <p className="text-xs text-gray-400">Commission</p>
              <p className="text-sm font-bold text-orange-600">
                {formatGHS(enquiry.commissionDue)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Response preview ── */}
      {enquiry.response && !compact && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <p className="text-xs text-gray-400 mb-1">Response</p>
          <p className="text-xs text-gray-600 line-clamp-1 italic">
            &ldquo;{enquiry.response}&rdquo;
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      {onReply && !isArchived && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={(e) => { e.stopPropagation(); onReply(enquiry); }}
            className="w-full flex items-center justify-center gap-2 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Reply to Enquiry
          </button>
        </div>
      )}
    </div>
  );
}