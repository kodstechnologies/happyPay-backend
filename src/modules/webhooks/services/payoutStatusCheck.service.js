/**
 * Payout Status Check Service
 *
 * Uses the provider's status-check API to verify payout state for
 * transactions that are still pending (e.g. callback was not received).
 *
 * Provider API: POST /api/public/settlement-payout/status-check
 *
 * This is NOT an automated retry of the payout initiation.  It is a
 * read-only status enquiry used only when a callback has been missed.
 *
 * @module payoutStatusCheck.service
 */

import { checkSettlement_status } from "../../external/services/provider.service.js";
import Transaction from "../../transaction/model/transaction.model.js";
import { processPayoutCallbackService } from "../../webhooks/services/payoutCallback.service.js";
import logger from "../../../utils/logger.js";

/**
 * Check the provider status for a single payout transaction and
 * process the result via the same callback pipeline (idempotent).
 *
 * @param {string} internalTxnId - Our internal transaction ID
 * @returns {Object} Result object with status info
 */
export const checkPayoutTransactionStatus = async (internalTxnId) => {
  if (!internalTxnId) {
    throw new Error("internalTxnId is required");
  }

  // Find the transaction
  const txn = await Transaction.findOne({
    transactionId: internalTxnId,
    service: "PAYOUT",
  });

  if (!txn) {
    return { found: false, message: "Transaction not found" };
  }

  if (txn.status !== "pending") {
    return {
      found: true,
      status: txn.status,
      message: `Transaction is already in terminal state: ${txn.status}`,
    };
  }

  if (!txn.providerTxnId) {
    return {
      found: true,
      status: "pending",
      message: "No provider transaction ID saved – cannot check status",
    };
  }

  logger.info(
    `[PAYOUT_STATUS_CHECK] Checking status for internalTxnId=${internalTxnId} providerTxnId=${txn.providerTxnId}`
  );

  // Call provider status-check API
  // NOTE: Request payload format is based on the existing route definition.
  // Update the payload fields when provider documentation is confirmed.
  let providerStatusResponse;
  try {
    providerStatusResponse = await checkSettlement_status({
      txn_id: txn.providerTxnId,
    });
    logger.info(`[PAYOUT_STATUS_CHECK] Provider response:`, providerStatusResponse);
  } catch (err) {
    logger.error(
      `[PAYOUT_STATUS_CHECK] Provider status check failed for internalTxnId=${internalTxnId}:`,
      err.message
    );
    return {
      found: true,
      status: "pending",
      message: `Provider status check failed: ${err.message}`,
      error: true,
    };
  }

  // Feed the provider response through the callback pipeline so that
  // the same idempotency and wallet accounting logic applies.
  const callbackPayload = {
    txn_id: txn.providerTxnId,
    status: providerStatusResponse?.status || providerStatusResponse?.data?.status,
    amount: providerStatusResponse?.data?.amount || providerStatusResponse?.amount,
    operator_id: providerStatusResponse?.data?.operator_id || providerStatusResponse?.operator_id,
    utr: providerStatusResponse?.utr || providerStatusResponse?.data?.utr,
    rrn: providerStatusResponse?.rrn || providerStatusResponse?.data?.rrn,
    // Source tag so we know this was a manual status-check not a live callback
    _source: "status_check",
  };

  const result = await processPayoutCallbackService(callbackPayload);

  return {
    found: true,
    status: result.status,
    transactionId: internalTxnId,
    providerTxnId: txn.providerTxnId,
    processed: result.processed,
    message: result.message,
    providerStatusResponse,
  };
};

/**
 * Find all payout transactions still in pending state and check their
 * provider status.  Intended to be called by a reconciliation cron job.
 *
 * @param {number} olderThanMinutes - Only check transactions older than this
 * @param {number} limit - Max transactions to check in one pass
 */
export const reconcilePendingPayouts = async (olderThanMinutes = 30, limit = 50) => {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const pendingTxns = await Transaction.find({
    service: "PAYOUT",
    status: "pending",
    providerTxnId: { $ne: null },
    createdAt: { $lt: cutoff },
  })
    .select("transactionId providerTxnId createdAt")
    .limit(limit)
    .lean();

  logger.info(
    `[PAYOUT_RECONCILE] Found ${pendingTxns.length} pending payout(s) older than ${olderThanMinutes} minutes`
  );

  const results = [];
  for (const txn of pendingTxns) {
    try {
      const result = await checkPayoutTransactionStatus(txn.transactionId);
      results.push({ transactionId: txn.transactionId, ...result });
    } catch (err) {
      logger.error(
        `[PAYOUT_RECONCILE] Error checking txn ${txn.transactionId}: ${err.message}`
      );
      results.push({ transactionId: txn.transactionId, error: err.message });
    }
  }

  return { checked: results.length, results };
};

export default { checkPayoutTransactionStatus, reconcilePendingPayouts };

