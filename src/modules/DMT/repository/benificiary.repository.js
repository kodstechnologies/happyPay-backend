import Benificiary from "../models/benificiary.model.js";

/**
 * Upsert beneficiary record idempotently
 * If beneficiary exists for the remitter and account, updates metadata while preserving verification status.
 */
export const upsertBeneficiary = async ({
  name,
  ifsc,
  accountNumber,
  bankId,
  beneficiaryMobile,
  beneficiaryId = "",
  remitterMobile,
  outletid,
  verified = false,
  verificationDate = null,
}) => {
  if (!accountNumber || !remitterMobile) return null;

  const cleanAccount = String(accountNumber).trim();
  const cleanRemitterMobile = String(remitterMobile).trim();

  const updateFields = {
    outletid: String(outletid || "").trim(),
  };

  if (name) updateFields.name = String(name).trim();
  if (ifsc) updateFields.ifsc = String(ifsc).trim().toUpperCase();
  if (bankId) updateFields.bankId = String(bankId).trim();
  if (beneficiaryMobile) updateFields.beneficiaryMobile = String(beneficiaryMobile).trim();
  if (beneficiaryId) updateFields.beneficiaryId = String(beneficiaryId).trim();

  // If verified is explicitly true, update the verification fields
  if (verified === true) {
    updateFields.verified = true;
    updateFields.verificationDate = verificationDate || new Date();
  }

  return await Benificiary.findOneAndUpdate(
    {
      remitterMobile: cleanRemitterMobile,
      accountNumber: cleanAccount,
    },
    {
      $set: updateFields,
      $setOnInsert: {
        remitterMobile: cleanRemitterMobile,
        accountNumber: cleanAccount,
        verified: Boolean(verified),
        verificationDate: verified ? (verificationDate || new Date()) : null,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

/**
 * Update Beneficiary verification status upon successful account or OTP verification
 */
export const updateBeneficiaryVerificationStatus = async ({
  beneficiaryId,
  accountNumber,
  remitterMobile,
  verified = true,
}) => {
  const filter = {};
  if (beneficiaryId) {
    filter.beneficiaryId = String(beneficiaryId).trim();
  } else if (accountNumber) {
    filter.accountNumber = String(accountNumber).trim();
    if (remitterMobile) {
      filter.remitterMobile = String(remitterMobile).trim();
    }
  } else {
    return null;
  }

  const updateFields = {
    verified: Boolean(verified),
    verificationDate: verified ? new Date() : null,
  };

  return await Benificiary.updateMany(filter, { $set: updateFields });
};

/**
 * Find beneficiary by account number and optional remitter mobile
 */
export const findBeneficiaryByAccount = async ({ accountNumber, remitterMobile }) => {
  if (!accountNumber) return null;
  const filter = { accountNumber: String(accountNumber).trim() };
  if (remitterMobile) {
    filter.remitterMobile = String(remitterMobile).trim();
  }
  return await Benificiary.findOne(filter).lean();
};

/**
 * Find all beneficiaries for a remitter
 */
export const findBeneficiariesByRemitter = async (remitterMobile) => {
  if (!remitterMobile) return [];
  return await Benificiary.find({ remitterMobile: String(remitterMobile).trim() }).lean();
};

/**
 * Delete beneficiary record from database after provider deletion completes
 */
export const deleteBeneficiaryRecord = async ({ beneficiaryId, remitterMobile }) => {
  if (!beneficiaryId) return null;

  const filter = { beneficiaryId: String(beneficiaryId).trim() };
  if (remitterMobile) {
    filter.remitterMobile = String(remitterMobile).trim();
  }

  return await Benificiary.deleteMany(filter);
};

export default {
  upsertBeneficiary,
  updateBeneficiaryVerificationStatus,
  findBeneficiaryByAccount,
  findBeneficiariesByRemitter,
  deleteBeneficiaryRecord,
};
