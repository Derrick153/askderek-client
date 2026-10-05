"use client";

import type { ReactNode } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ReportingOverview } from "@/state/api";
import {
  CHART_COLORS,
  formatCompact,
  formatMoney,
  formatPercent,
  prettyStatus,
} from "./reportHelpers";

// ---------------------------------------------------------------------------
// Step 19 - building blocks for the manager Reports page.
// Light theme, same card style as the Hostel page. Numbers are always shown as
// text next to the colour, so nothing depends on colour alone.
// ---------------------------------------------------------------------------

export function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 min-w-0">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {subtitle ? <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatTile({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 min-w-0">
      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate" title={value}>{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {hint ? <p className="text-xs text-gray-400 mt-1">{hint}</p> : null}
    </div>
  );
}

// A percentage meter. rate === null means "no data", shown as an empty track.
export function Meter({ label, rate, detail }: { label: string; rate: number | null; detail: string }) {
  const pct = rate === null ? 0 : Math.max(0, Math.min(1, rate)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{formatPercent(rate)}</p>
      </div>
      <div className="mt-2 h-2.5 w-full rounded-full" style={{ background: "#cde2fb" }}>
        <div className="h-full rounded-full" style={{ width: pct + "%", background: CHART_COLORS.blue }} />
      </div>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

// One stacked bar: how the beds are split. Colour + number + label for each part.
export function BedStatusBar({ occupancy }: { occupancy: ReportingOverview["occupancy"] }) {
  const parts = [
    { key: "occupied", label: "Occupied", value: occupancy.occupied, color: CHART_COLORS.blue },
    { key: "reserved", label: "Reserved", value: occupancy.reserved, color: CHART_COLORS.orange },
    { key: "available", label: "Available", value: occupancy.available, color: CHART_COLORS.aqua },
    { key: "maintenance", label: "Maintenance", value: occupancy.maintenance, color: CHART_COLORS.yellow },
  ];
  const total = parts.reduce((n, p) => n + p.value, 0);

  if (total === 0) {
    return <p className="text-sm text-gray-500">No beds have been set up yet.</p>;
  }

  return (
    <div>
      <div className="flex h-6 w-full gap-[2px]" role="img" aria-label="Bed status breakdown">
        {parts.filter((p) => p.value > 0).map((p) => (
          <div
            key={p.key}
            title={p.label + ": " + p.value + " beds"}
            className="h-full rounded-[4px]"
            style={{ flexGrow: p.value, flexBasis: 0, minWidth: 6, background: p.color }}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} />
            <span className="text-sm text-gray-600 truncate">{p.label}</span>
            <span className="ml-auto text-sm font-semibold text-gray-900">{p.value}</span>
          </li>
        ))}
      </ul>
      {occupancy.retiredBeds > 0 ? (
        <p className="mt-3 text-xs text-gray-400">{occupancy.retiredBeds} retired bed(s) are not counted above.</p>
      ) : null}
    </div>
  );
}

// A small column chart with hover tooltips, plus the values written out underneath.
export function SimpleBars({ data, money, unit }: { data: { name: string; value: number }[]; money?: boolean; unit?: string }) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return <p className="text-sm text-gray-500">Nothing to show for this period.</p>;
  }
  const show = (v: number) => (money ? formatMoney(v) : String(v) + (unit ? " " + unit : ""));
  return (
    <div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.axis }}
              tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
              tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
              tickFormatter={(v: number) => formatCompact(v)}
            />
            <Tooltip cursor={{ fill: "#f4f3ef" }} formatter={(v: any) => show(Number(v))} />
            <Bar dataKey="value" fill={CHART_COLORS.blue} barSize={24} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 grid gap-2 text-center" style={{ gridTemplateColumns: "repeat(" + data.length + ", minmax(0, 1fr))" }}>
        {data.map((d) => (
          <li key={d.name} className="min-w-0">
            <p className="text-xs text-gray-500 truncate">{d.name}</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{show(d.value)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Booking counts by status for each product (each keeps its own status names).
export function BookingsBreakdown({ bookings }: { bookings: ReportingOverview["bookings"] }) {
  const groups = [
    { title: "Hostel", map: bookings.hostel },
    { title: "Short stay", map: bookings.shortStay },
    { title: "Rental leases", map: bookings.lease },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {groups.map((g) => {
        const rows = Object.entries(g.map);
        const sum = rows.reduce((n, r) => n + r[1], 0);
        return (
          <div key={g.title} className="rounded-xl border border-gray-100 bg-gray-50 p-4 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">{g.title}</p>
              <p className="text-sm text-gray-500">{sum} total</p>
            </div>
            {rows.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">None in this period</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {rows.map(([status, count]) => (
                  <li key={status} className="flex justify-between gap-2 text-sm">
                    <span className="text-gray-600 truncate">{prettyStatus(status)}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}