import mongoose from "mongoose";

/**
 * Stores the bank account details attached to a fund request.
 * Extracted into its own collection so the FundRequest document
 * stays lean and bank details can be queried or updated independently.
 */
const fundRequestBankSchema = new mongoose.Schema(
  {
    // The fund request this bank record belongs to.
    // Set after the FundRequest document is created.
    fundRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FundRequest",
      default: null,
    },

    bank: {
      type: String,
      trim: true,
      required: true,
    },

    // Provider/payout bank code picked from the bank list (e.g. wallet banklist `code`).
    bankCode: {
      type: String,
      trim: true,
      default: null,
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
  },
  {
    timestamps: true,
  }
);

fundRequestBankSchema.index({ fundRequestId: 1 });

const FundRequestBank = mongoose.model("FundRequestBank", fundRequestBankSchema);

export default FundRequestBank;
