import { getClerkToken } from "@/lib/clerkTokenProvider";

// Step 19 Phase 11 - downloading a report as a file (CSV, Excel or PDF).
// One place builds the request, sends the login token, waits for the file and hands it to the
// browser, so the Download menu and the records panel behave the same way and explain a failure
// in plain words. The server decides what is allowed and builds the numbers; this only asks.

export type ExportReport = "summary" | "trends" | "records";
export type ExportFileFormat = "csv" | "xlsx" | "pdf";
export type ExportGranularity = "day" | "week" | "month";

export interface ExportRequest {
  report: ExportReport;
  format: ExportFileFormat;
  from: string;
  to: string;
  propertyId?: number;
  managerClerkId?: string;
  // trends only
  granularity?: ExportGranularity;
  // records only (the same values the records panel uses)
  metric?: string;
  status?: string;
  ay?: number;
  semester?: string;
}

// A file can take a while on the free server, so wait longer than a normal page request.
const WAIT_LIMIT_MS = 120000;

function queryFor(request: ExportRequest): string {
  const params = new URLSearchParams();
  params.set("report", request.report);
  params.set("format", request.format);
  params.set("from", request.from);
  params.set("to", request.to);
  if (typeof request.propertyId === "number") {
    params.set("propertyId", String(request.propertyId));
  } else if (request.managerClerkId) {
    params.set("managerClerkId", request.managerClerkId);
  }
  if (request.report === "trends" && request.granularity) {
    params.set("granularity", request.granularity);
  }
  if (request.report === "records") {
    if (request.metric) params.set("metric", request.metric);
    if (request.status) params.set("status", request.status);
    if (typeof request.ay === "number") params.set("ay", String(request.ay));
    if (request.semester) params.set("semester", request.semester);
  }
  return params.toString();
}

function fileNameFrom(disposition: string | null): string | null {
  if (!disposition) return null;
  const match = /filename="([^"]+)"/i.exec(disposition) || /filename=([^;]+)/i.exec(disposition);
  if (!match) return null;
  const name = match[1].trim().replace(/[\\/:*?"<>|]/g, "-");
  return name !== "" ? name : null;
}

async function errorMessageFrom(response: Response): Promise<string> {
  if (response.status >= 500) {
    return "The server could not prepare the file. Please try again in a minute.";
  }
  try {
    const body = await response.json();
    if (body && typeof body.message === "string" && body.message.trim() !== "") return body.message;
  } catch {
    // not a JSON answer - fall through to the plain words below
  }
  if (response.status === 401 || response.status === 403) {
    return "You are not allowed to download this report.";
  }
  return "The file could not be prepared. Please try again.";
}

function saveBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 2000);
}

// Resolves with the file name once the browser has been handed the file.
// Rejects with an Error whose message is safe to show to the person.
export async function downloadReport(request: ExportRequest): Promise<string> {
  const token = await getClerkToken();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), WAIT_LIMIT_MS);
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/reports/export?${queryFor(request)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal }
    );
    if (!response.ok) throw new Error(await errorMessageFrom(response));
    const blob = await response.blob();
    const fileName =
      fileNameFrom(response.headers.get("Content-Disposition")) ||
      "askderek-" + request.report + "." + request.format;
    saveBlob(blob, fileName);
    return fileName;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The file took too long to prepare. Please try again in a moment.");
    }
    if (error instanceof TypeError) {
      throw new Error("Could not reach the server. Check your internet connection and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
