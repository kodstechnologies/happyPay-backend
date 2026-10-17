import mongoose from "mongoose";

const aepsEkycSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    outletId: {
      type: String,
      required: true,
      trim: true,
    },
    referenceKey: {
      type: String,
      trim: true,
      default: null,
    },
    pidOptionWadh: {
      type: String,
      trim: true,
      default: null,
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

export default mongoose.model("AepsEkyc", aepsEkycSchema);
