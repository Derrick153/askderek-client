"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  SAVED_REPORT_NAME_MAX,
  savedReportErrorMessage,
  useCreateSavedReportMutation,
} from "@/state/savedReportsApi";
import type { SavedRecordsFilters } from "@/state/savedReportsApi";

// ---------------------------------------------------------------------------
// Step 19 Phase 12 - "Save this list" inside the records panel.
// Saves which list this is (the number it sits behind, its status, the date range
// key and the property), so it can be reopened from the Saved menu with today's records.
// ---------------------------------------------------------------------------

export default function SaveListRow({
  preset,
  propertyId,
  request,
  defaultName,
}: {
  preset: string;
  propertyId: number | null;
  request: { metric: string; status?: string; ay?: number; semester?: string; title?: string };
  defaultName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const [createReport, { isLoading }] = useCreateSavedReportMutation();
  const alive = useRef(true);
  const inputId = useId();

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const begin = () => {
    setName(defaultName.slice(0, SAVED_REPORT_NAME_MAX));
    setError(null);
    setSavedAs(null);
    setOpen(true);
  };

  const submit = async () => {
    const trimmed = name.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      setError("Type a name first.");
      return;
    }
    const filters: SavedRecordsFilters = { preset: preset, propertyId: propertyId, metric: request.metric };
    if (request.status) filters.status = request.status;
    if (request.ay !== undefined) filters.ay = request.ay;
    if (request.semester) filters.semester = request.semester;
    if (request.title && request.title.length <= 80) filters.title = request.title;
    setError(null);
    try {
      await createReport({ name: trimmed, reportType: "records", filters: filters }).unwrap();
      if (alive.current) {
        setSavedAs(trimmed);
        setOpen(false);
      }
    } catch (e) {
      if (alive.current) setError(savedReportErrorMessage(e, "Could not save it. Please try again."));
    }
  };

  return (
    <div className="px-5 pt-1 pb-3">
      {savedAs ? (
        <p role="status" className="mb-2 text-xs text-gray-600">
          Saved as &quot;{savedAs}&quot;. Find it under Saved at the top of the Reports page.
        </p>
      ) : null}
      {!open ? (
        <button
          type="button"
          onClick={begin}
          className="h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {savedAs ? "Save under another name" : "Save this list"}
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor={inputId} className="block text-xs text-gray-500 mb-1">
            Name for this saved list
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={inputId}
              type="text"
              value={name}
              maxLength={SAVED_REPORT_NAME_MAX}
              autoFocus
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setOpen(false);
                }
              }}
              className="min-w-0 flex-1 basis-40 h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
          {error ? (
            <p role="alert" className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
