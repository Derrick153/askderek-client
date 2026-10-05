"use client";

import { useState } from "react";
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, DollarSign, Wrench } from "lucide-react";
import type { ReportingHostel } from "@/state/api";
import { SectionCard, StatTile } from "@/components/reports/ReportParts";
import { CHART_COLORS, formatDate, formatMoney, prettyStatus } from "@/components/reports/reportHelpers";

// ---------------------------------------------------------------------------
// Step 19, Phase 6b - Hostel insights: semester performance + maintenance.
// Everything shown here is calculated by the server (GET /api/reports/hostel);
// this component only displays it.
// ---------------------------------------------------------------------------

const DOT = " \u00B7 ";

// Semesters listed before the Show all button.
const SEMESTERS_SHOWN = 8;

function statusLine(byStatus: Record<string, number>): string {
  return Object.entries(byStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([status, n]) => prettyStatus(status) + " " + n)
    .join(DOT);
}

function daysLabel(n: number): string {
  return n + (n === 1 ? " day" : " days");
}

export function HostelInsights({
  hostel,
  isFetching,
  isError,
  onRetry,
}: {
  hostel: ReportingHostel | undefined;
  isFetching: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const [yearChoice, setYearChoice] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (!hostel) {
    if (isError) {
      return (
        <SectionCard title="Hostel insights" subtitle="Semester performance and maintenance">
          <p className="text-sm text-gray-600">The hostel insights could not be loaded.</p>
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center justify-center h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Try again
          </button>
        </SectionCard>
      );
    }
    return (
      <SectionCard title="Hostel insights" subtitle="Semester performance and maintenance">
        <p className="text-sm text-gray-500">
          {isFetching ? "Loading hostel insights..." : "Hostel insights will load in a moment."}
        </p>
      </SectionCard>
    );
  }

  const m = hostel.maintenance;
  const years = hostel.academicYears;
  if (years.length === 0 && m.inMaintenanceNow === 0 && m.period.entered === 0) return null;

  const selected = years.find((y) => y.label === yearChoice) ?? years[0];
  const maxTotal = selected ? Math.max(1, ...selected.semesters.map((s) => s.total)) : 1;
  const awaitingCount = selected ? selected.totals.byStatus["AWAITING_PAYMENT"] || 0 : 0;

  const visibleSemesters = selected ? (showAll ? selected.semesters : selected.semesters.slice(0, SEMESTERS_SHOWN)) : [];
  const avg = m.period.avgDaysToFix;
  const avgText = avg === null ? "-" : avg < 1 ? "Under a day" : daysLabel(avg);
  const hasUnrecorded = m.openBeds.some((b) => !b.sinceRecorded);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Hostel insights</h2>
        <p className="text-sm text-gray-500 mt-0.5">Semester performance by academic year, and beds that need repair</p>
      </div>

      <SectionCard title="Semester performance" subtitle="Hostel bookings by academic year and semester. The date range above does not change these figures.">
        {!selected ? (
          <p className="text-sm text-gray-500">No hostel bookings yet.</p>
        ) : (
          <div className="space-y-5">
            {years.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {years.map((y) => (
                  <button
                    key={y.label}
                    onClick={() => {
                      setYearChoice(y.label);
                      setShowAll(false);
                    }}
                    className={
                      "h-9 px-3 rounded-full text-sm font-medium border " +
                      (y.label === selected.label
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50")
                    }
                  >
                    {y.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-700">Academic year {selected.label}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatTile icon={CalendarCheck} label="Bookings" value={String(selected.totals.total)} hint="All statuses, by check-in date" />
              <StatTile icon={DollarSign} label="Money received" value={formatMoney(selected.totals.received)} hint="Paid and part-paid payments" />
              <StatTile
                icon={Clock}
                label="Awaiting payment"
                value={formatMoney(selected.totals.awaitingPayment)}
                hint={awaitingCount === 1 ? "1 approved booking not yet paid" : awaitingCount + " approved bookings not yet paid"}
              />
            </div>

            <ul>
              {visibleSemesters.map((s) => (
                <li key={s.key} className="py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-gray-800 truncate" title={s.name}>{s.name}</p>
                    <p className="text-sm font-semibold text-gray-900 shrink-0">
                      {s.total} {s.total === 1 ? "booking" : "bookings"}
                    </p>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full" style={{ background: "#cde2fb" }}>
                    <div className="h-full rounded-full" style={{ width: (s.total / maxTotal) * 100 + "%", background: CHART_COLORS.blue }} />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{statusLine(s.byStatus)}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Received {formatMoney(s.received)}
                    {DOT}
                    Awaiting payment {formatMoney(s.awaitingPayment)}
                  </p>
                </li>
              ))}
            </ul>

            {selected.semesters.length > SEMESTERS_SHOWN ? (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showAll ? "Show fewer semesters" : "Show all " + selected.semesters.length + " semesters"}
              </button>
            ) : null}

            {selected.hiddenSemesters > 0 ? (
              <p className="text-xs text-gray-500">
                {selected.hiddenSemesters} more {selected.hiddenSemesters === 1 ? "semester" : "semesters"} with fewer bookings are not listed. The totals above include them.
              </p>
            ) : null}
            <p className="text-xs text-gray-400">
              {hostel.academicYearRule} Semester names are typed by students, so similar names can appear as separate rows.
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Maintenance"
        subtitle={"Beds that went into maintenance between " + formatDate(hostel.range.from) + " and " + formatDate(hostel.range.to)}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile icon={Wrench} label="In maintenance now" value={String(m.inMaintenanceNow)} hint="A live snapshot" />
            <StatTile icon={AlertTriangle} label="Went into maintenance" value={String(m.period.entered)} hint="In this period" />
            <StatTile
              icon={CheckCircle2}
              label="Back in use"
              value={String(m.period.fixed)}
              hint={m.period.retired + " retired" + DOT + m.period.stillOpen + " still open"}
            />
            <StatTile icon={Clock} label="Average time to fix" value={avgText} hint="Beds fixed in this period" />
          </div>

          {m.openBeds.length === 0 ? (
            <p className="text-sm text-gray-500">No beds are in maintenance right now.</p>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Beds in maintenance now</h3>
              <ul className="mt-1">
                {m.openBeds.map((b) => (
                  <li key={b.bedId} className="flex items-start justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate" title={b.propertyName}>{b.propertyName}</p>
                      <p className="text-xs text-gray-500">
                        Room {b.roomNumber}
                        {DOT}
                        Bed {b.bedNumber}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {b.sinceRecorded ? "In maintenance since " : "Last changed "}
                        {formatDate(b.since)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900">{daysLabel(b.days)}</p>
                      {b.days >= 30 ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <AlertTriangle className="w-3 h-3" />
                          30+ days
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              {m.inMaintenanceNow > m.openBeds.length ? (
                <p className="mt-2 text-xs text-gray-500">
                  And {m.inMaintenanceNow - m.openBeds.length} more. The longest-waiting beds are listed first.
                </p>
              ) : null}
              {hasUnrecorded ? (
                <p className="mt-2 text-xs text-gray-400">
                  Beds marked Last changed have no maintenance record, so the date shown is when the bed was last updated.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </SectionCard>
    </section>
  );
}