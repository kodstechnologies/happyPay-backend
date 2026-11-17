import cron from "node-cron";
import { Subscription } from "../modules/pricing/models/subscription.model.js";
import logger from "../utils/logger.js";

let cronTask = null;

/**
 * Cron job to check and mark expired subscriptions
 * Runs daily at midnight (00:00)
 */
const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();

    // Find all subscriptions that are not expired but have expired
    const result = await Subscription.updateMany(
      {
        isExpired: false,
        expiresAt: { $lte: now },
      },
      {
        $set: { isExpired: true },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(
        {
          expiredCount: result.modifiedCount,
          timestamp: now.toISOString(),
        },
        `[CRON] Marked ${result.modifiedCount} subscription(s) as expired`
      );
    } else {
      logger.info(
        { timestamp: now.toISOString() },
        "[CRON] No subscriptions to expire"
      );
    }
  } catch (error) {
    logger.error(
      { error },
      "[CRON] Error checking expired subscriptions"
    );
  }
};

/**
 * Initialize and start the subscription expiry cron job
 * Schedule: Runs every day at midnight (00:00)
 */
export const startSubscriptionExpiryCron = () => {
  // Run daily at midnight
  cronTask = cron.schedule("0 0 * * *", checkExpiredSubscriptions, {
    timezone: "Asia/Kolkata",
  });

  logger.info("[CRON] Subscription expiry cron job scheduled to run daily at midnight (Asia/Kolkata)");

  return cronTask;
};

/**
 * Stop the cron job (for graceful shutdown)
 */
export const stopSubscriptionExpiryCron = () => {
  if (cronTask) {
    cronTask.stop();
    logger.info("[CRON] Subscription expiry cron job stopped");
  }
};

/**
 * Manual trigger for testing purposes
 */
export const runSubscriptionExpiryCheck = checkExpiredSubscriptions;
