import { AlertTriangle, Clock, CheckCircle, XCircle, Phone, RefreshCw } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  LeaseExpiryAlert.tsx
//
//  Warning banner shown to tenants when their lease is expiring soon.
//  Displays different urgency levels:
//    — 60+ days: no alert shown
//    — 31–60 days: yellow info banner
//    — 8–30 days: orange warning banner
//    — 1–7 days: red urgent banner
//    — 0 days: red expired banner
//
//  Usage:
//    <LeaseExpiryAlert
//      leaseEndDate="2026-05-15"
//      propertyName="2 Bedroom at Tema Community 1"
//      onRenew={() => router.push("/tenants/residences")}
//    />
// ─────────────────────────────────────────────────────────────────────────────

interface LeaseExpiryAlertProps {
  leaseEndDate:   string;         // ISO date string
  propertyName?:  string;
  onRenew?:       () => void;
  onDismiss?:     () => void;
  className?:     string;
}

type UrgencyLevel = "none" | "info" | "warning" | "urgent" | "expired";

interface AlertConfig {
  level:    UrgencyLevel;
  icon:     React.ElementType;
  bg:       string;
  border:   string;
  text:     string;
  subtext:  string;
  title:    (days: number) => string;
  message:  (days: number, property?: string) => string;
  btnBg:    string;
  btnText:  string;
}

const CONFIGS: Record<UrgencyLevel, AlertConfig | null> = {
  none: null,
  info: {
    level:   "info",
    icon:    Clock,
    bg:      "bg-blue-50",
    border:  "border-blue-200",
    text:    "text-blue-900",
    subtext: "text-blue-700",
    title:   (d) => `Lease expires in ${d} days`,
    message: (d, p) =>
      `Your lease${p ? ` for ${p}` : ""} will expire in ${d} days. Contact your landlord soon to discuss renewal.`,
    btnBg:   "bg-blue-600 hover:bg-blue-700",
    btnText: "Talk to Landlord",
  },
  warning: {
    level:   "warning",
    icon:    AlertTriangle,
    bg:      "bg-amber-50",
    border:  "border-amber-200",
    text:    "text-amber-900",
    subtext: "text-amber-700",
    title:   (d) => `Lease expires in ${d} days`,
    message: (d, p) =>
      `Your lease${p ? ` for ${p}` : ""} expires in ${d} days. Start renewal discussions now to secure your home.`,
    btnBg:   "bg-amber-600 hover:bg-amber-700",
    btnText: "Renew Now",
  },
  urgent: {
    level:   "urgent",
    icon:    AlertTriangle,
    bg:      "bg-rose-50",
    border:  "border-rose-300",
    text:    "text-rose-900",
    subtext: "text-rose-700",
    title:   (d) => d === 1 ? "Lease expires TOMORROW" : `Lease expires in ${d} days — Act Now`,
    message: (d, p) =>
      `URGENT: Your lease${p ? ` for ${p}` : ""} expires in ${d} ${d === 1 ? "day" : "days"}. Contact your landlord immediately to avoid losing your home.`,
    btnBg:   "bg-rose-600 hover:bg-rose-700",
    btnText: "Contact Landlord Now",
  },
  expired: {
    level:   "expired",
    icon:    XCircle,
    bg:      "bg-rose-50",
    border:  "border-rose-400",
    text:    "text-rose-900",
    subtext: "text-rose-700",
    title:   () => "Lease Expired",
    message: (_, p) =>
      `Your lease${p ? ` for ${p}` : ""} has expired. Please contact your landlord or AskDerek support immediately.`,
    btnBg:   "bg-rose-600 hover:bg-rose-700",
    btnText: "Get Help",
  },
};

function getUrgencyLevel(leaseEndDate: string): { level: UrgencyLevel; daysLeft: number } {
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate  = new Date(leaseEndDate);
  endDate.setHours(0, 0, 0, 0);
  const diffMs   = endDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / 86400000);

  if (daysLeft < 0)  return { level: "expired",  daysLeft: 0 };
  if (daysLeft === 0) return { level: "expired",  daysLeft: 0 };
  if (daysLeft <= 7)  return { level: "urgent",   daysLeft };
  if (daysLeft <= 30) return { level: "warning",  daysLeft };
  if (daysLeft <= 60) return { level: "info",     daysLeft };
  return { level: "none", daysLeft };
}

export default function LeaseExpiryAlert({
  leaseEndDate,
  propertyName,
  onRenew,
  onDismiss,
  className = "",
}: LeaseExpiryAlertProps) {
  const { level, daysLeft } = getUrgencyLevel(leaseEndDate);

  // Don't show anything if not expiring soon
  if (level === "none") return null;

  const config = CONFIGS[level];
  if (!config) return null;

  const Icon = config.icon;

  // Progress bar showing time remaining (out of 60 days)
  const progressPercent = level === "expired"
    ? 0
    : Math.min(100, Math.round((daysLeft / 60) * 100));

  return (
    <div
      className={`
        rounded-2xl border-2 p-4 sm:p-5
        ${config.bg}
        ${config.border}
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
          ${level === "urgent" || level === "expired" ? "bg-rose-100" : ""}
          ${level === "warning" ? "bg-amber-100" : ""}
          ${level === "info"    ? "bg-blue-100"  : ""}
        `}>
          <Icon className={`w-5 h-5 ${
            level === "urgent" || level === "expired" ? "text-rose-600" :
            level === "warning" ? "text-amber-600" :
            "text-blue-600"
          }`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-bold ${config.text}`}>
              {config.title(daysLeft)}
            </h4>
            {onDismiss && level === "info" && (
              <button
                onClick={onDismiss}
                className="text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0"
                title="Dismiss"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className={`text-xs mt-1 ${config.subtext}`}>
            {config.message(daysLeft, propertyName)}
          </p>

          {/* Progress bar */}
          <div className="mt-3 mb-3">
            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  level === "expired" ? "bg-rose-400 w-0" :
                  level === "urgent"  ? "bg-rose-400"     :
                  level === "warning" ? "bg-amber-400"    :
                  "bg-blue-400"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${config.subtext}`}>
                {level === "expired" ? "Expired" : `${daysLeft} days left`}
              </span>
              <span className={`text-xs ${config.subtext}`}>60 days</span>
            </div>
          </div>

          {/* Action button */}
          {onRenew && (
            <button
              onClick={onRenew}
              className={`
                inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold
                text-white rounded-xl transition-colors
                ${config.btnBg}
              `}
            >
              {level === "expired"
                ? <><Phone className="w-3.5 h-3.5" /> {config.btnText}</>
                : <><RefreshCw className="w-3.5 h-3.5" /> {config.btnText}</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}