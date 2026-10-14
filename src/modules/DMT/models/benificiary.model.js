import mongoose from "mongoose";

const benificiarySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ifsc: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    bankId: {
      type: String,
      required: true,
      trim: true,
    },
    beneficiaryMobile: {
      type: String,
      required: true,
      trim: true,
    },
    beneficiaryId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationDate: {
      type: Date,
      default: null,
    },
    remitterMobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    outletid: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for querying beneficiaries by remitter & account
benificiarySchema.index({ remitterMobile: 1, accountNumber: 1 }, { background: true });

const Benificiary =
  mongoose.models.benificiary || mongoose.model("benificiary", benificiarySchema);

export default Benificiary;
