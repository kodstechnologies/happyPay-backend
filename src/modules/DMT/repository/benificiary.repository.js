import Benificiary from "../models/benificiary.model.js";

export const getBenificiary=async(payload)=>{
   return await Benificiary.find(payload)
}

/**
 * Check if beneficiary exists for remitter; update if exists, create if new.
 * Guarantees duplicate prevention and preserves verified status.
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
  referenceKey
}) => {
  if (!accountNumber || !remitterMobile) return null;

  const cleanAccount = String(accountNumber).trim();
  const cleanRemitterMobile = String(remitterMobile).trim();
  const cleanBeneficiaryId = String(beneficiaryId || "").trim();

  // 1. Explicit Check: Does this beneficiary already exist for this remitter?
  const existing = await Benificiary.findOne({
    remitterMobile: cleanRemitterMobile,
    $or: [
      { accountNumber: cleanAccount },
      ...(cleanBeneficiaryId ? [{ beneficiaryId: cleanBeneficiaryId }] : []),
    ],
  });

  if (existing) {
    // Beneficiary already exists for this remitter -> Update record
    const updateFields = {
      outletid: String(outletid || existing.outletid || "").trim(),
      name: String(name || existing.name || "").trim(),
      ifsc: String(ifsc || existing.ifsc || "").trim().toUpperCase(),
      bankId: String(bankId || existing.bankId || "").trim(),
      beneficiaryMobile: String(beneficiaryMobile || existing.beneficiaryMobile || "").trim(),
      referenceKey
    };

    if (cleanBeneficiaryId) {
      updateFields.beneficiaryId = cleanBeneficiaryId;
    }

    // Preserve verified status if already verified, or update if verified now
    if (verified === true || existing.verified === true) {
      updateFields.verified = true;
      updateFields.verificationDate = existing.verificationDate || verificationDate || new Date();
    }

    const updated = await Benificiary.findByIdAndUpdate(
      existing._id,
      { $set: updateFields },
      { new: true }
    );

    return { beneficiary: updated, isNew: false };
  }

  // 2. Beneficiary does not exist for this remitter -> Create new record
  const created = await Benificiary.create({
    name: String(name || "").trim(),
    ifsc: String(ifsc || "").trim().toUpperCase(),
    accountNumber: cleanAccount,
    bankId: String(bankId || "").trim(),
    beneficiaryMobile: String(beneficiaryMobile || "").trim(),
    beneficiaryId: cleanBeneficiaryId,
    remitterMobile: cleanRemitterMobile,
    outletid: String(outletid || "").trim(),
    verified: Boolean(verified),
    verificationDate: verified ? (verificationDate || new Date()) : null,
    referenceKey
  });

  return { beneficiary: created, isNew: true };
};

export const checkAndSaveBeneficiary = upsertBeneficiary;

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
  checkAndSaveBeneficiary,
  updateBeneficiaryVerificationStatus,
  findBeneficiaryByAccount,
  findBeneficiariesByRemitter,
  deleteBeneficiaryRecord,
};
