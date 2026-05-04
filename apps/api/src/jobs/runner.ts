import { logger } from "../config/logger.js";
import { claimDueJobs, completeJob, failJob } from "../services/job-service.js";
import { sendDueMorningReadinessNotifications } from "../services/morning-readiness-service.js";
import { syncStravaActivities } from "../strava/strava-service.js";
import type { Env } from "../config/env.js";

export function startJobRunner(env: Env) {
  const timer = setInterval(async () => {
    try {
      await sendDueMorningReadinessNotifications();
    } catch (error) {
      logger.error({ err: error }, "Morning readiness notifications failed");
    }

    try {
      const jobs = await claimDueJobs();

      for (const job of jobs) {
        try {
          if (job.type === "strava.sync.single") {
            const payload = job.payloadJson as { userId?: string };
            if (payload.userId) {
              await syncStravaActivities({
                userId: payload.userId,
                config: {
                  clientId: env.STRAVA_CLIENT_ID,
                  clientSecret: env.STRAVA_CLIENT_SECRET,
                  publicBaseUrl: env.PUBLIC_BASE_URL,
                },
                days: 7,
              });
            }
          }

          await completeJob(job.id);
        } catch (error) {
          logger.error({ err: error, jobId: job.id }, "Job failed");
          await failJob(job.id, error instanceof Error ? error.message : "Unknown job failure");
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Job runner tick failed");
    }
  }, 30_000);

  return () => clearInterval(timer);
}
