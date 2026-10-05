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
  LineChart,
  Line,
} from "recharts";
import type { ReportingOverview, ReportingTrends } from "@/state/api";
import {
  CHART_COLORS,
  formatCompact,
  formatMoney,
  formatPercent,
  prettyStatus,
  formatBucket,
  formatBucketLong,
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

export function StatTile({ icon: Icon, label, value, hint, onClick }: { icon: any; label: string; value: string; hint?: string; onClick?: () => void }) {
  const inner = (
    <>
      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate" title={value}>{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {hint ? <p className="text-xs text-gray-400 mt-1">{hint}</p> : null}
      {onClick ? <p className="text-xs font-medium text-blue-600 mt-2">View records</p> : null}
    </>
  );
  const box = "bg-white rounded-2xl border border-gray-200 p-5 min-w-0";
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={box + " block w-full text-left hover:border-blue-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"}
      >
        {inner}
      </button>
    );
  }
  return <div className={box}>{inner}</div>;
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
export function BookingsBreakdown({
  bookings,
  onOpen,
}: {
  bookings: ReportingOverview["bookings"];
  onOpen?: (request: { metric: string; status?: string; title?: string }) => void;
}) {
  const groups = [
    { title: "Hostel", metric: "bookings_hostel", map: bookings.hostel },
    { title: "Short stay", metric: "bookings_short_stay", map: bookings.shortStay },
    { title: "Rental leases", metric: "bookings_lease", map: bookings.lease },
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
                  <li key={status}>
                    {onOpen && count > 0 ? (
                      <button
                        type="button"
                        onClick={() => onOpen({ metric: g.metric, status: status, title: g.title + ": " + prettyStatus(status) })}
                        className="w-full flex justify-between gap-2 text-sm text-left rounded-md px-1 -mx-1 py-0.5 hover:bg-white"
                      >
                        <span className="text-gray-600 truncate">{prettyStatus(status)}</span>
                        <span className="font-medium text-blue-700">{count} {"\u203A"}</span>
                      </button>
                    ) : (
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-gray-600 truncate">{prettyStatus(status)}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                    )}
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

// ---------------------------------------------------------------------------
// Step 19 Phase 6 - trend charts
// ---------------------------------------------------------------------------

type TrendSeries = { key: string; label: string; color: string };

const TOP_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const NO_RADIUS: [number, number, number, number] = [0, 0, 0, 0];

// Stacked columns over time (money by product, or bookings by product).
export function TrendColumns({
  data,
  series,
  granularity,
  money,
}: {
  data: any[];
  series: TrendSeries[];
  granularity: string;
  money?: boolean;
}) {
  const hasData = data.some((row: any) => series.some((s) => (row[s.key] || 0) > 0));
  if (!hasData) {
    return <p className="text-sm text-gray-500">Nothing to show for this period.</p>;
  }
  const show = (v: number) => (money ? formatMoney(v) : String(v));
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-sm text-gray-600">{s.label}</span>
          </li>
        ))}
      </ul>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.axis }}
              tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
              tickFormatter={(d: string) => formatBucket(d, granularity)}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
              tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
              tickFormatter={(v: number) => formatCompact(v)}
            />
            <Tooltip
              cursor={{ fill: "#f4f3ef" }}
              labelFormatter={(d: any) => formatBucketLong(String(d), granularity)}
              formatter={(v: any, name: any) => [show(Number(v)), name]}
            />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="trend"
                fill={s.color}
                stroke="#ffffff"
                strokeWidth={2}
                maxBarSize={24}
                radius={i === series.length - 1 ? TOP_RADIUS : NO_RADIUS}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Occupancy rate per night, from the nightly bed snapshots.
export function OccupancyLine({ points }: { points: ReportingTrends["occupancy"] }) {
  if (points.length < 2) {
    return (
      <div>
        <p className="text-sm text-gray-500">
          Not enough history yet. A snapshot of your beds is saved every night, so this chart fills in day by day.
        </p>
        {points.length === 1 ? (
          <p className="mt-2 text-sm text-gray-700">
            {formatBucketLong(points[0].date, "day")}: {formatPercent(points[0].occupancyRate)} occupied
          </p>
        ) : null}
      </div>
    );
  }
  const data = points.map((p) => ({ date: p.date, rate: p.occupancyRate }));
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.axis }}
            tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
            tickFormatter={(d: string) => formatBucket(d, "day")}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            domain={[0, 1]}
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
            tickFormatter={(v: number) => Math.round(v * 100) + "%"}
          />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.axis }}
            labelFormatter={(d: any) => formatBucketLong(String(d), "day")}
            formatter={(v: any) => [formatPercent(Number(v)), "Occupancy"]}
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke={CHART_COLORS.blue}
            strokeWidth={2}
            dot={{ r: 4, fill: CHART_COLORS.blue, stroke: "#ffffff", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
