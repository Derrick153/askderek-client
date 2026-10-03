"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  BookingCalendar.tsx
//
//  Interactive availability calendar for short stay and hostel properties.
//  Shows which dates are booked (blocked) and allows date range selection.
//
//  Features:
//    — Blocked dates shown in red — cannot be selected
//    — Selected range highlighted in orange
//    — Min stay enforcement
//    — Mobile friendly tap targets
//    — ISO string comparison to avoid timezone bugs
//
//  Usage:
//    <BookingCalendar
//      bookedDates={["2026-05-10", "2026-05-11", "2026-05-12"]}
//      onSelect={(checkIn, checkOut) => setDates({ checkIn, checkOut })}
//      minStayDays={1}
//    />
// ─────────────────────────────────────────────────────────────────────────────

interface BookingCalendarProps {
  bookedDates?:  string[];        // ISO dates that are already booked
  checkIn?:      string;          // currently selected check-in ISO date
  checkOut?:     string;          // currently selected check-out ISO date
  onSelect?:     (checkIn: string, checkOut: string) => void;
  minStayDays?:  number;          // minimum nights required
  maxStayDays?:  number;          // maximum nights allowed
  className?:    string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const toISO = (date: Date): string => date.toISOString().split("T")[0];

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

const diffDays = (a: string, b: string): number => {
  const msA = new Date(a).getTime();
  const msB = new Date(b).getTime();
  return Math.round((msB - msA) / 86400000);
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS   = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function BookingCalendar({
  bookedDates   = [],
  checkIn: initCheckIn,
  checkOut: initCheckOut,
  onSelect,
  minStayDays   = 1,
  maxStayDays,
  className     = "",
}: BookingCalendarProps) {
  const today = toISO(new Date());

  const [viewYear,  setViewYear]  = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [checkIn,   setCheckIn]   = useState<string | null>(initCheckIn ?? null);
  const [checkOut,  setCheckOut]  = useState<string | null>(initCheckOut ?? null);
  const [selecting, setSelecting] = useState<"checkIn" | "checkOut">("checkIn");
  const [hovered,   setHovered]   = useState<string | null>(null);

  // Build set of booked dates for O(1) lookup
  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);

  // Build calendar grid for current view month
  const days = useMemo(() => {
    const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push(iso);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const isBooked  = (iso: string) => bookedSet.has(iso);
  const isPast    = (iso: string) => iso < today;
  const isDisabled = (iso: string) => isPast(iso) || isBooked(iso);

  const isCheckIn  = (iso: string) => iso === checkIn;
  const isCheckOut = (iso: string) => iso === checkOut;

  const isInRange = (iso: string): boolean => {
    if (!checkIn) return false;
    const end = checkOut ?? hovered;
    if (!end) return false;
    const lo = checkIn  < end ? checkIn  : end;
    const hi = checkIn  < end ? end      : checkIn;
    return iso > lo && iso < hi;
  };

  const hasBookedInRange = (from: string, to: string): boolean => {
    let cursor = addDays(from, 1);
    while (cursor < to) {
      if (bookedSet.has(cursor)) return true;
      cursor = addDays(cursor, 1);
    }
    return false;
  };

  const handleDayClick = (iso: string) => {
    if (isDisabled(iso)) return;

    if (selecting === "checkIn" || !checkIn) {
      setCheckIn(iso);
      setCheckOut(null);
      setSelecting("checkOut");
      return;
    }

    // Selecting check-out
    if (iso <= checkIn) {
      // Clicked before or on check-in — reset
      setCheckIn(iso);
      setCheckOut(null);
      return;
    }

    // Validate no booked dates in range
    if (hasBookedInRange(checkIn, iso)) {
      setCheckIn(iso);
      setCheckOut(null);
      return;
    }

    // Validate min stay
    if (minStayDays && diffDays(checkIn, iso) < minStayDays) return;

    // Validate max stay
    if (maxStayDays && diffDays(checkIn, iso) > maxStayDays) return;

    setCheckOut(iso);
    setSelecting("checkIn");
    onSelect?.(checkIn, iso);
  };

  const getDayClasses = (iso: string): string => {
    const base   = "relative flex items-center justify-center text-sm font-medium rounded-xl transition-all h-10 w-full select-none";
    const inRng  = isInRange(iso);
    const isCI   = isCheckIn(iso);
    const isCO   = isCheckOut(iso);
    const dis    = isDisabled(iso);
    const bkd    = isBooked(iso);
    const past   = isPast(iso);

    if (dis && bkd) return `${base} bg-rose-50 text-rose-300 cursor-not-allowed line-through`;
    if (dis && past) return `${base} text-gray-300 cursor-not-allowed`;
    if (isCI || isCO) return `${base} bg-orange-600 text-white cursor-pointer shadow-md`;
    if (inRng) return `${base} bg-orange-100 text-orange-800 cursor-pointer`;
    return `${base} text-gray-700 hover:bg-gray-100 cursor-pointer`;
  };

  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${className}`}>
      {/* ── Month navigation ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h3 className="text-sm font-bold text-gray-900">
          {MONTHS[viewMonth]} {viewYear}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* ── Weekday headers ── */}
      <div className="grid grid-cols-7 px-4 pt-3">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 pb-2">
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="grid grid-cols-7 gap-0.5 px-4 pb-4">
        {days.map((iso, i) => (
          <div key={i} className="p-0.5">
            {iso ? (
              <div
                className={getDayClasses(iso)}
                onClick={() => handleDayClick(iso)}
                onMouseEnter={() => setHovered(iso)}
                onMouseLeave={() => setHovered(null)}
              >
                {(isCheckIn(iso) || isCheckOut(iso)) && (
                  <Check className="absolute top-1 right-1 w-2.5 h-2.5 text-white opacity-70" />
                )}
                {parseInt(iso.split("-")[2])}
              </div>
            ) : (
              <div className="h-10" />
            )}
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 px-5 pb-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 bg-orange-600 rounded-md" />
          Selected
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 bg-orange-100 rounded-md" />
          Range
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 bg-rose-100 rounded-md" />
          Unavailable
        </div>
      </div>

      {/* ── Selection summary ── */}
      {(checkIn || checkOut) && (
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-400">Check-in</p>
                <p className="text-sm font-bold text-gray-900">
                  {checkIn
                    ? new Date(checkIn).toLocaleDateString("en-GH", { day: "numeric", month: "short" })
                    : "—"
                  }
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <div>
                <p className="text-xs text-gray-400">Check-out</p>
                <p className="text-sm font-bold text-gray-900">
                  {checkOut
                    ? new Date(checkOut).toLocaleDateString("en-GH", { day: "numeric", month: "short" })
                    : "—"
                  }
                </p>
              </div>
            </div>
            {nights > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Duration</p>
                <p className="text-sm font-bold text-orange-600">
                  {nights} {nights === 1 ? "night" : "nights"}
                </p>
              </div>
            )}
          </div>

          {checkIn && !checkOut && (
            <p className="text-xs text-gray-400 mt-2">
              Now select your check-out date
            </p>
          )}
          {minStayDays > 1 && (
            <p className="text-xs text-gray-400 mt-1">
              Minimum stay: {minStayDays} nights
            </p>
          )}
        </div>
      )}
    </div>
  );
}