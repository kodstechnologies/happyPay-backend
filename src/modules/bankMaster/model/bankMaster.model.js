import mongoose from "mongoose";

const bankMasterSchema = new mongoose.Schema(
  {
    bankName: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, lowercase: true, unique: true },
    aeps: {
      bankId: { type: String, trim: true, default: null },
      iin: { type: String, trim: true, default: null },
      enabled: { type: Boolean, default: false },
    },
    payout: {
      bankCode: { type: String, trim: true, default: null },
      enabled: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    lastSyncedAt: { type: Date, default: null },
    syncSource: { type: String, enum: ["aeps", "payout", "both"], default: null },
  },
  { timestamps: true }
);

bankMasterSchema.index({ isActive: 1 });
bankMasterSchema.index({ "aeps.enabled": 1 });
bankMasterSchema.index({ "payout.enabled": 1 });

const BankMaster = mongoose.model("BankMaster", bankMasterSchema);
export default BankMaster;
