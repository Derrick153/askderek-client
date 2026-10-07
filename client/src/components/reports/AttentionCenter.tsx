"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import type { ReportingAttention, ReportingAttentionItem } from "@/state/api";

// "Needs your attention" - one list across hostel, rent, short stay and enquiries.
// Every item comes from a written rule on the server and carries that rule in plain words,
// so the manager can always see WHY something is on the list. Rules with nothing to show
// are listed under "checks that are clear"; rules that could not run are said out loud.

interface Props {
  attention: ReportingAttention | undefined;
  isFetching: boolean;
  isError: boolean;
  waiting: boolean;
  onRetry: () => void;
}

const SEVERITY: { [key: string]: { label: string; chip: string; dot: string } } = {
  urgent: { label: "Urgent", chip: "bg-red-50 text-red-800 border-red-200", dot: "bg-red-500" },
  soon: { label: "Soon", chip: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  info: { label: "Heads-up", chip: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-500" },
};

const PAGE_LINKS: { [key: string]: { href: string; label: string } } = {
  applications: { href: "/managers/applications", label: "Open applications" },
  hostel: { href: "/managers/hostel", label: "Open hostel bookings" },
  hostel_occupancy: { href: "/managers/hostel/occupancy", label: "Open beds and rooms" },
  payments: { href: "/managers/payments", label: "Open payments" },
  bookings: { href: "/managers/bookings", label: "Open bookings" },
  enquiries: { href: "/managers/enquiries", label: "Open enquiries" },
};

function money(n: number): string {
  return "GH\u20B5" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ItemRow({ item, open, onToggle }: { item: ReportingAttentionItem; open: boolean; onToggle: () => void }) {
  const sev = SEVERITY[item.severity] ?? SEVERITY.info;
  const link = item.page ? PAGE_LINKS[item.page] : undefined;
  const shown = item.examples.slice(0, 5);
  const more = item.count - shown.length;

  return (
    <li className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <span
          className={
            "inline-flex items-center gap-1.5 shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium " + sev.chip
          }
        >
          <span className={"w-1.5 h-1.5 rounded-full " + sev.dot} />
          {sev.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-gray-900">{item.title}</span>
          {item.amount !== null ? <span className="block text-xs text-gray-500">{money(item.amount)}</span> : null}
        </span>
        <span className="text-lg font-semibold text-gray-900 tabular-nums">{item.count}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {open ? (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2 space-y-3">
          <p className="text-xs text-gray-500">{item.rule}</p>
          <ul className="space-y-2">
            {shown.map((ex) => (
              <li key={ex.id} className="text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words font-medium text-gray-900">{ex.label}</span>
                  {ex.amount !== null ? (
                    <span className="shrink-0 text-xs text-gray-500 tabular-nums">{money(ex.amount)}</span>
                  ) : null}
                </div>
                <p className="text-gray-600">{ex.detail}</p>
                {ex.property ? <p className="text-xs text-gray-400">{ex.property}</p> : null}
              </li>
            ))}
          </ul>
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

export default function AttentionCenter({ attention, isFetching, isError, waiting, onRetry }: Props) {
  const [openState, setOpenState] = useState<{ [key: string]: boolean }>({});
  const [showClear, setShowClear] = useState(false);

  if (!attention && (waiting || (isFetching && !isError))) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-2xl h-40" aria-label="Checking what needs your attention" />
    );
  }

  if (!attention) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800">What needs your attention could not be loaded</p>
          <p className="text-sm text-red-700 mt-0.5">Check your connection and try again.</p>
          <button onClick={onRetry} className="mt-3 text-sm font-medium text-red-800 underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { summary, items, clear, failed } = attention;
  const allClear = items.length === 0 && failed.length === 0;
  const parts: string[] = [];
  if (summary.urgent > 0) parts.push(summary.urgent + " urgent");
  if (summary.soon > 0) parts.push(summary.soon + " soon");
  if (summary.info > 0) parts.push(summary.info + (summary.info === 1 ? " heads-up" : " heads-ups"));

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">Needs your attention</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Right now{timeOf(attention.asOf) ? " (" + timeOf(attention.asOf) + ")" : ""}
            {isFetching ? " | updating..." : ""} | {attention.rulesChecked} written checks
          </p>
        </div>
        {parts.length > 0 ? <p className="text-sm font-medium text-gray-700">{parts.join(" \u00B7 ")}</p> : null}
      </div>

      {allClear ? (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">All clear</p>
            <p className="text-sm text-green-800 mt-0.5">
              Nothing needs you right now. All {attention.rulesChecked} checks ran.
            </p>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <p className="text-xs text-gray-500">Tap an item to see why it is here and which records it is about.</p>
          <ul className="space-y-2">
            {items.map((item) => {
              const open = item.key in openState ? openState[item.key] : item.severity === "urgent";
              return (
                <ItemRow
                  key={item.key}
                  item={item}
                  open={open}
                  onToggle={() => setOpenState((s) => ({ ...s, [item.key]: !open }))}
                />
              );
            })}
          </ul>
        </>
      ) : null}

      {failed.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-900">
              {failed.length === 1 ? "1 check" : failed.length + " checks"} could not run just now
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              {failed.map((f) => f.title).join(", ")}. This is not the same as nothing found.{" "}
              <button onClick={onRetry} className="font-medium underline">
                Try again
              </button>
            </p>
          </div>
        </div>
      ) : null}

      {clear.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setShowClear((v) => !v)}
            aria-expanded={showClear}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
          >
            {showClear ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {clear.length === 1 ? "1 check is clear" : clear.length + " checks are clear"}
          </button>
          {showClear ? (
            <ul className="mt-2 space-y-2">
              {clear.map((c) => (
                <li key={c.key} className="text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">{c.title}</p>
                      <p className="text-xs text-gray-500">{c.rule}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}