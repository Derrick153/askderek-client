import { z } from "zod";
import { recordsQueryProblem } from "./reportingService";

// =============================================================================
//  Saved reports (Step 19, Phase 12) - checking what a person asks to save.
//
//  A saved report is a saved VIEW of the Reports page, so it can be reopened later:
//    overview : the page itself  (date range, property, chart granularity)
//    records  : one list behind a number (the same values the records panel uses)
//  Only the choices are saved (for example "last 30 days"), never dates or numbers, so reopening
//  a saved report always shows today's figures. Nothing here reads report data.
//  Everything is checked before it is stored: unknown keys are refused, so a saved report can
//  never carry anything except the choices listed below.
// =============================================================================

export const SAVED_REPORT_LIMIT = 20;
export const SAVED_REPORT_NAME_MAX = 60;

export interface OverviewFilters {
  preset: string;
  propertyId: number | null;
  granularity: "day" | "week" | "month" | null;
}

export interface RecordsFilters {
  preset: string;
  propertyId: number | null;
  metric: string;
  status?: string;
  ay?: number;
  semester?: string;
  title?: string;
}

export type ParsedSave =
  | { ok: true; name: string; reportType: "overview"; filters: OverviewFilters }
  | { ok: true; name: string; reportType: "records"; filters: RecordsFilters }
  | { ok: false; message: string };

// The preset is only a short key such as 30d; the page decides which keys exist.
const presetSchema = z.string().regex(/^[a-z0-9_]{1,16}$/);
const propertyIdSchema = z.number().int().positive().nullable();

const overviewSchema = z
  .object({
    preset: presetSchema,
    propertyId: propertyIdSchema,
    granularity: z.enum(["day", "week", "month"]).nullable(),
  })
  .strict();

const recordsSchema = z
  .object({
    preset: presetSchema,
    propertyId: propertyIdSchema,
    metric: z.string().min(1).max(60),
    status: z.string().min(1).max(40).optional(),
    ay: z.number().int().min(2000).max(2200).optional(),
    semester: z.string().min(1).max(60).optional(),
    title: z.string().min(1).max(80).optional(),
  })
  .strict();

const bodySchema = z
  .object({
    name: z.string(),
    reportType: z.enum(["overview", "records"]),
    filters: z.unknown(),
  })
  .strict();

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function parseSaveRequest(body: unknown): ParsedSave {
  const shape = bodySchema.safeParse(body);
  if (!shape.success) {
    const field = String(shape.error.issues[0]?.path?.[0] ?? "");
    if (field === "reportType") return { ok: false, message: "reportType must be overview or records" };
    return { ok: false, message: "Send a name, a reportType and the filters to save." };
  }

  const name = shape.data.name.replace(/\s+/g, " ").trim();
  if (name.length < 1 || name.length > SAVED_REPORT_NAME_MAX || CONTROL_CHARS.test(name)) {
    return { ok: false, message: "Give the saved report a name of 1 to " + SAVED_REPORT_NAME_MAX + " characters." };
  }

  if (shape.data.reportType === "overview") {
    const f = overviewSchema.safeParse(shape.data.filters);
    if (!f.success) return { ok: false, message: "That view cannot be saved (its filters are not valid)." };
    return { ok: true, name, reportType: "overview", filters: f.data as OverviewFilters };
  }

  const f = recordsSchema.safeParse(shape.data.filters);
  if (!f.success) return { ok: false, message: "That list cannot be saved (its filters are not valid)." };
  const problem = recordsQueryProblem({
    metric: f.data.metric,
    status: f.data.status,
    ay: f.data.ay,
    semester: f.data.semester,
    page: 1,
    pageSize: 50,
  });
  if (problem) return { ok: false, message: problem };
  return { ok: true, name, reportType: "records", filters: f.data as RecordsFilters };
}
