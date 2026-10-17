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

const saveAepsEkyc = async ({ userId, outletId, referenceKey, pidOptionWadh, eKYCStatus }) => {
  const updateData = {
    userId,
    ...(outletId ? { outletId: String(outletId).trim() } : {}),
    ...(referenceKey ? { referenceKey: String(referenceKey).trim() } : {}),
    ...(pidOptionWadh !== undefined ? { pidOptionWadh: pidOptionWadh ? String(pidOptionWadh).trim() : null } : {}),
    ...(eKYCStatus ? { eKYCStatus } : {}),
  };

  const saved = await AepsEkyc.findOneAndUpdate(
    { userId },
    updateData,
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  // Keep the User.AepsEkyc reference in sync
  await User.findByIdAndUpdate(userId, { AepsEkyc: saved._id });

  return saved;
};

const findAepsEkycByUserId = async (userId) => {
  return AepsEkyc.findOne({ userId });
};

export { findRetailerById, saveAepsEkyc, findAepsEkycByUserId };

