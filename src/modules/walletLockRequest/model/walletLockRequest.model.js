import mongoose from "mongoose";

const walletLockRequestSchema = new mongoose.Schema(
  {
    // User who requested wallet lock
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    retailerId: {
      type: String,
      trim: true,
    },

    // Reason for wallet lock
    reason: {
      type: String,
      trim: true,
      required: true,
      minlength: 10,
      maxlength: 500,
    },

    // Status of the lock request
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    // Rejection reason (if rejected)
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    // Admin who reviewed the request
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    // Review timestamp
    reviewedAt: {
      type: Date,
      default: null,
    },

    // Admin notes (internal)
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
walletLockRequestSchema.index({ userId: 1, status: 1 });
walletLockRequestSchema.index({ status: 1, createdAt: -1 });
walletLockRequestSchema.index({ retailerId: 1 });

const WalletLockRequest = mongoose.model("WalletLockRequest", walletLockRequestSchema);

export default WalletLockRequest;
