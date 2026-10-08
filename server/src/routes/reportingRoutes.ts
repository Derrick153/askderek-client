import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getReportingOverview,
  getReportingTrends,
  getReportingHostel,
  getReportingRecords,
  getReportingAttention,
  getReportingAnomalies,
  exportReport,
} from "../controllers/reportingControllers";

import { listSavedReports, createSavedReport, deleteSavedReport } from "../controllers/savedReportControllers";
import { auditReportView, auditReportDenied } from "../lib/reportAudit";
import { guarded, noStore, reportIpLimit, reportReadLimit, reportExportLimit, reportSavedLimit } from "../lib/reportGuards";
const router = Router();

// Every report route: private (never cached), a generous limit per network address first, then the
// login check, a limit per person, a record of refused attempts, and a safety net around each handler
// so that a database error becomes a clean 500 answer instead of a request that never finishes.
router.use(noStore, reportIpLimit);
const reportAuth = guarded("auth", authMiddleware(["MANAGER", "ADMIN"]));
const readerSteps = [reportAuth, reportReadLimit, auditReportDenied];
const exportSteps = [reportAuth, reportExportLimit, auditReportDenied];
const savedSteps = [reportAuth, reportSavedLimit];

// Managers see their own properties; admins see platform-wide.
router.get("/overview", ...readerSteps, auditReportView("overview"), guarded("overview", getReportingOverview));
router.get("/trends", ...readerSteps, guarded("trends", getReportingTrends));
router.get("/hostel", ...readerSteps, guarded("hostel", getReportingHostel));
router.get("/records", ...readerSteps, auditReportView("records"), guarded("records", getReportingRecords));
router.get("/attention", ...readerSteps, guarded("attention", getReportingAttention));
router.get("/anomalies", ...readerSteps, guarded("anomalies", getReportingAnomalies));
router.get("/export", ...exportSteps, guarded("export", exportReport));
router.get("/saved", ...savedSteps, guarded("saved-list", listSavedReports));
router.post("/saved", ...savedSteps, guarded("saved-create", createSavedReport));
router.delete("/saved/:id", ...savedSteps, guarded("saved-delete", deleteSavedReport));

export default router;
