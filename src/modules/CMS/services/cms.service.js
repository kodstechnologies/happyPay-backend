import { initiateCmsPayment } from "../../external/services/provider.service.js";
import User from "../../auth/model/user.model.js";
import {
  verifyWalletBalance,
  processServiceWalletTransaction,
} from "../../wallet/services/wallet.service.js";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";

/**
 * Service to initiate CMS Payment session with provider
 */
const initiateCmsPaymentService = async (payload = {}) => {
  return await initiateCmsPayment(payload);
};

/**
 * Helper to sanitize and safely parse numeric monetary amounts
 */
const parseMonetaryAmount = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const str = String(value).replace(/[^0-9.-]/g, "").trim();
  const num = Number(str);
  return isNaN(num) ? 0 : num;
};

/**
 * Service to handle CMS Server-to-Server Webhook Callbacks from Provider:
 * 1. CMS_BALANCE_INQUIRY: Verifies that the retailer has sufficient wallet balance.
 * 2. CMS_BALANCE_DEBIT: Debits the transaction amount from the retailer's wallet atomically.
 *
 * Success Response expected by Provider:
 * { "status": 200, "message": "Transaction completed successfully" }
 *
 * Failure Response:
 * { "status": 400, "message": "<failure reason>" }
 */
const handleCmsCallbackService = async (body = {}, query = {}) => {
  console.log("[CMS Webhook Callback Received]:", {
    body,
    query,
  });

  // 1. Extract Event Identifier (from body or query or nested payload)
  const rawEvent =
    body.event ||
    body.event_type ||
    body.action ||
    body.type ||
    query.event ||
    query.event_type ||
    query.action ||
    "";
  const event = String(rawEvent).toUpperCase().trim();

  // 2. Extract nested param object or flat payload
  const param =
    body.param && typeof body.param === "object" ? body.param : body;

  const rawAmount =
    param.amount ?? body.amount ?? query.amount ?? 0;
  const numAmount = Math.round(parseMonetaryAmount(rawAmount) * 100) / 100;

  const rawMobile = String(
    param.mobile_no ||
      param.mobile ||
      body.mobile_no ||
      body.mobile ||
      query.mobile_no ||
      query.mobile ||
      ""
  ).trim();

  const refid = String(
    param.refid ||
      param.txnid ||
      body.refid ||
      body.txnid ||
      query.refid ||
      query.txnid ||
      ""
  ).trim();

  const billerId = String(
    param.biller_id || body.biller_id || query.biller_id || ""
  ).trim();
  const billerName = String(
    param.biller_name || body.biller_name || query.biller_name || ""
  ).trim();

  // Validate presence of event
  if (!event) {
    console.warn("[CMS Callback Validation Error]: Missing event parameter");
    return {
      httpStatus: 400,
      response: {
        status: 400,
        message: "Missing event parameter in callback",
      },
    };
  }

  // 3. Resolve Retailer by 10-digit mobile
  const cleanMobile = rawMobile.replace(/\D/g, "").slice(-10);

  if (!cleanMobile || cleanMobile.length < 10) {
    console.warn(`[CMS Callback Validation Error]: Invalid or missing mobile number '${rawMobile}'`);
    return {
      httpStatus: 400,
      response: {
        status: 400,
        message: "Invalid or missing retailer mobile number",
      },
    };
  }

  const user = await User.findOne({
    $or: [
      { mobile: cleanMobile },
      { mobile: rawMobile },
      { mobile: `+91${cleanMobile}` },
      { mobile: `91${cleanMobile}` },
    ],
  });

  if (!user) {
    console.warn(`[CMS Callback Error]: Retailer not found with mobile '${cleanMobile}'`);
    return {
      httpStatus: 400,
      response: {
        status: 400,
        message: "Retailer mobile number not registered or found",
      },
    };
  }

  // =========================================================================
  // Case A: CMS_BALANCE_INQUIRY
  // =========================================================================
  if (
    event === "CMS_BALANCE_INQUIRY" ||
    event === "BALANCE_INQUIRY" ||
    event.includes("INQUIRY")
  ) {
    if (numAmount <= 0) {
      console.warn(`[CMS Callback Inquiry Error]: Invalid amount '${rawAmount}'`);
      return {
        httpStatus: 400,
        response: {
          status: 400,
          message: "Transaction amount must be greater than zero",
        },
      };
    }

    try {
      // Verify retailer wallet has sufficient available balance
      const walletData = await verifyWalletBalance(user._id, numAmount);

      console.log(
        `[CMS Callback Inquiry Success]: User ${user._id} (${user.mobile}) has sufficient balance: ₹${walletData.availableBalance} >= ₹${numAmount}`
      );

      return {
        httpStatus: 200,
        response: {
          status: 200,
          message: "Transaction completed successfully",
        },
      };
    } catch (err) {
      console.warn(`[CMS Callback Inquiry Failed]: Insufficient balance or inactive wallet for user ${user._id}:`, err.message);
      return {
        httpStatus: 400,
        response: {
          status: 400,
          message: err.message || "Insufficient balance",
        },
      };
    }
  }

  // =========================================================================
  // Case B: CMS_BALANCE_DEBIT
  // =========================================================================
  if (
    event === "CMS_BALANCE_DEBIT" ||
    event === "BALANCE_DEBIT" ||
    event.includes("DEBIT")
  ) {
    if (numAmount <= 0) {
      console.warn(`[CMS Callback Debit Error]: Invalid amount '${rawAmount}'`);
      return {
        httpStatus: 400,
        response: {
          status: 400,
          message: "Transaction amount must be greater than zero",
        },
      };
    }

    try {
      const resolvedTxnId = refid || generate15CharTxnId("CMS");
      const billerLabel = billerName || billerId || "Cash Collection";

      // Execute atomic wallet debit with double-entry ledger & idempotency guard
      const debitResult = await processServiceWalletTransaction({
        userId: user._id,
        type: "debit",
        amount: numAmount,
        service: "CMS",
        transactionId: resolvedTxnId,
        status: "success",
        description: `CMS Collection: ${billerLabel} (Ref: ${refid || resolvedTxnId})`,
        payee: {
          name: billerName || "CMS Biller",
          mobile: cleanMobile || user.mobile,
          shopName: user.shop?.name || undefined,
        },
      });

      console.log(
        `[CMS Callback Debit Success]: Debited ₹${numAmount} from user ${user._id} (${user.mobile}). TxnId: ${resolvedTxnId}`,
        debitResult?.isDuplicate ? "(Duplicate Request Handled Safely - No Double Debit)" : ""
      );

      return {
        httpStatus: 200,
        response: {
          status: 200,
          message: "Transaction completed successfully",
        },
      };
    } catch (err) {
      console.error(`[CMS Callback Debit Failed]: Error during wallet debit for user ${user._id}:`, err.message);
      return {
        httpStatus: 400,
        response: {
          status: 400,
          message: err.message || "Debit transaction failed",
        },
      };
    }
  }

  // =========================================================================
  // Case C: Unknown / Unsupported Event
  // =========================================================================
  console.warn(`[CMS Callback Unknown Event]: Received event '${rawEvent}'`);
  return {
    httpStatus: 400,
    response: {
      status: 400,
      message: `Unknown or unsupported CMS callback event: '${rawEvent}'`,
    },
  };
};

export { initiateCmsPaymentService, handleCmsCallbackService };
