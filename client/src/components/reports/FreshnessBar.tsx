"use client";

import { useEffect, useState } from "react";

// Phase 10 - how fresh is what is on screen?
// FreshnessBar: one line at the top of Reports saying when the numbers were worked out (by the
// server's clock, taken from the oldest section on the page), whether the page has gone stale
// while the tab sat open, and which parts are live versus saved each night.
// SnapshotNote: sits under "Occupancy over time" and says how many nightly records the chart
// has, when the newest one is from, and when nights are missing - gaps are never filled in.

const STALE_MINUTES = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function useNow(everyMs: number): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ago(mins: number): string {
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  if (mins < 60) return mins + " minutes ago";
  const h = Math.floor(mins / 60);
  return h === 1 ? "1 hour ago" : h + " hours ago";
}

interface BarProps {
  summary: string;
  stamps: (string | undefined | null)[];
  isFetching: boolean;
  onRefresh: () => void;
}

export function FreshnessBar({ summary, stamps, isFetching, onRefresh }: BarProps) {
  const now = useNow(30000);
  const times: number[] = [];
  stamps.forEach((s) => {
    if (typeof s !== "string") return;
    const t = Date.parse(s);
    if (!isNaN(t)) times.push(t);
  });
  const oldest = times.length > 0 ? Math.min.apply(null, times) : null;
  const mins = oldest === null ? 0 : Math.max(0, Math.floor((now - oldest) / 60000));
  const stale = oldest !== null && mins >= STALE_MINUTES;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">{summary}</p>
      {oldest !== null ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium " +
              (stale ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-green-50 text-green-800 border-green-200")
            }
          >
            <span className={"w-1.5 h-1.5 rounded-full " + (stale ? "bg-amber-500" : "bg-green-600")} />
            {stale ? "Out of date" : "Live data"}
          </span>
          <span className="text-xs text-gray-600">
            Updated {clock(oldest)} ({ago(mins)}){isFetching ? " | updating..." : ""}
          </span>
        </div>
      ) : null}
      <p className="text-xs text-gray-400">
        Money, bookings, beds and the lists below are worked out live each time you open or refresh this page. Occupancy
        over time uses a record saved each night.
      </p>
      {stale ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">
            This page was last updated {ago(mins)}, so some numbers may have changed since.{" "}
            <button type="button" onClick={onRefresh} className="font-medium underline">
              Refresh now
            </button>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function utcDay(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

function dayLabel(day: number): string {
  const d = new Date(day * DAY_MS);
  return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
}

export function SnapshotNote({ points, rangeTo }: { points: { date: string }[]; rangeTo?: string }) {
  const now = useNow(60000);
  const seen: { [day: number]: boolean } = {};
  const days: number[] = [];
  points.forEach((p) => {
    const t = Date.parse(p.date);
    if (isNaN(t)) return;
    const d = utcDay(t);
    if (!seen[d]) {
      seen[d] = true;
      days.push(d);
    }
  });
  if (days.length === 0) return null;
  days.sort((a, b) => a - b);

  const today = utcDay(now);
  const end = rangeTo ? Date.parse(rangeTo) : NaN;
  const endDay = isNaN(end) ? today : Math.min(utcDay(end), today);
  const first = days[0];
  const last = days[days.length - 1];
  const trailing = endDay - last;
  const missing = last - first + 1 - days.length;
  const warn = trailing >= 2 || missing > 0;

  if (!warn) {
    return (
      <p className="mt-2 text-xs text-gray-500">
        Nightly records in this period: {days.length}. The newest is from {dayLabel(last)}.
      </p>
    );
  }

  return (
    <div role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
      <p className="text-sm font-medium text-amber-900">Some nights have no record</p>
      {trailing >= 2 ? (
        <p className="text-xs text-amber-900">
          {endDay === today
            ? "The newest nightly record is from " + dayLabel(last) + " (" + trailing + " days ago)."
            : "The newest nightly record is from " + dayLabel(last) + ", " + trailing + " days before this period ends."}
        </p>
      ) : null}
      {missing > 0 ? (
        <p className="text-xs text-amber-900">
          {missing} {missing === 1 ? "night" : "nights"} between {dayLabel(first)} and {dayLabel(last)}{" "}
          {missing === 1 ? "has" : "have"} no record.
        </p>
      ) : null}
      <p className="text-xs text-amber-800">
        The line joins the nights that have a record. It does not guess the missing nights, and a missing night is not the
        same as an empty one.
      </p>
    </div>
  );
}