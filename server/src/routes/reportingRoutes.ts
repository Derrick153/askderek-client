import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getReportingOverview } from "../controllers/reportingControllers";

const router = Router();

// Managers see their own properties; admins see platform-wide.
// Fine-grained scope checks happen inside the controller (resolveReportScope).
router.get("/overview", authMiddleware(["MANAGER", "ADMIN"]), getReportingOverview);

export default router;