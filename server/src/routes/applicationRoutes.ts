// applicationRoutes.ts

import { Router }      from "express";
import { requireAuth } from "@clerk/express";
import {
  listApplications,
  createApplication,
  updateApplicationStatus,
} from "../controllers/applicationControllers";

const router = Router();

// List applications — returns only the caller's own applications
// (as tenant) or applications for the caller's own properties (as manager)
router.get("/", requireAuth(), listApplications);

// Create new application — tenant identity comes from the verified session
router.post("/", requireAuth(), createApplication);

// Update application status — manager (property owner) or admin only,
// verified inside the controller
router.put("/:id/status", requireAuth(), updateApplicationStatus);

export default router;