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
    referenceKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    payee: {
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
      enum: ["AEPS", "DMT", "UPI", "CMS", "PAYOUT", "MANUAL", "COMMISSION", "BBPS", "RAZORPAY"],
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

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
