import mongoose from "mongoose";

const fundRequestSchema = new mongoose.Schema(
  {
    // =========================
    // Retailer Information
    // =========================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    retailerId: {
      type: String,
      trim: true,
    },

    // =========================
    // Payment Details
    // =========================a
    paymentMode: {
      type: String,
      required: true,
      trim: true,
      enum: ["UPI", "NEFT", "IMPS", "RTGS", "CASH", "CHEQUE", "OTHER"],
    },

    rrn: {
      type: String,
      trim: true,
      // RRN is optional for some payment modes
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentDate: {
      type: Date,
      required: true,
    },

    bank: {
      type: String,
      trim: true,
      required: true,
    },

    ifscCode: {
      type: String,
      trim: true,
      required: true,
      uppercase: true,
    },

    accountNumber: {
      type: String,
      trim: true,
      required: true,
    },

    branchName: {
      type: String,
      trim: true,
      required: true,
    },

    // =========================
    // Proof/Receipt
    // =========================
    receiptSlip: {
      type: String,
      trim: true,
      required: true,
    },

    // =========================
    // Additional Notes
    // =========================
    notes: {
      type: String,
      trim: true,
      default: null,
    },

    // =========================
    // Status & Approval
    // =========================
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    // =========================
    // Admin Notes (internal)
    // =========================
    adminNotes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
fundRequestSchema.index({ userId: 1, status: 1 });
fundRequestSchema.index({ status: 1, createdAt: -1 });
fundRequestSchema.index({ retailerId: 1 });

const FundRequest = mongoose.model("FundRequest", fundRequestSchema);

export default FundRequest;
