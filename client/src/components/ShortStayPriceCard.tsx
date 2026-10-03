"use client";

import { useState } from "react";
import { Clock, Calendar, CalendarDays, CalendarRange, ArrowRight } from "lucide-react";
import type { DurationType } from "./PaymentStructurePicker";

// ─────────────────────────────────────────────────────────────────────────────
//  ShortStayPriceCard.tsx
//
//  Displays pricing options for a short stay property.
//  Shown on the property detail page alongside the booking form.
//
//  Shows all available duration rates in a clean card.
//  Highlights the best value option.
//  Calls onBook when guest is ready to proceed.
//
//  Usage:
//    <ShortStayPriceCard
//      propertyId={12}
//      structures={property.paymentStructures}
//      onBook={(durationType) => setBookingMode(true)}
//    />
// ─────────────────────────────────────────────────────────────────────────────

interface PriceStructure {
  durationType: DurationType;
  amount:       number;
}

interface ShortStayPriceCardProps {
  propertyId:   number;
  structures:   PriceStructure[];
  onBook?:      (durationType: DurationType) => void;
  className?:   string;
}

interface DurationConfig {
  label:     string;
  shortLabel: string;
  icon:      React.ElementType;
  unit:      string;
  bg:        string;
  text:      string;
  border:    string;
}

const DURATION_CONFIG: Record<DurationType, DurationConfig> = {
  HOURLY: {
    label:      "Per Hour",
    shortLabel: "Hourly",
    icon:       Clock,
    unit:       "hr",
    bg:         "bg-violet-50",
    text:       "text-violet-700",
    border:     "border-violet-100",
  },
  DAILY: {
    label:      "Per Night",
    shortLabel: "Nightly",
    icon:       Calendar,
    unit:       "night",
    bg:         "bg-blue-50",
    text:       "text-blue-700",
    border:     "border-blue-100",
  },
  WEEKLY: {
    label:      "Per Week",
    shortLabel: "Weekly",
    icon:       CalendarDays,
    unit:       "week",
    bg:         "bg-emerald-50",
    text:       "text-emerald-700",
    border:     "border-emerald-100",
  },
  MONTHLY: {
    label:      "Per Month",
    shortLabel: "Monthly",
    icon:       CalendarRange,
    unit:       "month",
    bg:         "bg-orange-50",
    text:       "text-orange-700",
    border:     "border-orange-100",
  },
};

const formatGHS = (amount: number) =>
  `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 0 })}`;

// Find best value — lowest cost per hour
function getBestValue(structures: PriceStructure[]): DurationType | null {
  if (structures.length <= 1) return null;

  const hoursMap: Record<DurationType, number> = {
    HOURLY:  1,
    DAILY:   24,
    WEEKLY:  24 * 7,
    MONTHLY: 24 * 30,
  };

  let bestType: DurationType | null = null;
  let bestRatePerHour = Infinity;

  structures.forEach((s) => {
    const hours       = hoursMap[s.durationType];
    const ratePerHour = s.amount / hours;
    if (ratePerHour < bestRatePerHour) {
      bestRatePerHour = ratePerHour;
      bestType        = s.durationType;
    }
  });

  // Only show best value badge if there is a real difference
  return structures.length > 1 ? bestType : null;
}

export default function ShortStayPriceCard({
  propertyId,
  structures,
  onBook,
  className = "",
}: ShortStayPriceCardProps) {
  const [selected, setSelected] = useState<DurationType>(
    structures[0]?.durationType ?? "DAILY"
  );

  const bestValue = getBestValue(structures);

  if (structures.length === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 p-5 ${className}`}>
        <p className="text-sm text-gray-400 text-center">
          Pricing not available
        </p>
      </div>
    );
  }

  const selectedStructure = structures.find((s) => s.durationType === selected);

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Pricing</h3>
          {bestValue && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              {DURATION_CONFIG[bestValue].shortLabel} saves most
            </span>
          )}
        </div>
      </div>

      {/* Price rows */}
      <div className="p-4 space-y-2">
        {structures.map((s) => {
          const config    = DURATION_CONFIG[s.durationType];
          const Icon      = config.icon;
          const isSelected = selected === s.durationType;
          const isBest     = s.durationType === bestValue;

          return (
            <button
              key={s.durationType}
              onClick={() => setSelected(s.durationType)}
              className={`
                w-full flex items-center justify-between p-3.5 rounded-xl border-2
                transition-all text-left
                ${isSelected
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-100 hover:border-gray-200 bg-gray-50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${config.text}`} />
                </div>

                {/* Label */}
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${isSelected ? "text-orange-900" : "text-gray-700"}`}>
                      {config.label}
                    </p>
                    {isBest && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">
                        Best Value
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    per {config.unit}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="text-right">
                <p className={`text-base font-black ${isSelected ? "text-orange-700" : "text-gray-900"}`}>
                  {formatGHS(s.amount)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected summary */}
      {selectedStructure && (
        <div className="mx-4 mb-4 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-orange-700 font-medium">
              {DURATION_CONFIG[selected].shortLabel} rate
            </p>
            <p className="text-lg font-black text-orange-700">
              {formatGHS(selectedStructure.amount)}
              <span className="text-xs font-medium ml-1">
                / {DURATION_CONFIG[selected].unit}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Book button */}
      {onBook && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onBook(selected)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Book Now
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            No payment until confirmed
          </p>
        </div>
      )}
    </div>
  );
}