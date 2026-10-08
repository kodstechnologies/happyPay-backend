import User from "../../auth/model/user.model.js";
import AepsEkyc from "../model/aepsEkyc.model.js";

/* ==============================
   Find Retailer By ID
============================== */

const findRetailerById = async (retailerId) => {
  return await User.findById(retailerId).select(
    "aadhaarNumber panNumber fullName mobile email outletId"
  );
};

const saveAepsEkyc = async ({ userId, outletId, referenceKey, pidOptionWadh }) => {
  return AepsEkyc.findOneAndUpdate(
    { userId },
    { userId, outletId, referenceKey, pidOptionWadh },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
};

const findAepsEkycByUserId = async (userId) => {
  return AepsEkyc.findOne({ userId });
};

export { findRetailerById, saveAepsEkyc, findAepsEkycByUserId };
