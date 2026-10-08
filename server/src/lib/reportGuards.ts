import { Request, Response, NextFunction, RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// =============================================================================
//  reportGuards.ts  (Step 19, Phase 14)
//
//  The shared safety steps for every /api/reports route:
//    * noStore            - report answers are private, so no browser or proxy may keep a copy
//    * reportIpLimit      - a generous limit per network address, checked before anything else
//    * reportReadLimit    - per logged-in person, for the report pages (the page asks 6 or 7 times
//                           per load, so the limit is far above what a person can do by hand)
//    * reportExportLimit  - per logged-in person, for file downloads (they are the heaviest)
//    * reportSavedLimit   - per logged-in person, for saved reports
//    * guarded(...)       - wraps a step so that an error (for example the database dropping the
//                           connection) becomes a clean 500 answer. Express 4 does not catch errors
//                           from async handlers, so without this the request would hang and the
//                           error could take the server down.
//  The limiters count in this server's memory (one server, as on Render today).
// =============================================================================

export const REPORT_LIMITS = {
  ipWindowMs: 5 * 60 * 1000,
  ipMax: 600,
  readWindowMs: 60 * 1000,
  readMax: 120,
  exportWindowMs: 5 * 60 * 1000,
  exportMax: 10,
  savedWindowMs: 60 * 1000,
  savedMax: 30,
};

function named<T extends object>(fn: T, name: string): T {
  Object.defineProperty(fn, "name", { value: name, configurable: true });
  return fn;
}

const ipKey = (req: Request): string => "ip:" + ipKeyGenerator(typeof req.ip === "string" && req.ip ? req.ip : "unknown");

// Logged-in people are counted by their own id (not their address), so one person can never use up
// someone else's allowance. A request without a login falls back to its address.
const personKey = (req: Request): string => {
  const id = (req as any).auth?.userId;
  return typeof id === "string" && id ? "user:" + id : ipKey(req);
};

function makeLimiter(name: string, windowMs: number, limit: number, message: string, keyGenerator: (req: Request) => string) {
  return named(
    rateLimit({
      windowMs: windowMs,
      limit: limit,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: message },
      keyGenerator: keyGenerator,
    }),
    name
  );
}

export const reportIpLimit = makeLimiter(
  "reportIpLimit",
  REPORT_LIMITS.ipWindowMs,
  REPORT_LIMITS.ipMax,
  "Too many report requests from this network. Please wait a few minutes and try again.",
  ipKey
);
export const reportReadLimit = makeLimiter(
  "reportReadLimit",
  REPORT_LIMITS.readWindowMs,
  REPORT_LIMITS.readMax,
  "Too many report requests. Please wait a minute and try again.",
  personKey
);
export const reportExportLimit = makeLimiter(
  "reportExportLimit",
  REPORT_LIMITS.exportWindowMs,
  REPORT_LIMITS.exportMax,
  "You have downloaded several report files in a short time. Please wait a few minutes and try again.",
  personKey
);
export const reportSavedLimit = makeLimiter(
  "reportSavedLimit",
  REPORT_LIMITS.savedWindowMs,
  REPORT_LIMITS.savedMax,
  "Too many requests for saved reports. Please wait a minute and try again.",
  personKey
);

export const noStore: RequestHandler = named((_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader("Cache-Control", "no-store");
  next();
}, "noStore");

export const guarded = (label: string, step: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  named(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await step(req, res, next);
    } catch (error) {
      console.error("Report route error (" + label + "):", error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Something went wrong on the server. Please try again." });
      }
    }
  }, "guarded:" + label);
