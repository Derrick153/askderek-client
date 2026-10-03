import cron from "node-cron";
import { runNotificationProcessorOnce } from "../lib/notificationProcessor";

// Runs the notification processor once a minute (the shortest retry backoff is
// 1 minute). Only logs when a tick actually did something, so an idle system
// stays quiet. runNotificationProcessorOnce never throws and skips itself if
// the previous tick is still running.
export const startNotificationProcessorJob = (): void => {
  cron.schedule("* * * * *", async () => {
    const result = await runNotificationProcessorOnce();
    if (!result) return;
    const { events, deliveries } = result;
    const didWork = events.eventsFound > 0 || events.orphansRepaired > 0 || deliveries.attempted > 0;
    if (didWork) {
      console.log("[NOTIFICATION PROCESSOR] Tick:", JSON.stringify(result));
    }
  });
  console.log("[NOTIFICATION PROCESSOR] job scheduled - runs every minute");
};