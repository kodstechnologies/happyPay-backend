import mongoose from "mongoose";

/**
 * UPI Cashpoint Transaction Model (Mock)
 *
 * Stores mock transaction data generated when external API calls
 * are bypassed. Each record represents a UPI Cashpoint payment
 * initiation with QR code, transaction ID, and status.
 */

const upiTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    merchantId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    txnid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    qrString: {
      type: String,
      default: "",
    },
    rrn: {
      type: String,
      default: "",
    },
    latitude: {
      type: String,
      default: "",
    },
    longitude: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["INITIATED", "PAID", "FAILED", "EXPIRED"],
      default: "INITIATED",
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for user + status queries
upiTransactionSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default mongoose.model("UpiTransaction", upiTransactionSchema);
