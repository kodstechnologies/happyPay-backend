/**
 * Settlement Payout Callback Controller
 *
 * POST /api/v1/webhooks/payout/callback
 *
 * This endpoint is called by the payment provider when a queued payout
 * transaction receives a status update.  It is publicly accessible (no
 * retailer JWT) but protected by provider-side authentication.
 */

import { asyncHandler } from "../../../utils/asyncHandler.js";
import logger from "../../../utils/logger.js";
import {
  verifyCallbackAuthenticity,
  processPayoutCallbackService,
} from "../services/payoutCallback.service.js";

/**
 * Handle incoming provider callback for a payout transaction.
 * POST /api/v1/webhooks/payout/callback
 */
export const payoutCallbackController = asyncHandler(async (req, res) => {
  const callbackBody = req.body || {};
  const clientIp = req.ip || req.connection?.remoteAddress || "unknown";

  // ── Log raw callback (never log sensitive tokens) ───────────────────────
  logger.info({
    msg: "[PAYOUT_CALLBACK] Incoming callback",
    ip: clientIp,
    providerTxnId:
      callbackBody.txn_id ||
      callbackBody.transaction_id ||
      callbackBody.txnId ||
      "unknown",
    status: callbackBody.status || "unknown",
  });

  // ── 1. Verify provider authenticity ─────────────────────────────────────
  const auth = verifyCallbackAuthenticity(req);

  if (!auth.valid) {
    logger.warn({
      msg: "[PAYOUT_CALLBACK] Authentication failed",
      reason: auth.reason,
      ip: clientIp,
    });

    return res.status(401).json({
      success: false,
      message: "Unauthorized – invalid or missing provider credentials",
      ack: "unauthorized",
    });
  }

  logger.info(`[PAYOUT_CALLBACK] Authentication passed. reason=${auth.reason}`);

  // ── 2. Process the callback ──────────────────────────────────────────────
  const result = await processPayoutCallbackService(callbackBody);

  logger.info({
    msg: "[PAYOUT_CALLBACK] Callback processed",
    processed: result.processed,
    status: result.status,
    transactionId: result.transactionId,
    ack: result.ack,
  });

  // ── 3. Respond to provider ───────────────────────────────────────────────
  // Always return 200 so the provider does not keep retrying.
  // The `ack` field tells the provider whether we successfully processed it.
  return res.status(200).json({
    success: true,
    ack: result.ack || "ok",
    transactionId: result.transactionId || null,
    status: result.status || null,
    message: result.message || "Callback received",
  });
});

export default { payoutCallbackController };

