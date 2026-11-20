import cron from "node-cron";
import { reconcilePendingPayouts } from "../modules/webhooks/services/payoutStatusCheck.service.js";
import logger from "../utils/logger.js";

let cronTask = null;

/**
 * Reconcile pending settlement payouts by querying the provider's
 * status-check API.
 *
 * This is the safety net that finalizes (SUCCESS) or releases (FAILED) the
 * hold placed on a retailer's wallet when a payout is queued. The primary
 * mechanism is the provider's callback webhook; this cron covers the case
 * where that callback is missed or rejected (e.g. secret not configured,
 * network drop, provider delay).
 *
 * Without this, a pending payout's hold on `holdBalance` can sit forever,
 * which permanently reduces the retailer's available balance — so a payout
 * that ultimately FAILED still looks "deducted" because the hold is never
 * released. The cron is idempotent (the callback pipeline guards terminal
 * states), so running it repeatedly is safe.
 */
const runPayoutReconciliation = async () => {
  try {
    // Only reconcile payouts pending for more than 15 minutes, so we don't
    // race the provider's own callback for fresh transactions.
    const result = await reconcilePendingPayouts(15, 50);

    logger.info(
      { checked: result?.checked ?? 0, timestamp: new Date().toISOString() },
      `[CRON] Payout reconciliation pass complete. checked=${result?.checked ?? 0}`
    );
  } catch (error) {
    logger.error({ error }, "[CRON] Payout reconciliation pass failed");
  }
};

/**
 * Initialize and start the payout reconciliation cron job.
 * Schedule: every 10 minutes.
 */
export const startPayoutReconciliationCron = () => {
  cronTask = cron.schedule("*/10 * * * *", runPayoutReconciliation, {
    timezone: "Asia/Kolkata",
  });

  logger.info("[CRON] Payout reconciliation cron scheduled to run every 10 minutes (Asia/Kolkata)");

  return cronTask;
};

/**
 * Stop the cron job (for graceful shutdown).
 */
export const stopPayoutReconciliationCron = () => {
  if (cronTask) {
    cronTask.stop();
    logger.info("[CRON] Payout reconciliation cron stopped");
  }
};

/**
 * Manual trigger for an immediate pass (also used for a boot-time pass).
 */
export const runPayoutReconciliationNow = runPayoutReconciliation;
