"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { downloadReport } from "@/lib/downloadReport";
import type { ExportFileFormat, ExportGranularity } from "@/lib/downloadReport";
import { formatDate } from "@/components/reports/reportHelpers";

// ---------------------------------------------------------------------------
// Step 19 Phase 11 - the Download menu at the top of the Reports page.
// Two things can be downloaded from here: the summary (the numbers at the top of
// the page) and the figures over time. Both use the date range and the property
// chosen on the page. The records behind one number are downloaded from the
// records panel instead. The file is built by the server from the same numbers
// the page shows, so a file can never disagree with the screen.
// ---------------------------------------------------------------------------

interface Choice {
  id: string;
  report: "summary" | "trends";
  format: ExportFileFormat;
  label: string;
  hint: string;
}

const SUMMARY_CHOICES: Choice[] = [
  { id: "summary-pdf", report: "summary", format: "pdf", label: "PDF", hint: "Easy to read and to print" },
  { id: "summary-xlsx", report: "summary", format: "xlsx", label: "Excel", hint: "To work with the numbers" },
  { id: "summary-csv", report: "summary", format: "csv", label: "CSV", hint: "A plain table for other tools" },
];

const TREND_CHOICES: Choice[] = [
  { id: "trends-xlsx", report: "trends", format: "xlsx", label: "Excel", hint: "Money and bookings, then occupancy" },
  { id: "trends-csv", report: "trends", format: "csv", label: "CSV", hint: "A plain table for other tools" },
];

const GRANULARITY_WORDS: Record<ExportGranularity, string> = {
  day: "Day by day",
  week: "Week by week",
  month: "Month by month",
};

export default function ExportMenu({
  range,
  scope,
  granularity,
  scopeLabel,
  disabled,
}: {
  range: { from: string; to: string };
  scope: { propertyId?: number; managerClerkId?: string };
  granularity: ExportGranularity;
  scopeLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Esc or a tap outside closes the menu.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const start = async (choice: Choice) => {
    if (busyId) return;
    setBusyId(choice.id);
    setError(null);
    try {
      await downloadReport({
        report: choice.report,
        format: choice.format,
        from: range.from,
        to: range.to,
        propertyId: scope.propertyId,
        managerClerkId: scope.managerClerkId,
        granularity: choice.report === "trends" ? granularity : undefined,
      });
      if (alive.current) setOpen(false);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "The file could not be prepared. Please try again.");
    } finally {
      if (alive.current) setBusyId(null);
    }
  };

  const renderChoices = (choices: Choice[]) =>
    choices.map((c) => (
      <button
        key={c.id}
        type="button"
        role="menuitem"
        disabled={busyId !== null}
        onClick={() => start(c)}
        className="w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg text-left hover:bg-gray-50 disabled:opacity-60"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-gray-900">{c.label}</span>
          <span className="block text-xs text-gray-500">{c.hint}</span>
        </span>
        {busyId === c.id ? <span className="shrink-0 text-xs text-gray-500">Preparing...</span> : null}
      </button>
    ));

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        <Download className="w-4 h-4" />
        {busyId ? "Preparing..." : "Download"}
        <ChevronDown className="w-4 h-4" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Download this report"
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-lg p-2"
        >
          <p className="px-2 pt-1 pb-2 text-xs text-gray-500">
            {scopeLabel ? scopeLabel + " - " : ""}
            {formatDate(range.from)} to {formatDate(range.to)}
          </p>

          <div className="border-t border-gray-100 pt-2">
            <p className="px-2 text-xs font-semibold text-gray-700">Summary</p>
            <p className="px-2 pb-1 text-xs text-gray-500">The numbers at the top of this page</p>
            {renderChoices(SUMMARY_CHOICES)}
          </div>

          <div className="border-t border-gray-100 mt-2 pt-2">
            <p className="px-2 text-xs font-semibold text-gray-700">Over time</p>
            <p className="px-2 pb-1 text-xs text-gray-500">{GRANULARITY_WORDS[granularity]}, as in the charts</p>
            {renderChoices(TREND_CHOICES)}
          </div>

          {error ? (
            <p role="alert" className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </p>
          ) : null}

          <p className="px-2 pt-2 pb-1 text-xs text-gray-400">
            To download the records behind one number, open that number and use Download this list.
          </p>
        </div>
      ) : null}
    </div>
  );
}
