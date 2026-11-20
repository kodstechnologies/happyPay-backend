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
import WebhookLog from "../model/webhookLog.model.js";
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

  // Extract providerTxnId early for the log record
  const providerTxnId =
    callbackBody.txn_id ||
    callbackBody.transaction_id ||
    callbackBody.txnId ||
    callbackBody.transactionId ||
    "unknown";

  // ── Log raw callback (never log sensitive tokens) ───────────────────────
  logger.info({
    msg: "[PAYOUT_CALLBACK] Incoming callback",
    ip: clientIp,
    providerTxnId,
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

    // Save the rejected callback for audit trail
    await WebhookLog.create({
      rawPayload: callbackBody,
      clientIp,
      webhookType: "PAYOUT_CALLBACK",
      providerTxnId: providerTxnId !== "unknown" ? providerTxnId : null,
      authResult: auth.reason || "invalid_secret",
      processed: false,
      status: "unauthorized",
      ack: "unauthorized",
      message: "Authentication failed",
    }).catch((logErr) =>
      logger.error(`[PAYOUT_CALLBACK] Failed to save rejected webhook log: ${logErr.message}`)
    );

    return res.status(401).json({
      success: false,
      message: "Unauthorized – invalid or missing provider credentials",
      ack: "unauthorized",
    });
  }

  logger.info(`[PAYOUT_CALLBACK] Authentication passed. reason=${auth.reason}`);

  // ── 2. Process the callback ──────────────────────────────────────────────
  let result;
  try {
    result = await processPayoutCallbackService(callbackBody);
  } catch (processErr) {
    // Save the callback with error details even if processing threw
    await WebhookLog.create({
      rawPayload: callbackBody,
      clientIp,
      webhookType: "PAYOUT_CALLBACK",
      providerTxnId: providerTxnId !== "unknown" ? providerTxnId : null,
      authResult: auth.reason || "ok",
      processed: false,
      status: "error",
      ack: "error",
      message: "Processing threw an error",
      error: processErr?.message || String(processErr),
    }).catch((logErr) =>
      logger.error(`[PAYOUT_CALLBACK] Failed to save errored webhook log: ${logErr.message}`)
    );

    logger.error(`[PAYOUT_CALLBACK] Processing threw: ${processErr?.message}`);
    throw processErr;
  }

  logger.info({
    msg: "[PAYOUT_CALLBACK] Callback processed",
    processed: result.processed,
    status: result.status,
    transactionId: result.transactionId,
    ack: result.ack,
  });

  // ── 3. Save the processed callback to the webhook log collection ────────
  await WebhookLog.create({
    rawPayload: callbackBody,
    clientIp,
    webhookType: "PAYOUT_CALLBACK",
    providerTxnId: providerTxnId !== "unknown" ? providerTxnId : null,
    transactionId: result.transactionId || null,
    authResult: auth.reason || "ok",
    processed: result.processed,
    status: result.status || null,
    ack: result.ack || null,
    message: result.message || "",
  }).catch((logErr) =>
    logger.error(`[PAYOUT_CALLBACK] Failed to save webhook log: ${logErr.message}`)
  );

  // ── 4. Respond to provider ───────────────────────────────────────────────
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

