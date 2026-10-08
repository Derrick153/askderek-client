import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { SAVED_REPORT_LIMIT, parseSaveRequest } from "../lib/savedReports";

// =============================================================================
//  Saved reports (Step 19, Phase 12): a person's saved views of the Reports page.
//  Foundation only - no scheduler, no sharing between people.
//  Every query carries the caller's own id, so one person can never read or delete
//  another person's saved report, whatever id is asked for.
// =============================================================================

const callerIdOf = (req: Request): string | undefined => (req as any).auth?.userId;

const shape = (row: any) => ({
  id: row.id,
  name: row.name,
  reportType: row.reportType,
  filters: row.filters,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

// -- GET /api/reports/saved -------------------------------------------------
export const listSavedReports = async (req: Request, res: Response): Promise<void> => {
  const callerId = callerIdOf(req);
  if (!callerId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  try {
    const rows = await prisma.savedReport.findMany({
      where: { ownerClerkId: callerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: SAVED_REPORT_LIMIT,
    });
    res.status(200).json({ success: true, message: "Saved reports retrieved", data: rows.map(shape) });
  } catch (error: any) {
    console.error("Saved reports list error:", error);
    res.status(500).json({ success: false, message: "Error retrieving saved reports" });
  }
};

// -- POST /api/reports/saved ------------------------------------------------
// Body: { name, reportType: "overview" | "records", filters }
export const createSavedReport = async (req: Request, res: Response): Promise<void> => {
  const callerId = callerIdOf(req);
  if (!callerId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const parsed = parseSaveRequest(req.body);
  if (parsed.ok === false) {
    res.status(400).json({ success: false, message: parsed.message });
    return;
  }

  try {
    // A view of one property can only be saved by that property's manager (or an admin),
    // and the property has to exist.
    const propertyId = parsed.filters.propertyId;
    if (propertyId !== null) {
      const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { managerClerkId: true } });
      if (!property) {
        res.status(404).json({ success: false, message: "Property not found" });
        return;
      }
      if (property.managerClerkId !== callerId) {
        const caller = await prisma.user.findUnique({ where: { clerkId: callerId }, select: { role: true } });
        if (caller?.role !== "ADMIN") {
          res.status(403).json({ success: false, message: "Forbidden" });
          return;
        }
      }
    }

    const count = await prisma.savedReport.count({ where: { ownerClerkId: callerId } });
    if (count >= SAVED_REPORT_LIMIT) {
      res.status(409).json({
        success: false,
        message: "You can keep up to " + SAVED_REPORT_LIMIT + " saved reports. Delete one first.",
      });
      return;
    }

    const row = await prisma.savedReport.create({
      data: {
        ownerClerkId: callerId,
        name: parsed.name,
        reportType: parsed.reportType,
        filters: parsed.filters as any,
      },
    });
    res.status(201).json({ success: true, message: "Report saved", data: shape(row) });
  } catch (error: any) {
    if (error && error.code === "P2002") {
      res.status(409).json({ success: false, message: "You already have a saved report with that name. Choose another name." });
      return;
    }
    console.error("Saved report create error:", error);
    res.status(500).json({ success: false, message: "Error saving the report" });
  }
};

// -- DELETE /api/reports/saved/:id ------------------------------------------
export const deleteSavedReport = async (req: Request, res: Response): Promise<void> => {
  const callerId = callerIdOf(req);
  if (!callerId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  const raw = String(req.params.id ?? "");
  const id = /^[0-9]{1,9}$/.test(raw) ? Number(raw) : 0;
  if (id < 1) {
    res.status(400).json({ success: false, message: "Invalid id" });
    return;
  }
  try {
    // The owner is part of the query itself, so someone else's id looks exactly like a missing one.
    const result = await prisma.savedReport.deleteMany({ where: { id, ownerClerkId: callerId } });
    if (result.count === 0) {
      res.status(404).json({ success: false, message: "Saved report not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Saved report deleted" });
  } catch (error: any) {
    console.error("Saved report delete error:", error);
    res.status(500).json({ success: false, message: "Error deleting the saved report" });
  }
};
