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
 * 2. CMS_BALANCE_DEBIT: Debits the transaction amount from the retailer's wallet atomically
 *    and records the Payee with the details of whose bill was paid (Customer / Biller).
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

  // 1. Extract nested param object or flat payload
  const param =
    body.param && typeof body.param === "object" ? body.param : body;

  // Extract Event Identifier
  const rawEvent =
    body.event ||
    body.event_type ||
    body.action ||
    body.type ||
    query.event ||
    query.event_type ||
    query.action ||
    param.event ||
    param.event_type ||
    param.action ||
    "";
  const event = String(rawEvent).toUpperCase().trim();

  // Extract Monetary Amount
  const rawAmount =
    param.amount ?? body.amount ?? query.amount ?? 0;
  const numAmount = Math.round(parseMonetaryAmount(rawAmount) * 100) / 100;

  // Retailer Mobile (Used ONLY to identify which retailer's wallet to check/debit)
  const rawRetailerMobile = String(
    param.mobile_no ||
      param.mobile ||
      body.mobile_no ||
      body.mobile ||
      query.mobile_no ||
      query.mobile ||
      ""
  ).trim();

  // Provider Reference / Transaction ID
  const refid = String(
    param.refid ||
      param.txnid ||
      param.txn_id ||
      param.rrn ||
      body.refid ||
      body.txnid ||
      body.txn_id ||
      query.refid ||
      query.txnid ||
      ""
  ).trim();

  // =========================================================================
  // Details of WHOSE BILL WAS PAID (Biller / Agency / Consumer / Customer)
  // =========================================================================
  const billerId = String(
    param.biller_id ||
      param.billerId ||
      param.biller_code ||
      param.agency_id ||
      param.agencyId ||
      body.biller_id ||
      body.billerId ||
      query.biller_id ||
      ""
  ).trim();

  const billerName = String(
    param.biller_name ||
      param.billerName ||
      param.agency_name ||
      param.agencyName ||
      body.biller_name ||
      body.billerName ||
      query.biller_name ||
      ""
  ).trim();

  const consumerId = String(
    param.consumer_id ||
      param.consumerId ||
      param.consumer_no ||
      param.consumerNo ||
      param.customer_id ||
      param.customerId ||
      param.agent_id ||
      param.agentId ||
      param.rider_id ||
      param.riderId ||
      param.account_no ||
      param.accountNumber ||
      param.loan_no ||
      param.ca_number ||
      body.consumer_id ||
      body.consumer_no ||
      body.account_no ||
      query.consumer_id ||
      ""
  ).trim();

  const consumerName = String(
    param.consumer_name ||
      param.consumerName ||
      param.customer_name ||
      param.customerName ||
      param.client_name ||
      param.clientName ||
      param.payer_name ||
      param.payerName ||
      param.rider_name ||
      body.consumer_name ||
      body.customer_name ||
      query.customer_name ||
      ""
  ).trim();

  const consumerMobile = String(
    param.customer_mobile ||
      param.customerMobile ||
      param.consumer_mobile ||
      param.consumerMobile ||
      param.client_mobile ||
      param.payer_mobile ||
      param.rider_mobile ||
      body.customer_mobile ||
      body.consumer_mobile ||
      query.customer_mobile ||
      ""
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

  // Resolve Retailer by 10-digit mobile
  const cleanRetailerMobile = rawRetailerMobile.replace(/\D/g, "").slice(-10);

  if (!cleanRetailerMobile || cleanRetailerMobile.length < 10) {
    console.warn(`[CMS Callback Validation Error]: Invalid or missing retailer mobile '${rawRetailerMobile}'`);
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
      { mobile: cleanRetailerMobile },
      { mobile: rawRetailerMobile },
      { mobile: `+91${cleanRetailerMobile}` },
      { mobile: `91${cleanRetailerMobile}` },
    ],
  });

  if (!user) {
    console.warn(`[CMS Callback Error]: Retailer not found with mobile '${cleanRetailerMobile}'`);
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
      const billerLabel = billerName || billerId || "CMS Biller";

      // Display name of who received the payment / whose bill was paid
      const payeeDisplayName = consumerName
        ? `${consumerName}${billerName ? ` (${billerName})` : ""}`
        : (billerName || `CMS Bill Payment (${consumerId || billerId || "Service"})`);

      // Payee Details strictly represent the Biller / Customer whose bill was paid
      // NOTE: Retailer's own mobile/shopName are deliberately excluded here
      const payee = {
        name: payeeDisplayName,
        accountHolderName: consumerName || billerName || "CMS Payee",
        bankName: billerName || "CMS Collection",
        accountNumber: consumerId || billerId || undefined,
        mobile: consumerMobile ? consumerMobile.replace(/\D/g, "").slice(-10) : undefined,
      };

      const billDetails = [
        billerLabel,
        consumerName ? `Customer: ${consumerName}` : "",
        consumerId ? `A/C: ${consumerId}` : "",
      ].filter(Boolean).join(" | ");

      const description = `CMS Bill Paid: ${billDetails} (Ref: ${refid || resolvedTxnId})`;

      // Execute atomic wallet debit with double-entry ledger & idempotency guard
      const debitResult = await processServiceWalletTransaction({
        userId: user._id,
        type: "debit",
        amount: numAmount,
        service: "CMS",
        transactionId: resolvedTxnId,
        status: "success",
        description,
        payee,
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
