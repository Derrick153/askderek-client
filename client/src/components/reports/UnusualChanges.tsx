"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import type { ReportingAnomalies, ReportingAnomalyRule } from "@/state/api";

// "Unusual changes" - each rule compares the recent past with the period before it and says
// out loud one of four things: flagged (with the records behind it), clear, not enough data
// yet, or could not run. A rule with too little history never shows a made-up number - it
// says what it is waiting for. The rule in plain words is always one tap away.

interface Props {
  anomalies: ReportingAnomalies | undefined;
  isFetching: boolean;
  isError: boolean;
  waiting: boolean;
  onRetry: () => void;
}

const LOOK: { [key: string]: { label: string; chip: string; dot: string; rank: number } } = {
  large: { label: "Large change", chip: "bg-red-50 text-red-800 border-red-200", dot: "bg-red-500", rank: 0 },
  notable: { label: "Notable change", chip: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500", rank: 1 },
  failed: { label: "Could not run", chip: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500", rank: 2 },
  clear: { label: "Clear", chip: "bg-green-50 text-green-800 border-green-200", dot: "bg-green-600", rank: 3 },
  not_enough_data: {
    label: "Not enough data yet",
    chip: "bg-gray-100 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
    rank: 4,
  },
};

const PAGE_LINKS: { [key: string]: { href: string; label: string } } = {
  occupancy_drop: { href: "/managers/hostel/occupancy", label: "Open beds and rooms" },
  payment_failures: { href: "/managers/payments", label: "Open payments" },
  rooms_under_used: { href: "/managers/hostel/occupancy", label: "Open beds and rooms" },
};

function lookKey(rule: ReportingAnomalyRule): string {
  if (rule.status === "flagged") return rule.severity === "large" ? "large" : "notable";
  return rule.status in LOOK ? rule.status : "clear";
}

function money(n: number): string {
  return "GH\u20B5" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function RuleRow({
  rule,
  open,
  onToggle,
  onRetry,
}: {
  rule: ReportingAnomalyRule;
  open: boolean;
  onToggle: () => void;
  onRetry: () => void;
}) {
  const look = LOOK[lookKey(rule)];
  const link = rule.status === "flagged" ? PAGE_LINKS[rule.key] : undefined;
  const shown = rule.examples.slice(0, 5);
  const more = rule.count - shown.length;

  return (
    <li className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={
                "inline-flex items-center gap-1.5 shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium " +
                look.chip
              }
            >
              <span className={"w-1.5 h-1.5 rounded-full " + look.dot} />
              {look.label}
            </span>
            <span className="text-sm font-medium text-gray-900">{rule.title}</span>
          </span>
          <span className="block mt-1.5 text-sm text-gray-600 break-words">{rule.headline}</span>
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
        )}
      </button>

      {open ? (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2 space-y-3">
          <p className="text-xs text-gray-500">{rule.rule}</p>

          {rule.status === "failed" ? (
            <p className="text-xs text-amber-900">
              That is not the same as nothing found.{" "}
              <button type="button" onClick={onRetry} className="font-medium underline">
                Try again
              </button>
            </p>
          ) : null}

          {shown.length > 0 ? (
            <ul className="space-y-2">
              {shown.map((ex) => (
                <li key={ex.id} className="text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words font-medium text-gray-900">{ex.label}</span>
                    {ex.amount !== null ? (
                      <span className="shrink-0 text-xs text-gray-500 tabular-nums">{money(ex.amount)}</span>
                    ) : null}
                  </div>
                  <p className="text-gray-600 break-words">{ex.detail}</p>
                  {ex.property ? <p className="text-xs text-gray-400 break-words">{ex.property}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {more > 0 ? <p className="text-xs text-gray-500">and {more} more</p> : null}

          {link ? (
            <Link href={link.href} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
              {link.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function UnusualChanges({ anomalies, isFetching, isError, waiting, onRetry }: Props) {
  const [openState, setOpenState] = useState<{ [key: string]: boolean }>({});

  if (!anomalies && (waiting || (isFetching && !isError))) {
    return <div className="animate-pulse bg-gray-200 rounded-2xl h-32" aria-label="Checking for unusual changes" />;
  }

  if (!anomalies) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800">Unusual changes could not be loaded</p>
          <p className="text-sm text-red-700 mt-0.5">Check your connection and try again.</p>
          <button onClick={onRetry} className="mt-3 text-sm font-medium text-red-800 underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { summary, rules } = anomalies;
  const ordered = rules
    .map((r, i) => ({ r, i }))
    .sort((a, b) => LOOK[lookKey(a.r)].rank - LOOK[lookKey(b.r)].rank || a.i - b.i)
    .map((x) => x.r);

  const parts: string[] = [];
  if (summary.flagged > 0) parts.push(summary.flagged + " flagged");
  if (summary.failed > 0) parts.push(summary.failed + " could not run");
  if (summary.notEnoughData > 0) parts.push(summary.notEnoughData + " waiting for data");
  if (summary.clear > 0) parts.push(summary.clear + " clear");

  const quiet = summary.flagged === 0 && summary.failed === 0;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">Unusual changes</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Recent days compared with the days before{timeOf(anomalies.asOf) ? " (" + timeOf(anomalies.asOf) + ")" : ""}
            {isFetching ? " | updating..." : ""} | {rules.length} written checks
          </p>
        </div>
        {parts.length > 0 ? <p className="text-sm font-medium text-gray-700">{parts.join(" \u00B7 ")}</p> : null}
      </div>

      {quiet && summary.notEnoughData === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">Nothing unusual</p>
            <p className="text-sm text-green-800 mt-0.5">All {rules.length} checks compared the recent past and found nothing out of the ordinary.</p>
          </div>
        </div>
      ) : null}

      {quiet && summary.notEnoughData > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Nothing unusual found so far</p>
          <p className="text-sm text-gray-600 mt-0.5">
            {summary.notEnoughData === 1 ? "1 check needs" : summary.notEnoughData + " checks need"} more history before it
            can say anything. That is different from all clear.
          </p>
        </div>
      ) : null}

      <ul className="space-y-2">
        {ordered.map((rule) => {
          const open = rule.key in openState ? openState[rule.key] : rule.status === "flagged" && rule.severity === "large";
          return (
            <RuleRow
              key={rule.key}
              rule={rule}
              open={open}
              onToggle={() => setOpenState((s) => ({ ...s, [rule.key]: !open }))}
              onRetry={onRetry}
            />
          );
        })}
      </ul>
    </section>
  );
}