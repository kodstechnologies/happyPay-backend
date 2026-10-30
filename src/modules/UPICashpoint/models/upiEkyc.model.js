import mongoose from "mongoose";

const upiEkycSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    merchantId: {
      type: String,
      required: true,
      trim: true,
    },
    eKYCStatus: {
      type: String,
      enum: ["PENDING", "ACTION_REQUIRED", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    eKYCRejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("UpiEkyc", upiEkycSchema);
