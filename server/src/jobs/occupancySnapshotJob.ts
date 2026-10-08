
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

export async function runOccupancySnapshot(note?: string): Promise<{ succeeded: number; failed: number; total: number }> {
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
    details: `${succeeded} succeeded, ${failed} failed, date ${snapshotDate.toISOString().slice(0, 10)}${note ? ", " + note : ""}`,
  });

  return { succeeded, failed, total: propertyIds.length };
}

// -----------------------------------------------------------------------------
//  Phase 15 - catch-up. The free Render server goes to sleep when nobody uses it, so the 00:10 run
//  is sometimes missed and the trend charts show a gap. Whenever the server wakes up (and then once
//  an hour) it checks whether today has any snapshot rows and, if not, takes them at once. The rows
//  are dated today and hold the counts at that moment (createdAt says exactly when). Days the server
//  slept through completely are never filled in afterwards - the past cannot be counted again.
// -----------------------------------------------------------------------------

let catchUpRunning = false;

export async function ensureTodaySnapshot(): Promise<"taken" | "already-there" | "nothing-to-do" | "busy" | "failed"> {
  if (catchUpRunning) return "busy";
  catchUpRunning = true;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rowsToday = await prisma.occupancySnapshot.count({ where: { snapshotDate: today } });
    if (rowsToday > 0) return "already-there";
    const activeRooms = await prisma.room.count({ where: { isActive: true } });
    if (activeRooms === 0) return "nothing-to-do";
    console.log("[OCCUPANCY SNAPSHOT] No snapshot for today yet (the server was probably asleep at midnight) - taking it now...");
    const result = await runOccupancySnapshot("catch-up");
    console.log(
      `[OCCUPANCY SNAPSHOT] Catch-up complete: ${result.succeeded}/${result.total} properties snapshotted (${result.failed} failed)`
    );
    return "taken";
  } catch (err) {
    console.error("[OCCUPANCY SNAPSHOT] Catch-up check failed:", err);
    return "failed";
  } finally {
    catchUpRunning = false;
  }
}

export const startOccupancySnapshotJob = (): void => {
  cron.schedule(
    "10 0 * * *",
    async () => {
      try {
        console.log("[OCCUPANCY SNAPSHOT] Running daily occupancy snapshot...");
        const result = await runOccupancySnapshot();
        console.log(
          `[OCCUPANCY SNAPSHOT] Complete: ${result.succeeded}/${result.total} properties snapshotted (${result.failed} failed)`
        );
      } catch (err) {
        console.error("[OCCUPANCY SNAPSHOT] Daily run failed:", err);
      }
    },
    { timezone: "Africa/Accra" }
  );

  // Catch-up: once shortly after start-up (the database connection needs a moment; one more try two
  // minutes later if that failed), then at 20 minutes past every hour.
  setTimeout(() => {
    void ensureTodaySnapshot().then((outcome) => {
      if (outcome === "failed") {
        setTimeout(() => {
          void ensureTodaySnapshot();
        }, 120_000);
      }
    });
  }, 45_000);
  cron.schedule(
    "20 * * * *",
    () => {
      void ensureTodaySnapshot();
    },
    { timezone: "Africa/Accra" }
  );
};
