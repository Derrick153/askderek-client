
import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { getOccupancyMetrics } from "../lib/reportingService";
import { logSystemEvent } from "../lib/auditService";

// -----------------------------------------------------------------------------
//  occupancySnapshotJob.ts
//
//  Step 19 - Reporting & Analytics.
//
//  Runs every day shortly after midnight (Africa/Accra).
//  Takes one snapshot row per hostel property (any property that has at
//  least one active Room) of its current bed-status counts, so occupancy
//  trend charts have real historical data to plot going forward. Bed
//  occupancy is deliberately never stored as a running counter elsewhere in
//  this codebase (to avoid drift) - this job is the one place a point-in-
//  time count is intentionally persisted, specifically so it can be looked
//  back on later. Safe to re-run any time the same day: the unique
//  (propertyId, snapshotDate) constraint makes this an idempotent upsert.
// -----------------------------------------------------------------------------

export async function runOccupancySnapshot(): Promise<{ succeeded: number; failed: number; total: number }> {
  const propertiesWithRooms = await prisma.room.findMany({
    where: { isActive: true },
    select: { propertyId: true },
    distinct: ["propertyId"],
  });

  const propertyIds = propertiesWithRooms.map((r) => r.propertyId);
  const snapshotDate = new Date();
  snapshotDate.setHours(0, 0, 0, 0);

  let succeeded = 0;
  let failed = 0;

  for (const propertyId of propertyIds) {
    try {
      const metrics = await getOccupancyMetrics({ propertyId });

      await prisma.occupancySnapshot.upsert({
        where: { propertyId_snapshotDate: { propertyId, snapshotDate } },
        create: {
          propertyId,
          snapshotDate,
          totalRooms: metrics.totalRooms,
          totalBeds: metrics.totalBeds,
          available: metrics.available,
          reserved: metrics.reserved,
          occupied: metrics.occupied,
          maintenance: metrics.maintenance,
          retired: metrics.retiredBeds,
        },
        update: {
          totalRooms: metrics.totalRooms,
          totalBeds: metrics.totalBeds,
          available: metrics.available,
          reserved: metrics.reserved,
          occupied: metrics.occupied,
          maintenance: metrics.maintenance,
          retired: metrics.retiredBeds,
        },
      });

      succeeded++;
    } catch (err) {
      console.error(`[OCCUPANCY SNAPSHOT] Failed for property ${propertyId}:`, err);
      failed++;
    }
  }

  await logSystemEvent({
    action: "OCCUPANCY_SNAPSHOT_TAKEN",
    target: `${propertyIds.length} properties`,
    details: `${succeeded} succeeded, ${failed} failed, date ${snapshotDate.toISOString().slice(0, 10)}`,
  });

  return { succeeded, failed, total: propertyIds.length };
}

export const startOccupancySnapshotJob = (): void => {
  cron.schedule(
    "10 0 * * *",
    async () => {
      console.log("[OCCUPANCY SNAPSHOT] Running daily occupancy snapshot...");
      const result = await runOccupancySnapshot();
      console.log(
        `[OCCUPANCY SNAPSHOT] Complete: ${result.succeeded}/${result.total} properties snapshotted (${result.failed} failed)`
      );
    },
    { timezone: "Africa/Accra" }
  );
};
