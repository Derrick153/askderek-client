import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  ReportScope,
  DateRange,
  getOccupancyMetrics,
  getRevenueMetrics,
  getCollectionRate,
  getBookingMetrics,
  getCancellationRates,
  getApprovalRates,
  getRoomUtilization,
} from "../lib/reportingService";
import { getTrends, trendBucketKeys } from "../lib/reportingService";
import type { TrendGranularity } from "../lib/reportingService";

// -----------------------------------------------------------------------------
//  reportingControllers.ts
//
//  Step 19 - Reporting & Analytics.
//
//  Identity always comes from the verified req.auth.userId (set by Clerk's
//  requireAuth() middleware at the route level) - never from a client-
//  supplied propertyId/managerClerkId alone. resolveReportScope() is the ONE
//  shared authorization check every reporting endpoint uses, so this scoping
//  logic exists in exactly one place rather than being copy-pasted per
//  endpoint (the pattern the rest of this codebase historically used).
//
//  A caller may request:
//    - ?propertyId=<id>        - only if they manage that property, or admin
//    - ?managerClerkId=<id>    - only if it is their own id, or admin
//    - neither (platform-wide) - admin only
// -----------------------------------------------------------------------------

type ScopeOk = { ok: true; scope: ReportScope };
type ScopeError = { ok: false; status: number; message: string };
type ScopeResult = ScopeOk | ScopeError;

function isScopeError(result: ScopeResult): result is ScopeError {
  return result.ok === false;
}

async function resolveReportScope(req: Request): Promise<ScopeResult> {
  const callerClerkId = req.auth?.userId;
  if (!callerClerkId) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const caller = await prisma.user.findUnique({
    where: { clerkId: callerClerkId },
    select: { role: true },
  });
  const isAdmin = caller?.role === "ADMIN";

  const propertyIdRaw = req.query.propertyId;
  const managerClerkIdRaw = req.query.managerClerkId;

  if (propertyIdRaw !== undefined) {
    const propertyId = Number(propertyIdRaw);
    if (!Number.isInteger(propertyId)) {
      return { ok: false, status: 400, message: "Invalid propertyId" };
    }
    if (isAdmin) {
      return { ok: true, scope: { propertyId } };
    }
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { managerClerkId: true },
    });
    if (!property) {
      return { ok: false, status: 404, message: "Property not found" };
    }
    if (property.managerClerkId !== callerClerkId) {
      return { ok: false, status: 403, message: "Forbidden" };
    }
    return { ok: true, scope: { propertyId } };
  }

  if (managerClerkIdRaw !== undefined) {
    const managerClerkId = String(managerClerkIdRaw);
    if (!isAdmin && managerClerkId !== callerClerkId) {
      return { ok: false, status: 403, message: "Forbidden" };
    }
    return { ok: true, scope: { managerClerkId } };
  }

  // Platform-wide - admin only.
  if (!isAdmin) {
    return { ok: false, status: 403, message: "Forbidden - admin access required for platform-wide reporting" };
  }
  return { ok: true, scope: {} };
}

function resolveDateRange(req: Request): DateRange | null {
  const { from, to } = req.query;
  const toDate = to ? new Date(String(to)) : new Date();
  const fromDate = from ? new Date(String(from)) : new Date(toDate.getTime() - 30 * 86_400_000);

  if (Number.isNaN(toDate.getTime()) || Number.isNaN(fromDate.getTime())) {
    return null;
  }
  return { from: fromDate, to: toDate };
}

// -- GET /api/reports/overview -------------------------------------------
export const getReportingOverview = async (req: Request, res: Response): Promise<void> => {
  const scopeResult = await resolveReportScope(req);
  if (isScopeError(scopeResult)) {
    res.status(scopeResult.status).json({ success: false, message: scopeResult.message });
    return;
  }

  const range = resolveDateRange(req);
  if (!range) {
    res.status(400).json({ success: false, message: "Invalid date range" });
    return;
  }

  const { scope } = scopeResult;

  try {
    const [occupancy, revenue, collectionRate, bookings, cancellation, approval, roomUtilization] =
      await runSequentially([
        () => getOccupancyMetrics(scope),
        () => getRevenueMetrics(scope, range),
        () => getCollectionRate(scope, range),
        () => getBookingMetrics(scope, range),
        () => getCancellationRates(scope, range),
        () => getApprovalRates(scope, range),
        () => getRoomUtilization(scope),
      ]);

    res.status(200).json({
      success: true,
      message: "Reporting overview generated",
      data: {
        scope,
        range: { from: range.from.toISOString(), to: range.to.toISOString() },
        occupancy,
        revenue,
        collectionRate,
        bookings,
        cancellation,
        approval,
        roomUtilization,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Reporting overview error:", error);
    res.status(500).json({ success: false, message: `Error generating report: ${error.message}` });
  }
};

// Runs the report queries ONE AFTER ANOTHER instead of all at once. The free database
// plan allows only a few connections, and firing ~25 queries together can starve
// booking and payment requests. Slower by a little, much safer.
async function runSequentially(tasks: any[]) {
  const out: any[] = [];
  for (const task of tasks) {
    out.push(await task());
  }
  return out;
}

// -- GET /api/reports/trends ----------------------------------------------
// Same permission rules as /overview (resolveReportScope), plus:
//   granularity = day | week | month   (default day)
//   from / to                          (default: last 30 days)
export const getReportingTrends = async (req: Request, res: Response): Promise<void> => {
  const scopeResult = await resolveReportScope(req);
  if (isScopeError(scopeResult)) {
    res.status(scopeResult.status).json({ success: false, message: scopeResult.message });
    return;
  }

  const range = resolveDateRange(req);
  if (!range) {
    res.status(400).json({ success: false, message: "Invalid date range" });
    return;
  }

  const rawGranularity = String(req.query.granularity ?? "day");
  if (rawGranularity !== "day" && rawGranularity !== "week" && rawGranularity !== "month") {
    res.status(400).json({ success: false, message: "granularity must be day, week or month" });
    return;
  }
  const granularity: TrendGranularity = rawGranularity;

  if (trendBucketKeys(range, granularity).length > 400) {
    res.status(400).json({
      success: false,
      message: "That range has too many data points for this view. Choose week or month, or a shorter range.",
    });
    return;
  }

  const { scope } = scopeResult;

  try {
    const data = await getTrends(scope, range, granularity);
    res.status(200).json({
      success: true,
      message: "Reporting trends generated",
      data: {
        scope,
        range: { from: range.from.toISOString(), to: range.to.toISOString() },
        ...data,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Reporting trends error:", error);
    res.status(500).json({ success: false, message: "Error generating trends" });
  }
};
