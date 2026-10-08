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
const router = Router();

// Managers see their own properties; admins see platform-wide.
router.get("/overview", authMiddleware(["MANAGER", "ADMIN"]), getReportingOverview);
router.get("/trends", authMiddleware(["MANAGER", "ADMIN"]), getReportingTrends);
router.get("/hostel", authMiddleware(["MANAGER", "ADMIN"]), getReportingHostel);
router.get("/records", authMiddleware(["MANAGER", "ADMIN"]), getReportingRecords);
router.get("/attention", authMiddleware(["MANAGER", "ADMIN"]), getReportingAttention);
router.get("/anomalies", authMiddleware(["MANAGER", "ADMIN"]), getReportingAnomalies);
router.get("/export", authMiddleware(["MANAGER", "ADMIN"]), exportReport);
router.get("/saved", authMiddleware(["MANAGER", "ADMIN"]), listSavedReports);
router.post("/saved", authMiddleware(["MANAGER", "ADMIN"]), createSavedReport);
router.delete("/saved/:id", authMiddleware(["MANAGER", "ADMIN"]), deleteSavedReport);

export default router;
