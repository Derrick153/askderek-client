"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, CalendarDays, CalendarRange, Check } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentStructurePicker.tsx
//
//  Lets a guest select their preferred stay duration and rate for short stay
//  properties. Prices come from the database — never from user input.
//
//  Displays: Hourly / Daily / Weekly / Monthly rates
//  Calculates: Total amount based on selected duration and quantity
//
//  Usage:
//    <PaymentStructurePicker
//      structures={property.paymentStructures}
//      checkIn="2026-05-01T14:00"
//      checkOut="2026-05-03T12:00"
//      onSelect={(selected) => setBookingData(selected)}
//    />
// ─────────────────────────────────────────────────────────────────────────────

export type DurationType = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";

export interface PaymentStructure {
  durationType: DurationType;
  amount:       number;
  currency?:    string;
}

export interface SelectedStructure {
  durationType: DurationType;
  amount:       number;
  quantity:     number;
  totalAmount:  number;
}

interface DurationMeta {
  label:    string;
  unit:     string;
  icon:     React.ElementType;
  plural:   string;
  bg:       string;
  border:   string;
  text:     string;
  selected: string;
}

const DURATION_META: Record<DurationType, DurationMeta> = {
  HOURLY: {
    label:    "Hourly",
    unit:     "hour",
    plural:   "hours",
    icon:     Clock,
    bg:       "bg-violet-50",
    border:   "border-violet-200",
    text:     "text-violet-700",
    selected: "bg-violet-600",
  },
  DAILY: {
    label:    "Daily",
    unit:     "night",
    plural:   "nights",
    icon:     Calendar,
    bg:       "bg-blue-50",
    border:   "border-blue-200",
    text:     "text-blue-700",
    selected: "bg-blue-600",
  },
  WEEKLY: {
    label:    "Weekly",
    unit:     "week",
    plural:   "weeks",
    icon:     CalendarDays,
    bg:       "bg-emerald-50",
    border:   "border-emerald-200",
    text:     "text-emerald-700",
    selected: "bg-emerald-600",
  },
  MONTHLY: {
    label:    "Monthly",
    unit:     "month",
    plural:   "months",
    icon:     CalendarRange,
    bg:       "bg-orange-50",
    border:   "border-orange-200",
    text:     "text-orange-700",
    selected: "bg-orange-600",
  },
};

const formatGHS = (amount: number) =>
  `GHS ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

interface PaymentStructurePickerProps {
  structures:   PaymentStructure[];
  checkIn?:     string;
  checkOut?:    string;
  onSelect?:    (selected: SelectedStructure) => void;
  className?:   string;
}

export default function PaymentStructurePicker({
  structures,
  checkIn,
  checkOut,
  onSelect,
  className = "",
}: PaymentStructurePickerProps) {
  const [selected, setSelected] = useState<DurationType | null>(
    structures[0]?.durationType ?? null
  );

  // Auto calculate quantity from checkIn / checkOut dates
  const getQuantity = (type: DurationType): number => {
    if (!checkIn || !checkOut) return 1;
    const diffMs   = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    switch (type) {
      case "HOURLY":  return Math.max(1, Math.ceil(diffHours));
      case "DAILY":   return Math.max(1, Math.ceil(diffHours / 24));
      case "WEEKLY":  return Math.max(1, Math.ceil(diffHours / (24 * 7)));
      case "MONTHLY": return Math.max(1, Math.ceil(diffHours / (24 * 30)));
    }
  };

  const selectedStructure = structures.find((s) => s.durationType === selected);
  const quantity = selected ? getQuantity(selected) : 1;
  const total    = (selectedStructure?.amount ?? 0) * quantity;

  useEffect(() => {
    if (!selected || !selectedStructure) return;
    onSelect?.({
      durationType: selected,
      amount:       selectedStructure.amount,
      quantity,
      totalAmount:  total,
    });
  }, [selected, quantity]);

  if (structures.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-2xl p-5 text-center ${className}`}>
        <p className="text-sm text-gray-400">No pricing available for this property.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Choose Duration</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Select how long you want to stay
        </p>
      </div>

      {/* Duration options */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {structures.map((s) => {
          const meta       = DURATION_META[s.durationType];
          const Icon       = meta.icon;
          const isSelected = selected === s.durationType;
          const qty        = getQuantity(s.durationType);

          return (
            <button
              key={s.durationType}
              onClick={() => setSelected(s.durationType)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all
                ${isSelected
                  ? `border-orange-500 bg-orange-50 shadow-sm`
                  : `border-gray-200 hover:border-gray-300 bg-white`
                }
              `}
            >
              {/* Selected check */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${meta.text}`} />
              </div>

              {/* Label */}
              <p className={`text-xs font-semibold ${isSelected ? "text-orange-700" : "text-gray-500"}`}>
                {meta.label}
              </p>

              {/* Price */}
              <p className={`text-sm font-bold mt-0.5 ${isSelected ? "text-orange-900" : "text-gray-900"}`}>
                {formatGHS(s.amount)}
              </p>
              <p className="text-xs text-gray-400">per {meta.unit}</p>

              {/* Quantity preview */}
              {checkIn && checkOut && (
                <p className={`text-xs mt-1.5 font-medium ${isSelected ? "text-orange-600" : "text-gray-400"}`}>
                  × {qty} {qty === 1 ? meta.unit : meta.plural}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Total */}
      {selected && selectedStructure && (
        <div className="mx-4 mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 font-medium">
                {quantity} × {formatGHS(selectedStructure.amount)}
              </p>
              <p className="text-xs text-orange-500 mt-0.5">
                {DURATION_META[selected].label} rate
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-orange-600 font-medium">Total</p>
              <p className="text-xl font-black text-orange-700">
                {formatGHS(total)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}