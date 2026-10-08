"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { RANGE_PRESETS, prettyStatus } from "@/components/reports/reportHelpers";
import {
  SAVED_REPORT_NAME_MAX,
  savedReportErrorMessage,
  useCreateSavedReportMutation,
  useDeleteSavedReportMutation,
  useGetSavedReportsQuery,
} from "@/state/savedReportsApi";
import type { SavedOverviewFilters, SavedReport } from "@/state/savedReportsApi";

// ---------------------------------------------------------------------------
// Step 19 Phase 12 - the Saved menu at the top of the Reports page.
// Lists the manager's saved views, opens one with a tap, deletes one (after a
// confirmation), and saves the view that is on screen under a name. Only the
// choices are saved (date range key, property, chart step, or which list), so a
// saved view always shows today's figures. The list is only requested the first
// time the menu is opened.
// ---------------------------------------------------------------------------

const GRANULARITY_WORDS = { day: "Daily", week: "Weekly", month: "Monthly" } as const;

function rangeWords(preset: string): string {
  const found = RANGE_PRESETS.find((p) => p.key === preset);
  return found ? found.label : "An older date range";
}

function scopeWords(propertyId: number | null, propertyName: (id: number) => string | null): string {
  if (propertyId === null) return "All your properties";
  return propertyName(propertyId) ?? "A property";
}

function describeSaved(report: SavedReport, propertyName: (id: number) => string | null): string {
  const parts: string[] = [];
  if (report.reportType === "overview") {
    parts.push("Whole page");
    parts.push(rangeWords(report.filters.preset));
    parts.push(scopeWords(report.filters.propertyId, propertyName));
    if (report.filters.granularity) parts.push(GRANULARITY_WORDS[report.filters.granularity]);
  } else {
    parts.push(report.filters.title ?? prettyStatus(report.filters.metric));
    parts.push(rangeWords(report.filters.preset));
    parts.push(scopeWords(report.filters.propertyId, propertyName));
  }
  return parts.join(" \u00b7 ");
}

export default function SavedReportsMenu({
  current,
  onApply,
  propertyName,
  disabled,
}: {
  current: SavedOverviewFilters;
  onApply: (report: SavedReport) => string | null;
  propertyName: (id: number) => string | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const inputId = useId();

  const { data, isLoading, isError, refetch } = useGetSavedReportsQuery(undefined, { skip: !opened });
  const [createReport, { isLoading: saving }] = useCreateSavedReportMutation();
  const [deleteReport] = useDeleteSavedReportMutation();

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

  const toggle = () => {
    if (!open) {
      setOpened(true);
      setNote(null);
      setListError(null);
      setConfirmId(null);
    }
    setOpen((o) => !o);
  };

  const apply = (report: SavedReport) => {
    const known = RANGE_PRESETS.some((p) => p.key === report.filters.preset);
    const safe = known ? report : ({ ...report, filters: { ...report.filters, preset: "30d" } } as SavedReport);
    const pageNote = onApply(safe);
    const notes = [known ? null : "That date range is no longer offered, so the last 30 days are shown.", pageNote].filter((x): x is string => !!x);
    if (notes.length === 0) setOpen(false);
    else setNote(notes.join(" "));
  };

  const remove = async (id: number) => {
    if (deletingId !== null) return;
    setDeletingId(id);
    setListError(null);
    setNote(null);
    try {
      await deleteReport(id).unwrap();
    } catch (e) {
      if (alive.current) {
        setListError(savedReportErrorMessage(e, "Could not delete it. Please try again."));
        refetch();
      }
    } finally {
      if (alive.current) {
        setDeletingId(null);
        setConfirmId(null);
      }
    }
  };

  const submit = async () => {
    const trimmed = name.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      setFormError("Type a name first.");
      return;
    }
    setFormError(null);
    setNote(null);
    try {
      await createReport({ name: trimmed, reportType: "overview", filters: current }).unwrap();
      if (alive.current) {
        setName("");
        setNote("Saved. It is at the top of the list.");
      }
    } catch (e) {
      if (alive.current) setFormError(savedReportErrorMessage(e, "Could not save it. Please try again."));
    }
  };

  const list = data ?? [];

  return (
    <div ref={wrapper} className="sm:relative">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        Saved{data && data.length > 0 ? " (" + data.length + ")" : ""}
        <ChevronDown className="w-4 h-4" />
      </button>

      {open ? (
        <div
          role="region"
          aria-label="Saved reports"
          className="absolute left-0 right-0 sm:left-auto sm:right-0 top-full mt-2 z-30 sm:w-80 max-h-[75vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg p-2"
        >
          <p className="px-2 pt-1 text-xs font-semibold text-gray-700">Your saved views</p>
          <p className="px-2 pb-1 text-xs text-gray-500">Tap one to open it. Figures are always today&apos;s.</p>

          {isError && !data ? (
            <div className="px-2 py-3">
              <p className="text-sm text-gray-600">Your saved views could not be loaded.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Try again
              </button>
            </div>
          ) : isLoading || (!data && opened) ? (
            <p className="px-2 py-3 text-sm text-gray-500">Loading...</p>
          ) : list.length === 0 ? (
            <p className="px-2 py-3 text-sm text-gray-500">Nothing saved yet. Save the view on screen below.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {list.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-2 py-1">
                  <button
                    type="button"
                    onClick={() => apply(r)}
                    className="min-w-0 flex-1 text-left rounded-lg px-2 py-1.5 hover:bg-gray-50"
                  >
                    <span className="block text-sm font-medium text-gray-900 truncate">{r.name}</span>
                    <span className="block text-xs text-gray-500 break-words">{describeSaved(r, propertyName)}</span>
                  </button>
                  {confirmId === r.id ? (
                    <span className="shrink-0 flex items-center gap-1 pt-1.5">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        disabled={deletingId !== null}
                        className="h-7 px-2 rounded-lg border border-red-100 bg-red-50 text-xs font-medium text-red-800 disabled:opacity-60"
                      >
                        {deletingId === r.id ? "Deleting..." : "Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={deletingId !== null}
                        className="h-7 px-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(r.id)}
                      aria-label={"Delete " + r.name}
                      className="shrink-0 mt-1.5 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-900"
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {listError ? (
            <p role="alert" className="mx-2 mt-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
              {listError}
            </p>
          ) : null}

          {note ? (
            <p role="status" className="mx-2 mt-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700">
              {note}
            </p>
          ) : null}

          <form
            className="border-t border-gray-100 mt-2 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor={inputId} className="block px-2 text-xs font-semibold text-gray-700">
              Save the view on screen
            </label>
            <p className="px-2 pb-1 text-xs text-gray-500 break-words">
              {describeSaved({ id: 0, name: "", createdAt: "", updatedAt: "", reportType: "overview", filters: current }, propertyName)}
            </p>
            <div className="flex items-center gap-2 px-2 pb-1">
              <input
                id={inputId}
                type="text"
                value={name}
                maxLength={SAVED_REPORT_NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name this view"
                autoComplete="off"
                className="min-w-0 flex-1 h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="submit"
                disabled={saving}
                className="shrink-0 h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            {formError ? (
              <p role="alert" className="mx-2 mt-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
                {formError}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
