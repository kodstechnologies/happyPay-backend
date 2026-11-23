/**
 * Settlement Payout Callback (Webhook) Service
 *
 * Handles provider callbacks for settlement payout transactions.
 *
 * Authentication strategy:
 *   The provider sends a shared secret in the `X-Webhook-Secret` header
 *   (or body field `secret`).  Set PAYOUT_WEBHOOK_SECRET in .env.
 *   When the actual provider documentation arrives, replace verifyCallbackAuthenticity()
 *   with the documented mechanism (HMAC-SHA256, IP whitelist, etc.).
 *
 * Wallet accounting (hold-based approach):
 *   PENDING  → holdBalance += netDebitAmount   (balance untouched, amount reserved)
 *   SUCCESS  → balance -= netDebitAmount        (finalize debit)
 *              holdBalance -= netDebitAmount    (release hold)
 *   FAILED   → holdBalance -= netDebitAmount    (release hold, balance untouched)
 *
 * @module payoutCallback.service
 */

import crypto from "crypto";
import mongoose from "mongoose";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";
import Transaction from "../../transaction/model/transaction.model.js";
import Wallet from "../../wallet/model/wallet.model.js";
import logger from "../../../utils/logger.js";
import env from "../../../config/env.js";

// Best-effort socket import — avoids crash if socket server isn't initialised
let getIO = null;
try {
  const sockets = await import("../../../sockets/socket.server.js");
  getIO = sockets.getIO;
} catch {
  logger.warn("[PAYOUT_CALLBACK] Socket server not available — real-time updates disabled");
}

/**
 * Emit a real-time socket event to the retailer's personal room.
 * Swallows errors so a socket failure never breaks the callback.
 */
const _emitSocketEvent = (retailerUserId, eventName, payload) => {
  if (!getIO || !retailerUserId) return;
  try {
    const io = getIO();
    io.to(`retailer:${retailerUserId}`).emit(eventName, payload);
    logger.info(`[PAYOUT_CALLBACK] Socket event emitted. event=${eventName} userId=${retailerUserId}`);
  } catch (err) {
    logger.error(`[PAYOUT_CALLBACK] Socket emit failed. event=${eventName} error=${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Status normalisation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map provider status strings to our internal status.
 * Returns one of: 'pending' | 'success' | 'failed' | 'unknown'
 */
export const normaliseStatus = (rawStatus = "") => {
  const s = String(rawStatus).toUpperCase().trim();

  if (["SUCCESS", "SUCCESSFUL", "COMPLETED", "COMPLETE"].includes(s)) return "success";
  if (["PENDING", "QUEUED", "PROCESSING", "INITIATED", "IN_PROGRESS", "IN-PROGRESS"].includes(s)) return "pending";
  if (["FAILED", "FAILURE", "FAIL", "REJECTED", "REVERSED", "REFUNDED", "ERROR"].includes(s)) return "failed";

  return "unknown";
};

// ─────────────────────────────────────────────────────────────────────────────
// Authentication / verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify that the callback request is genuinely from the provider.
 *
 * Current strategy: compare `X-Webhook-Secret` header (or `secret` body field)
 * against the PAYOUT_WEBHOOK_SECRET environment variable using a timing-safe
 * comparison.
 *
 * TODO – Replace with the provider's actual auth mechanism once their callback
 * documentation is received (e.g. HMAC-SHA256 signature verification).
 *
 * @returns {{ valid: boolean, reason: string }}
 */
export const verifyCallbackAuthenticity = (req) => {
  const webhookSecret = env.PAYOUT_WEBHOOK_SECRET;

  // If no secret is configured, skip verification but warn loudly.
  if (!webhookSecret) {
    logger.warn(
      "[PAYOUT_CALLBACK] PAYOUT_WEBHOOK_SECRET is not set. " +
      "Callback authentication is DISABLED. Configure it before going to production."
    );
    return { valid: true, reason: "no_secret_configured" };
  }

  // Try header first, then body field
  const incomingSecret =
    req.headers["x-webhook-secret"] ||
    req.headers["x-api-key"] ||
    (req.body && (req.body.secret || req.body.webhook_secret)) ||
    "";

  if (!incomingSecret) {
    return { valid: false, reason: "missing_secret" };
  }

  // Timing-safe comparison to prevent timing-based attacks
  const bufExpected = Buffer.from(webhookSecret);
  const bufIncoming = Buffer.from(String(incomingSecret));

  if (bufExpected.length !== bufIncoming.length) {
    return { valid: false, reason: "invalid_secret" };
  }

  if (!crypto.timingSafeEqual(bufExpected, bufIncoming)) {
    return { valid: false, reason: "invalid_secret" };
  }

  return { valid: true, reason: "ok" };
};

// ─────────────────────────────────────────────────────────────────────────────
// Payload extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract and validate required fields from the provider callback payload.
 *
 * NOTE: Field names are based on the illustrative example provided in the
 * requirements.  Update the mapping below when the actual provider callback
 * documentation arrives.
 *
 * @returns {{ providerTxnId, rawStatus, utr, operatorId, amount, error? }}
 */
export const extractCallbackFields = (body = {}) => {
  // Provider txn ID – required for lookup
  const providerTxnId =
    body.txn_id ||
    body.transaction_id ||
    body.txnId ||
    body.transactionId ||
    body.txnid ||    // provider may send our internal txnid without underscore
    null;

  // if (!providerTxnId) {
  //   return { error: "Missing required field: txn_id (provider transaction ID)" };
  // }

  // Status – required
  const rawStatus = body.status || body.txn_status || body.transaction_status || null;
  if (!rawStatus) {
    return { error: "Missing required field: status" };
  }

  // Optional enrichment fields
  const utr =
    body.utr || body.rrn || body.bank_ref_num || body.bankRefNum ||
    body.bank_reference || null;

  const operatorId =
    body.operator_id || body.operatorId || body.bank_txn_id || null;

  const amount = body.amount ? Number(body.amount) : null;

  return { providerTxnId, rawStatus, utr, operatorId, amount, error: null };
};

// ─────────────────────────────────────────────────────────────────────────────
// Core callback processor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process a provider payout callback.
 * This is the main entry point called by the controller.
 *
 * @returns {{ processed: boolean, status: string, transactionId: string, message: string, ack: string }}
 */
export const processPayoutCallbackService = async (callbackBody = {}) => {
  // 1. Extract & validate fields
  const { providerTxnId, rawStatus, utr, operatorId, amount, error: extractionError } =
    extractCallbackFields(callbackBody);

  if (extractionError) {
    logger.warn({ msg: "[PAYOUT_CALLBACK] Invalid payload", extractionError });
    return {
      processed: false,
      status: null,
      transactionId: null,
      message: extractionError,
      ack: "error",
    };
  }

  const internalStatus = normaliseStatus(rawStatus);
  logger.info(
    `[PAYOUT_CALLBACK] Received. providerTxnId=${providerTxnId} rawStatus=${rawStatus} internalStatus=${internalStatus}`
  );

  // 2. Find the transaction by providerTxnId, with fallback to our internal txnId
  let txn = null;
  if (providerTxnId) {
    txn = await Transaction.findOne({ providerTxnId, service: "PAYOUT" });
  }
  // Fallback: some providers echo our merchant txnid in the callback instead
  // of their own provider txn id. Try matching against our internal transactionId.
  if (!txn && providerTxnId) {
    txn = await Transaction.findOne({ transactionId: providerTxnId, service: "PAYOUT" });
  }

  if (!txn) {
    logger.warn(`[PAYOUT_CALLBACK] Unknown providerTxnId=${providerTxnId}. No matching transaction found.`);
    return {
      processed: false,
      status: null,
      transactionId: null,
      message: "Transaction not found for provider ID",
      ack: "not_found",
    };
  }

  const internalTxnId = txn.transactionId;
  logger.info(
    `[PAYOUT_CALLBACK] Matched. internalTxnId=${internalTxnId} currentStatus=${txn.status}`
  );

  // 3. Idempotency guard: terminal states must not be overwritten
  const terminalStates = ["success", "failed", "reversed"];
  if (terminalStates.includes(txn.status)) {
    logger.warn(
      `[PAYOUT_CALLBACK] Duplicate callback for terminal transaction. ` +
      `internalTxnId=${internalTxnId} currentStatus=${txn.status} incomingStatus=${internalStatus}. Ignoring.`
    );
    return {
      processed: false,
      status: txn.status,
      transactionId: internalTxnId,
      message: "Callback already processed – transaction is in terminal state",
      ack: "duplicate",
    };
  }

  // 4. PENDING → PENDING: update provider info only (no wallet change)
  if (internalStatus === "pending" && txn.status === "pending") {
    logger.info(
      `[PAYOUT_CALLBACK] PENDING callback for already-pending transaction internalTxnId=${internalTxnId}. Updating provider info only.`
    );
    await Transaction.findByIdAndUpdate(txn._id, {
      $set: {
        providerStatus: rawStatus,
        providerCallbackPayload: callbackBody,
        callbackReceivedAt: new Date(),
        ...(utr ? { utr } : {}),
        ...(operatorId ? { operatorId } : {}),
      },
    });
    return {
      processed: true,
      status: "pending",
      transactionId: internalTxnId,
      message: "Callback acknowledged – transaction remains pending",
      ack: "ok",
    };
  }

  // 5. Unknown status: record but don't change state
  if (internalStatus === "unknown") {
    logger.warn(
      `[PAYOUT_CALLBACK] Unknown provider status '${rawStatus}' for internalTxnId=${internalTxnId}. Recording only.`
    );
    await Transaction.findByIdAndUpdate(txn._id, {
      $set: {
        providerStatus: rawStatus,
        providerCallbackPayload: callbackBody,
        callbackReceivedAt: new Date(),
      },
    });
    return {
      processed: false,
      status: txn.status,
      transactionId: internalTxnId,
      message: `Unrecognised provider status '${rawStatus}'. Transaction state unchanged.`,
      ack: "unknown_status",
    };
  }

  // 6. SUCCESS
  if (internalStatus === "success") {
    return await _processSuccess(txn, callbackBody, { utr, operatorId, rawStatus });
  }

  // 7. FAILED
  if (internalStatus === "failed") {
    return await _processFailed(txn, callbackBody, { utr, operatorId, rawStatus });
  }

  return {
    processed: false,
    status: txn.status,
    transactionId: internalTxnId,
    message: "Unhandled callback status",
    ack: "error",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS handler
// ─────────────────────────────────────────────────────────────────────────────

const _processSuccess = async (txn, callbackBody, { utr, operatorId, rawStatus }) => {
  const internalTxnId = txn.transactionId;
  const netDebitAmount = Number(txn.netDebitAmount || 0);

  logger.info(
    `[PAYOUT_CALLBACK] Processing SUCCESS. internalTxnId=${internalTxnId} finalizing wallet debit of ₹${netDebitAmount}`
  );

  const session = await mongoose.startSession();
  let balanceBefore, balanceAfter, retailerUserId;

  try {
    await session.withTransaction(async () => {
      const txnInSession = await Transaction.findOne({
        _id: txn._id,
        status: "pending",
      }).session(session);

      if (!txnInSession) {
        const err = new Error("ALREADY_PROCESSED");
        err.code = "ALREADY_PROCESSED";
        throw err;
      }

      // Finalize the debit: deduct balance + release hold atomically.
      const wallet = await Wallet.findById(txn.wallet).session(session);
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      balanceBefore = Number(wallet.balance || 0);
      const holdBefore = Number(wallet.holdBalance || 0);

      retailerUserId = wallet.user?.toString() || null;

      wallet.balance = Math.round((balanceBefore - netDebitAmount) * 100) / 100;
      const balanceAfterDebit = wallet.balance;
      wallet.holdBalance = Math.max(0, Math.round((holdBefore - netDebitAmount) * 100) / 100);
      await wallet.save({ session });

      balanceAfter = wallet.balance;

      logger.info(
        `[PAYOUT_CALLBACK] SUCCESS wallet update. balance: ${balanceBefore}→${balanceAfter} holdBalance: ${holdBefore}→${wallet.holdBalance}`
      );

      // Mark transaction as success with finalized balance info
      await Transaction.findByIdAndUpdate(
        txn._id,
        {
          $set: {
            status: "success",
            providerStatus: rawStatus,
            providerCallbackPayload: callbackBody,
            callbackReceivedAt: new Date(),
            balanceBefore,
            balanceAfter: balanceAfterDebit,
            ...(utr ? { utr } : {}),
            ...(operatorId ? { operatorId } : {}),
          },
        },
        { session }
      );
    });
  } catch (err) {
    if (err.code === "ALREADY_PROCESSED" || err.message === "ALREADY_PROCESSED") {
      logger.warn(`[PAYOUT_CALLBACK] Concurrent SUCCESS – already processed. internalTxnId=${internalTxnId}`);
      return {
        processed: false,
        status: "success",
        transactionId: internalTxnId,
        message: "Already processed",
        ack: "duplicate",
      };
    }
    logger.error(`[PAYOUT_CALLBACK] SUCCESS processing failed. internalTxnId=${internalTxnId} error=${err.message}`);
    throw err;
  } finally {
    session.endSession();
  }

  // Credit distributor commission (best-effort, outside transaction)
  await _creditDistributorCommission(txn, internalTxnId);

  // Send push + in-app notification to the retailer (best-effort)
  if (retailerUserId) {
    const settlementAmount = Number(txn.amount || 0);
    try {
      const { sendWalletTransferNotification } = await import(
        "../../notifications/services/notification.services.js"
      );
      await sendWalletTransferNotification({
        recipientId: retailerUserId,
        type: "WALLET_DEBIT",
        title: "Settlement Successful",
        body: `₹${settlementAmount.toFixed(2)} has been successfully transferred to your bank account. UTR: ${utr || internalTxnId}`,
        data: {
          service: "PAYOUT",
          serviceName: "Settlement",
          amount: String(settlementAmount),
          transactionId: internalTxnId,
          status: "success",
          utr: utr || "",
          screen: "TRANSACTIONS",
        },
      });
      logger.info(`[PAYOUT_CALLBACK] Success notification sent. userId=${retailerUserId} amount=₹${settlementAmount}`);
    } catch (notifErr) {
      logger.error(`[PAYOUT_CALLBACK] Failed to send success notification. error=${notifErr.message}`);
    }

    // Real-time socket event so the frontend can update instantly
    _emitSocketEvent(retailerUserId, "payout:status", {
      transactionId: internalTxnId,
      status: "success",
      amount: settlementAmount,
      utr: utr || "",
      balanceAfter,
    });
  }

  logger.info(`[PAYOUT_CALLBACK] SUCCESS complete. internalTxnId=${internalTxnId}`);

  return {
    processed: true,
    status: "success",
    transactionId: internalTxnId,
    message: "Payout settled successfully",
    utr,
    ack: "ok",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// FAILED handler
// ─────────────────────────────────────────────────────────────────────────────

const _processFailed = async (txn, callbackBody, { utr, operatorId, rawStatus }) => {
  const internalTxnId = txn.transactionId;
  const netDebitAmount = Number(txn.netDebitAmount || 0);

  logger.info(
    `[PAYOUT_CALLBACK] Processing FAILED. internalTxnId=${internalTxnId} releasing hold ₹${netDebitAmount}`
  );

  const failureReason =
    callbackBody.failure_reason ||
    callbackBody.error_message ||
    callbackBody.error ||
    callbackBody.msg ||
    callbackBody.message ||
    "Provider marked payout as failed";

  const session = await mongoose.startSession();
  let retailerUserId;

  try {
    await session.withTransaction(async () => {
      const txnInSession = await Transaction.findOne({
        _id: txn._id,
        status: "pending",
      }).session(session);

      if (!txnInSession) {
        const err = new Error("ALREADY_PROCESSED");
        err.code = "ALREADY_PROCESSED";
        throw err;
      }

      // Release hold only — balance was never deducted at initiation.
      const wallet = await Wallet.findById(txn.wallet).session(session);
      if (wallet) {
        const balanceBefore = Number(wallet.balance || 0);
        const holdBefore = Number(wallet.holdBalance || 0);

        wallet.holdBalance = Math.max(0, Math.round((holdBefore - netDebitAmount) * 100) / 100);
        await wallet.save({ session });

        // Resolve the retailer userId from the wallet document
        retailerUserId = wallet.user;

        logger.info(
          `[PAYOUT_CALLBACK] Hold released on FAILED. holdBalance: ${holdBefore}→${wallet.holdBalance}`
        );

        // Create a "reversed" credit transaction as the audit record.
        // balanceBefore/After are unchanged since only hold was released.
        const refundTxn = new Transaction({
          wallet: wallet._id,
          type: "credit",
          amount: netDebitAmount,
          balanceBefore: balanceBefore,
          balanceAfter: balanceBefore,
          service: "PAYOUT",
          transactionId: generate15CharTxnId("RFD"),
          status: "reversed",
          description: `Hold released for failed payout (Ref: ${internalTxnId}). ${failureReason}`,
          commissionEarned: 0,
          charges: 0,
          payee: txn.payee || {},
        });
        await refundTxn.save({ session });

        logger.info(
          `[PAYOUT_CALLBACK] Reversal transaction created. refundTxnId=${refundTxn.transactionId}`
        );
      } else {
        logger.warn(`[PAYOUT_CALLBACK] Wallet not found for FAILED processing. internalTxnId=${internalTxnId}`);
      }

      // Mark the original transaction as failed
      await Transaction.findByIdAndUpdate(
        txn._id,
        {
          $set: {
            status: "failed",
            providerStatus: rawStatus,
            providerCallbackPayload: callbackBody,
            callbackReceivedAt: new Date(),
            failureReason,
            ...(utr ? { utr } : {}),
            ...(operatorId ? { operatorId } : {}),
          },
        },
        { session }
      );
    });
  } catch (err) {
    if (err.code === "ALREADY_PROCESSED" || err.message === "ALREADY_PROCESSED") {
      logger.warn(`[PAYOUT_CALLBACK] Concurrent FAILED – already processed. internalTxnId=${internalTxnId}`);
      return {
        processed: false,
        status: "failed",
        transactionId: internalTxnId,
        message: "Already processed",
        ack: "duplicate",
      };
    }
    logger.error(`[PAYOUT_CALLBACK] FAILED processing error. internalTxnId=${internalTxnId} error=${err.message}`);
    throw err;
  } finally {
    session.endSession();
  }

  // Send push + in-app notification to the retailer (best-effort, outside session)
  if (retailerUserId && netDebitAmount > 0) {
    try {
      const { sendWalletTransferNotification } = await import(
        "../../notifications/services/notification.services.js"
      );
      await sendWalletTransferNotification({
        recipientId: retailerUserId,
        type: "WALLET_CREDIT",
        title: "Settlement Refunded",
        body: `₹${netDebitAmount.toFixed(2)} has been refunded to your wallet. Your settlement (Ref: ${internalTxnId}) could not be processed. Reason: ${failureReason}`,
        data: {
          service: "PAYOUT",
          serviceName: "Settlement Refund",
          amount: String(netDebitAmount),
          transactionId: internalTxnId,
          screen: "TRANSACTIONS",
        },
      });
      logger.info(
        `[PAYOUT_CALLBACK] Refund notification sent. userId=${retailerUserId} amount=₹${netDebitAmount}`
      );
    } catch (notifErr) {
      logger.error(
        `[PAYOUT_CALLBACK] Failed to send refund notification. error=${notifErr.message}`
      );
    }

    // Real-time socket event so the frontend can update instantly
    _emitSocketEvent(retailerUserId, "payout:status", {
      transactionId: internalTxnId,
      status: "failed",
      amount: netDebitAmount,
      failureReason,
    });
  }

  logger.info(`[PAYOUT_CALLBACK] FAILED complete. internalTxnId=${internalTxnId} hold released=₹${netDebitAmount}`);

  return {
    processed: true,
    status: "failed",
    transactionId: internalTxnId,
    message: `Payout failed – ₹${netDebitAmount.toFixed(2)} hold released, amount available in wallet`,
    failureReason,
    ack: "ok",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Distributor commission credit (best-effort, called only on SUCCESS)
// ─────────────────────────────────────────────────────────────────────────────

const _creditDistributorCommission = async (txn, internalTxnId) => {
  const distributorId = txn.distributorId || txn.commissionBreakdown?.distributorId;
  const distributorCommission = Number(
    txn.distributorCommission || txn.commissionBreakdown?.distributorCommission || 0
  );

  if (!distributorId || distributorCommission <= 0 || !mongoose.Types.ObjectId.isValid(String(distributorId))) {
    return;
  }

  try {
    const distWallet = await Wallet.findOneAndUpdate(
      { user: distributorId },
      { $inc: { balance: distributorCommission } },
      { returnDocument: "after", upsert: true }
    );

    const distBalAfter = distWallet.balance;
    const distBalBefore = Math.round((distBalAfter - distributorCommission) * 100) / 100;

    const distTxn = new Transaction({
      wallet: distWallet._id,
      type: "credit",
      amount: distributorCommission,
      balanceBefore: distBalBefore,
      balanceAfter: distBalAfter,
      service: "COMMISSION",
      transactionId: generate15CharTxnId("DST"),
      status: "success",
      description: `Distributor Commission for PAYOUT (Retailer Ref: ${internalTxnId})`,
      payee: { name: "Retailer Sub-Commission" },
      commissionEarned: distributorCommission,
    });
    await distTxn.save();

    logger.info(
      `[PAYOUT_CALLBACK] Distributor commission credited. distributorId=${distributorId} amount=₹${distributorCommission}`
    );
  } catch (err) {
    logger.error(
      `[PAYOUT_CALLBACK] Distributor commission credit failed. distributorId=${distributorId} error=${err.message}`
    );
  }
};

export default {
  processPayoutCallbackService,
  verifyCallbackAuthenticity,
  extractCallbackFields,
  normaliseStatus,
};
