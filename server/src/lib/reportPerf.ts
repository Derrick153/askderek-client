import { Request, Response, NextFunction, RequestHandler } from "express";

// =============================================================================
//  reportPerf.ts  (Step 19, Phase 15)
//
//  Two small helpers for the /api/reports routes:
//
//    cachedReport(label, handler)
//        Keeps the answer of a report page for REPORT_PERF.cacheTtlMs (one minute) and hands the
//        same answer to the same person asking the same question again - opening the page twice,
//        reloading it, or two screens at once do not repeat the same 40 to 100 database round trips.
//        What makes it safe:
//          * It runs AFTER the login check, the rate limits and the audit entry, so a refused person
//            never reaches it, and every view is still counted and recorded.
//          * The key is the report + the logged-in person + the exact question (propertyId,
//            managerClerkId, dates ...). Two people never share an entry.
//          * Only complete, successful (200) answers are kept. An error, a refusal, or an answer in
//            which some checks could not be finished is never kept.
//          * "?refresh=1" (the Refresh button) skips the saved answer, works out a new one and
//            keeps that instead.
//          * The answer keeps its own generatedAt time, so the page shows its true age.
//        Used for overview, trends, hostel, attention and anomalies. Not for the record lists (they
//        must agree with the numbers they explain) and not for file downloads.
//
//    reportTiming
//        Adds a Server-Timing header to every report answer (visible in the browser's Network tab)
//        and writes one line to the server log for any report that takes REPORT_PERF.slowMs or longer.
//
//  The saved answers live in this server's memory (one server, as on Render today) and are gone
//  when it restarts or sleeps.
// =============================================================================

export const REPORT_PERF = {
  cacheTtlMs: 60 * 1000,
  cacheMaxEntries: 200,
  cacheMaxChars: 400 * 1000,
  slowMs: 3000,
};

type CacheEntry = { text: string; storedAt: number; expiresAt: number };
const saved = new Map<string, CacheEntry>();

export function clearReportCache(): void {
  saved.clear();
}

export function reportCacheSize(): number {
  return saved.size;
}

function cacheKey(req: Request, label: string): string | null {
  const userId = (req as any).auth?.userId;
  if (typeof userId !== "string" || !userId) return null;
  const query: any = req.query || {};
  const pairs: string[] = [];
  const names = Object.keys(query).sort();
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (name === "refresh") continue;
    const value = query[name];
    // A repeated or nested parameter is an unusual question - never keep an answer for it.
    if (typeof value !== "string") return null;
    pairs.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
  }
  return label + "|" + userId + "|" + pairs.join("&");
}

// An answer is kept only if nothing in it says "could not be checked".
function isComplete(body: any): boolean {
  if (!body || body.success !== true) return false;
  const data = body.data;
  if (data && Array.isArray(data.failed) && data.failed.length > 0) return false;
  if (data && data.summary && typeof data.summary.failed === "number" && data.summary.failed > 0) return false;
  return true;
}

function remember(key: string, text: string, now: number): void {
  saved.forEach((entry, k) => {
    if (entry.expiresAt <= now) saved.delete(k);
  });
  saved.delete(key);
  saved.set(key, { text: text, storedAt: now, expiresAt: now + REPORT_PERF.cacheTtlMs });
  let extra = saved.size - REPORT_PERF.cacheMaxEntries;
  if (extra > 0) {
    saved.forEach((_entry, k) => {
      if (extra > 0) {
        saved.delete(k);
        extra--;
      }
    });
  }
}

export function cachedReport(
  label: string,
  step: (req: Request, res: Response, next: NextFunction) => unknown
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = cacheKey(req, label);
    if (!key) {
      await step(req, res, next);
      return;
    }

    const wantsFresh = typeof req.query.refresh === "string" && req.query.refresh !== "";
    const now = Date.now();
    if (!wantsFresh) {
      const hit = saved.get(key);
      if (hit && hit.expiresAt > now) {
        res.setHeader("X-Report-Cache", "hit");
        res.setHeader("X-Report-Cache-Age", String(Math.max(0, Math.round((now - hit.storedAt) / 1000))));
        res.status(200).type("application/json").send(hit.text);
        return;
      }
      if (hit) saved.delete(key);
    }

    const sendJson = res.json.bind(res);
    (res as any).json = (body?: any) => {
      try {
        if (res.statusCode === 200) {
          res.setHeader("X-Report-Cache", wantsFresh ? "refresh" : "miss");
          if (isComplete(body)) {
            const text = JSON.stringify(body);
            if (typeof text === "string" && text.length <= REPORT_PERF.cacheMaxChars) remember(key, text, Date.now());
          }
        }
      } catch (error) {
        console.error("Report cache could not keep an answer (" + label + "):", error);
      }
      return sendJson(body);
    };
    await step(req, res, next);
  };
}

export const reportTiming: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const started = Date.now();
  const originalWriteHead: any = res.writeHead;
  (res as any).writeHead = function (this: any, ...args: any[]) {
    if (!res.headersSent) {
      try {
        const cache = res.getHeader("X-Report-Cache");
        res.setHeader(
          "Server-Timing",
          "total;dur=" + (Date.now() - started) + (cache ? ', cache;desc="' + String(cache) + '"' : "")
        );
      } catch (_error) {
        // the headers were already gone - nothing to add
      }
    }
    return originalWriteHead.apply(this, args);
  };
  res.on("finish", () => {
    const took = Date.now() - started;
    if (took >= REPORT_PERF.slowMs) {
      console.warn(
        "[REPORTS] slow request: " +
          req.method +
          " " +
          req.baseUrl +
          req.path +
          " took " +
          took +
          " ms (status " +
          res.statusCode +
          ", cache " +
          (res.getHeader("X-Report-Cache") || "none") +
          ")"
      );
    }
  });
  next();
};
