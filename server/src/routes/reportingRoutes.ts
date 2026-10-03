import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { getReportingOverview } from "../controllers/reportingControllers";

const router = Router();

router.get("/overview", requireAuth(), getReportingOverview);

export default router;
