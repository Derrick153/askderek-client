import { Request, Response, NextFunction } from "express";
import { logReportEvent } from "./auditService";
import type { DateRange } from "./reportingService";

// =============================================================================
//  reportAudit.ts  (Step 19, Phase 13)
//
//  Writes the audit trail for reports, using logReportEvent from auditService.ts:
//    * auditReportView("overview" | "records") - a route step. After a request has been ANSWERED
//      with 200 it records REPORT_GENERATED. A refused or failed request is never recorded as
//      generated. The Reports page asks for its overview again on every refresh or date change, so
//      the same person looking at the same scope is recorded once per 15 minutes. A list behind a
//      number is recorded when its first page is opened (page 2 and later are not).
//    * auditReportExport(...) - called by the download handler once the file is built: records
//      REPORT_EXPORTED, then REPORT_DOWNLOADED when the whole file has been handed over.
//  Audit entries are written after the answer is on its way and can never change it: nothing here
//  throws, and nothing waits for the database.
// =============================================================================

const VIEW_QUIET_MS = 15 * 60 * 1000;
const MAX_REMEMBERED = 500;
const lastViewLogged = new Map<string, number>();

const callerOf = (req: Request): string | undefined => {
  const id = (req as any).auth?.userId;
  return typeof id === "string" && id ? id : undefined;
};

const ipOf = (req: Request): string | undefined => (typeof req.ip === "string" && req.ip ? req.ip : undefined);

const safeIso = (v: unknown): string | undefined => {
  if (typeof v !== "string" || v === "") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const shortText = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : undefined;

export function scopeLabelForAudit(scope: { propertyId?: number | null; managerClerkId?: string | null }): string {
  if (scope.propertyId !== undefined && scope.propertyId !== null) return "property:" + scope.propertyId;
  if (scope.managerClerkId) return "manager:" + scope.managerClerkId;
  return "platform";
}

// The scope as asked for in the query. A request that was answered with 200 had a valid scope.
function scopeFromQuery(req: Request): string {
  const propertyId = Number(req.query.propertyId);
  if (req.query.propertyId !== undefined && Number.isInteger(propertyId)) return scopeLabelForAudit({ propertyId });
  return scopeLabelForAudit({ managerClerkId: shortText(req.query.managerClerkId, 100) });
}

function forgetOldViews(now: number): void {
  lastViewLogged.forEach((at, key) => {
    if (now - at >= VIEW_QUIET_MS) lastViewLogged.delete(key);
  });
  if (lastViewLogged.size >= MAX_REMEMBERED) lastViewLogged.clear();
}

export const auditReportView =
  (kind: "overview" | "records") =>
  (req: Request, res: Response, next: NextFunction): void => {
    res.on("finish", () => {
      try {
        if (res.statusCode !== 200) return;
        const actor = callerOf(req);
        if (!actor) return;
        const scope = scopeFromQuery(req);
        const details: Record<string, unknown> = {
          report: kind,
          scope: scope,
          from: safeIso(req.query.from),
          to: safeIso(req.query.to),
          ip: ipOf(req),
        };
        let target = "report:overview";
        if (kind === "overview") {
          const now = Date.now();
          const key = actor + "|" + scope;
          const last = lastViewLogged.get(key);
          if (last !== undefined && now - last < VIEW_QUIET_MS) return;
          if (lastViewLogged.size >= MAX_REMEMBERED) forgetOldViews(now);
          lastViewLogged.set(key, now);
        } else {
          if (String(req.query.page ?? "1") !== "1") return;
          const metric = shortText(req.query.metric, 60);
          target = "report:records" + (metric ? ":" + metric : "");
          details.metric = metric;
          details.status = shortText(req.query.status, 40);
          details.ay = shortText(req.query.ay, 8);
          details.semester = shortText(req.query.semester, 100);
        }
        void logReportEvent({ action: "REPORT_GENERATED", actorClerkId: actor, target: target, details: details });
      } catch (error) {
        console.error("[AUDIT] Report view entry could not be prepared:", error);
      }
    });
    next();
  };

export interface ReportExportAudit {
  report: string;
  format: string;
  granularity?: string;
  metric?: string;
  status?: string;
  scope: { propertyId?: number | null; managerClerkId?: string | null };
  range: DateRange;
  fileName: string;
  bytes: number;
}

// Call this after the file is built and before it is sent. REPORT_EXPORTED is recorded now;
// REPORT_DOWNLOADED is recorded when the response has been handed over completely.
export function auditReportExport(req: Request, res: Response, info: ReportExportAudit): void {
  try {
    const actor = callerOf(req);
    if (!actor) return;
    const target = "report:" + info.report + (info.metric ? ":" + info.metric : "");
    const details: Record<string, unknown> = {
      report: info.report,
      format: info.format,
      granularity: info.granularity,
      metric: info.metric,
      status: info.status,
      scope: scopeLabelForAudit(info.scope),
      from: info.range.from.toISOString(),
      to: info.range.to.toISOString(),
      fileName: info.fileName,
      bytes: info.bytes,
      ip: ipOf(req),
    };
    void logReportEvent({ action: "REPORT_EXPORTED", actorClerkId: actor, target: target, details: details });
    res.on("finish", () => {
      try {
        if (res.statusCode === 200) {
          void logReportEvent({ action: "REPORT_DOWNLOADED", actorClerkId: actor, target: target, details: details });
        }
      } catch (error) {
        console.error("[AUDIT] Report download entry could not be prepared:", error);
      }
    });
  } catch (error) {
    console.error("[AUDIT] Report export entry could not be prepared:", error);
  }
}
