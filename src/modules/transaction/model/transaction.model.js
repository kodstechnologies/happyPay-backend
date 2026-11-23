import mongoose from "mongoose";
import generate15CharTxnId from "../../../utils/generateTxnId.js";

const transactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit", ""],
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      default: () => generate15CharTxnId("TXN"),
    },


    // ── Provider references ──────────────────────────────────────────────────
    /** Provider-generated transaction ID (e.g. TXN8E43FBC1DDE3) */
    providerTxnId: {
      type: String,
      default: null,
      index: true, // needed for fast callback lookup
    },
    /** Raw status string last reported by provider (PENDING / SUCCESS / FAILED …) */
    providerStatus: {
      type: String,
      default: null,
    },
    /** Full JSON response received at initiation */
    providerInitResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    /** Full JSON payload received in the most recent callback */
    providerCallbackPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    /** Timestamp when the last callback was received */
    callbackReceivedAt: {
      type: Date,
      default: null,
    },
    // ── Financial precision ──────────────────────────────────────────────────
    /** Net amount actually debited / to be debited (PAYOUT: amount + charges + retailerCommission) */
    netDebitAmount: {
      type: Number,
      default: null,
    },
    /** Distributor commission cached for callback re-use */
    distributorCommission: {
      type: Number,
      default: 0,
    },
    /** Distributor user ID cached for callback re-use */
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // ── Bank transfer references ─────────────────────────────────────────────
    /** Bank UTR / RRN received in callback or initiation */
    utr: {
      type: String,
      default: null,
    },
    /** Provider operator / bank reference ID */
    operatorId: {
      type: String,
      default: null,
    },
    /** Transfer mode (IMPS / NEFT / RTGS) */
    paymentMode: {
      type: String,
      default: null,
    },
    /** Failure reason from provider */
    failureReason: {
      type: String,
      default: null,
    },

    payee: {
      name: String,
      mobile: String,
      shopName: String,
      bankName: String,
      aadharNumber: String,
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
    },
    razorpay_order_id: {
      type: String,
      default: null,
    },
    razorpay_payment_id: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
    },
    balanceAfter: {
      type: Number,
    },
    service: {
      type: String,
      enum: ["AEPS", "DMT", "UPI", "CMS", "PAYOUT", "MANUAL", "COMMISSION", "BBPS", "RAZORPAY", "SETTLEMENT", "PLAN_SUBSCRIPTION", "FUND_REQUEST"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "reversed"],
      default: "pending",
    },
    description: {
      type: String,
    },
    commissionEarned: {
      type: Number,
      default: 0,
    },
    charges: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionBreakdown: {
      providerCharge: { type: Number, default: 0 },
      adminCommission: { type: Number, default: 0 },
      distributorCommission: { type: Number, default: 0 },
      retailerCommission: { type: Number, default: 0 },
      totalCommission: { type: Number, default: 0 },
      totalChargesDeducted: { type: Number, default: 0 },
      distributorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for high performance
transactionSchema.index({ wallet: 1, createdAt: -1 });
transactionSchema.index({ wallet: 1, service: 1, createdAt: -1 });
transactionSchema.index({ wallet: 1, status: 1, createdAt: -1 });
transactionSchema.index({ wallet: 1, type: 1, createdAt: -1 });
// Payout callback lookup index
transactionSchema.index({ providerTxnId: 1, service: 1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
