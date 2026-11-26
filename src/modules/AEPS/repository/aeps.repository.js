import User from "../../auth/model/user.model.js";
import AepsEkyc from "../model/aepsEkyc.model.js";

/* ==============================
   Find Retailer By ID
============================== */

const findRetailerById = async (retailerId) => {
  return await User.findById(retailerId)
    .select("aadhaarNumber panNumber fullName mobile email AepsEkyc")
    .populate("AepsEkyc");
};

const saveAepsEkyc = async ({
  userId,
  outletId,
  referenceKey,
  pidOptionWadh,
  eKYCStatus,
  eKYCRejectionReason,
}) => {
  const updateData = {
    userId,
    ...(outletId !== undefined && outletId !== null && String(outletId).trim() !== ""
      ? { outletId: String(outletId).trim() }
      : {}),
    ...(referenceKey !== undefined && referenceKey !== null && String(referenceKey).trim() !== ""
      ? { referenceKey: String(referenceKey).trim() }
      : {}),
    ...(pidOptionWadh !== undefined
      ? { pidOptionWadh: pidOptionWadh ? String(pidOptionWadh).trim() : null }
      : {}),
    ...(eKYCStatus ? { eKYCStatus } : {}),
    ...(eKYCRejectionReason !== undefined ? { eKYCRejectionReason } : {}),
  };

  const saved = await AepsEkyc.findOneAndUpdate(
    { userId },
    { $set: updateData },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  // Keep the User.AepsEkyc reference in sync
  await User.findByIdAndUpdate(userId, { AepsEkyc: saved._id });

  return saved;
};

const findAepsEkycByUserId = async (userId) => {
  if (!userId) return null;
  return AepsEkyc.findOne({ userId });
};

const findAepsEkycByOutletId = async (outletId) => {
  if (!outletId || String(outletId).trim() === "") return null;
  return AepsEkyc.findOne({ outletId: String(outletId).trim() });
};

export { findRetailerById, saveAepsEkyc, findAepsEkycByUserId, findAepsEkycByOutletId };

