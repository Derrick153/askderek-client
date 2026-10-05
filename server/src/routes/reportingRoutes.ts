import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getReportingOverview,
  getReportingTrends,
  getReportingHostel,
} from "../controllers/reportingControllers";

const router = Router();

// Managers see their own properties; admins see platform-wide.
router.get("/overview", authMiddleware(["MANAGER", "ADMIN"]), getReportingOverview);
router.get("/trends", authMiddleware(["MANAGER", "ADMIN"]), getReportingTrends);
router.get("/hostel", authMiddleware(["MANAGER", "ADMIN"]), getReportingHostel);

export default router;