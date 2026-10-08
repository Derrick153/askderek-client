"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useGetReportingRecordsQuery } from "@/state/api";
import type { ReportingRecordRow } from "@/state/api";
import { downloadReport } from "@/lib/downloadReport";
import type { ExportFileFormat } from "@/lib/downloadReport";
import SaveListRow from "@/components/reports/SaveListRow";
import { formatDate, formatMoney, prettyStatus } from "@/components/reports/reportHelpers";

// ---------------------------------------------------------------------------
// Step 19 Phase 7 - the records behind a number.
// Opens over the Reports page (a bottom sheet on phones, a dialog on larger
// screens) and lists the records that add up to the figure the manager tapped,
// 10 at a time. The server builds every list with the same filters as the
// headline number, so the total shown here always matches that number.
// The parent mounts this only while a number is open, and gives it a key so
// that a different number always starts again on page 1.
// ---------------------------------------------------------------------------

export interface RecordsRequest {
  metric: string;
  status?: string;
  ay?: number;
  semester?: string;
  title?: string;
}

export interface RecordsScope {
  propertyId?: number;
  managerClerkId?: string;
}

const PAGE_SIZE = 10;

// The page where the manager can manage these records. No link when no single page fits.
function fullPageFor(metric: string): { href: string; label: string } | null {
  if (metric === "received" || metric === "received_hostel" || metric === "received_rent" || metric === "outstanding_ledger") {
    return { href: "/managers/payments", label: "Open Payments" };
  }
  if (metric === "beds") return { href: "/managers/hostel/occupancy", label: "Open Hostel occupancy" };
  if (metric === "bookings_short_stay") return { href: "/managers/bookings", label: "Open Bookings" };
  if (metric === "approvals_application_approved" || metric === "approvals_application_denied") {
    return { href: "/managers/applications", label: "Open Applications" };
  }
  if (
    metric === "outstanding_hostel" ||
    metric === "bookings_hostel" ||
    metric === "approvals_hostel_approved" ||
    metric === "approvals_hostel_rejected" ||
    metric === "hostel_semester"
  ) {
    return { href: "/managers/hostel", label: "Open Hostel" };
  }
  return null;
}

// One short line saying which dates the list covers (some lists ignore the date range).
function periodNote(metric: string, range: { from: string; to: string }): string {
  if (metric === "beds") return "Beds as they are right now";
  if (metric === "hostel_semester") return "Every booking in this semester, whatever the date range";
  if (metric === "outstanding_ledger") return "Due on or before " + formatDate(range.to);
  if (metric === "outstanding_hostel") return "Booked on or before " + formatDate(range.to);
  return formatDate(range.from) + " to " + formatDate(range.to);
}

function RecordRow({ row }: { row: ReportingRecordRow }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{row.title}</p>
        {row.subtitle ? <p className="text-xs text-gray-500 mt-0.5 break-words">{row.subtitle}</p> : null}
        <p className="text-xs text-gray-400 mt-0.5 break-words">
          {row.property}
          {row.date ? " \u00B7 " + formatDate(row.date) : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {row.amount !== null ? <p className="text-sm font-semibold text-gray-900">{formatMoney(row.amount)}</p> : null}
        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700">{prettyStatus(row.status)}</span>
      </div>
    </li>
  );
}

export default function RecordsPanel({
  request,
  scope,
  range,
  onClose,
  preset,
}: {
  request: RecordsRequest;
  scope: RecordsScope;
  range: { from: string; to: string };
  onClose: () => void;
  preset?: string;
}) {
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState<ExportFileFormat | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const { data, isFetching, isError, refetch } = useGetReportingRecordsQuery({
    metric: request.metric,
    status: request.status,
    ay: request.ay,
    semester: request.semester,
    propertyId: scope.propertyId,
    managerClerkId: scope.managerClerkId,
    from: range.from,
    to: range.to,
    page: page,
    pageSize: PAGE_SIZE,
  });

  // Esc closes, the page behind stops scrolling while this is open, and focus starts on the close button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const title = request.title ?? data?.title ?? "Records";
  const summaryValue = data ? (data.summary.money ? formatMoney(data.summary.value) : String(data.summary.value)) : "";
  const full = fullPageFor(request.metric);

  // Downloads the whole list behind this number (not only the page on screen) as a file.
  const startDownload = async (format: ExportFileFormat) => {
    if (downloading) return;
    setDownloading(format);
    setDownloadError(null);
    try {
      await downloadReport({
        report: "records",
        format: format,
        from: range.from,
        to: range.to,
        propertyId: scope.propertyId,
        managerClerkId: scope.managerClerkId,
        metric: request.metric,
        status: request.status,
        ay: request.ay,
        semester: request.semester,
      });
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "The file could not be prepared. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  let body: ReactNode;
  if (!data && isError) {
    body = (
      <div className="py-10 text-center">
        <p className="text-sm text-gray-600">These records could not be loaded.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 h-9 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Try again
        </button>
      </div>
    );
  } else if (!data) {
    body = <p className="py-10 text-center text-sm text-gray-500">Loading...</p>;
  } else if (data.rows.length === 0) {
    body = <p className="py-10 text-center text-sm text-gray-500">Nothing to show here.</p>;
  } else {
    body = (
      <ul className="divide-y divide-gray-100">
        {data.rows.map((row) => (
          <RecordRow key={row.kind + "-" + row.id} row={row} />
        ))}
      </ul>
    );
  }

  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.total, data.page * data.pageSize) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/40 cursor-default" />
      <div className="relative bg-white w-full sm:max-w-2xl max-h-[88vh] sm:max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 break-words">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{periodNote(request.metric, range)}</p>
            {data ? (
              <p className="text-sm mt-1">
                <span className="text-gray-500">{data.summary.label}: </span>
                <span className="font-semibold text-gray-900">{summaryValue}</span>
              </p>
            ) : null}
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={"flex-1 overflow-y-auto px-5 " + (isFetching ? "opacity-60" : "")}>{body}</div>

        {data && data.total > 0 ? (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {first}-{last} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next page"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pageCount || isFetching}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}

        {data && data.total > 0 ? (
          <div className="px-5 pt-1 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Download this list</span>
              <button
                type="button"
                onClick={() => startDownload("xlsx")}
                disabled={downloading !== null}
                className="h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {downloading === "xlsx" ? "Preparing..." : "Excel"}
              </button>
              <button
                type="button"
                onClick={() => startDownload("csv")}
                disabled={downloading !== null}
                className="h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {downloading === "csv" ? "Preparing..." : "CSV"}
              </button>
            </div>
            {data.total > 2000 ? (
              <p className="mt-1 text-xs text-gray-500">A file holds at most 2,000 records. This list has {data.total}.</p>
            ) : null}
            {downloadError ? (
              <p role="alert" className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
                {downloadError}
              </p>
            ) : null}
          </div>
        ) : null}

        {preset ? (
          <SaveListRow
            preset={preset}
            propertyId={scope.propertyId ?? null}
            request={request}
            defaultName={title}
          />
        ) : null}

        {full ? (
          <div className="px-5 pb-4 pt-1">
            <Link href={full.href} className="text-sm font-medium text-blue-600 hover:underline">
              {full.label}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// A small blue text button used for the "See ..." links on the Reports page.
export function RecordsLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-medium text-blue-600 hover:text-blue-700">
      {children}
    </button>
  );
}
