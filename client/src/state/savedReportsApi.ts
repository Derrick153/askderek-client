import { api } from "@/state/api";

// ---------------------------------------------------------------------------
// Step 19 Phase 12 - saved reports (saved views of the Reports page).
// Added next to the main api object (it does not change state/api.ts). A saved report
// keeps only the choices (date range key, property, chart step, or which list), never
// dates or numbers, so opening it later always shows today's figures.
// ---------------------------------------------------------------------------

export interface SavedOverviewFilters {
  preset: string;
  propertyId: number | null;
  granularity: "day" | "week" | "month" | null;
}

export interface SavedRecordsFilters {
  preset: string;
  propertyId: number | null;
  metric: string;
  status?: string;
  ay?: number;
  semester?: string;
  title?: string;
}

interface SavedReportBase {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type SavedReport =
  | (SavedReportBase & { reportType: "overview"; filters: SavedOverviewFilters })
  | (SavedReportBase & { reportType: "records"; filters: SavedRecordsFilters });

export type SaveReportInput =
  | { name: string; reportType: "overview"; filters: SavedOverviewFilters }
  | { name: string; reportType: "records"; filters: SavedRecordsFilters };

export const SAVED_REPORT_NAME_MAX = 60;

const savedReportsApi = api.enhanceEndpoints({ addTagTypes: ["SavedReports"] }).injectEndpoints({
  endpoints: (build) => ({
    getSavedReports: build.query<SavedReport[], void>({
      query: () => "reports/saved",
      transformResponse: (response: { data?: SavedReport[] }) => (Array.isArray(response.data) ? response.data : []),
      providesTags: ["SavedReports"],
    }),
    createSavedReport: build.mutation<SavedReport, SaveReportInput>({
      query: (body) => ({ url: "reports/saved", method: "POST", body: body }),
      transformResponse: (response: { data: SavedReport }) => response.data,
      invalidatesTags: ["SavedReports"],
    }),
    deleteSavedReport: build.mutation<void, number>({
      query: (id) => ({ url: "reports/saved/" + id, method: "DELETE" }),
      invalidatesTags: ["SavedReports"],
    }),
  }),
});

export const { useGetSavedReportsQuery, useCreateSavedReportMutation, useDeleteSavedReportMutation } = savedReportsApi;

// Turns an RTK Query error into a plain sentence. The server's own words are used for
// 4xx answers (for example "You already have a saved report with that name.").
export function savedReportErrorMessage(error: unknown, fallback: string): string {
  const e = error as { status?: unknown; data?: unknown } | null | undefined;
  if (!e) return fallback;
  if (e.status === "FETCH_ERROR") return "Could not reach the server. Check your connection and try again.";
  if (e.status === 401 || e.status === 403) return "You are not allowed to do that.";
  if (e.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (typeof e.status === "number" && e.status >= 400 && e.status < 500) {
    const data = e.data as { message?: unknown } | null | undefined;
    if (data && typeof data.message === "string" && data.message.length > 0 && data.message.length <= 200) return data.message;
  }
  return fallback;
}
