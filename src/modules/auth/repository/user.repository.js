import User from "../model/user.model.js";
import AepsEkyc from "../../AEPS/model/aepsEkyc.model.js";

const findByMobile = async (mobile) => {
  return await User.findOne({ mobile });
};

const createUser = async (mobile) => {
  const userData = {
    mobile,
    isMobileVerified: true,
    registrationStatus: "IN_PROGRESS",
    currentRegistrationStep: "ACCOUNT",
  };

  return await User.create(userData);
};

const verifyMobile = async (userId) => {
  const updateData = {
    isMobileVerified: true,
    registrationStatus: "IN_PROGRESS",
    currentRegistrationStep: "ACCOUNT",
  };

  return await User.findByIdAndUpdate(userId, updateData, { new: true });
};

const findByEmail = async (email) => {
  return await User.findOne({ email });
};

const findByPan = async (panNumber) => {
  return await User.findOne({ panNumber });
};

const findByAadhaar = async (aadhaarNumber) => {
  return await User.findOne({ aadhaarNumber });
};

const setEmailVerified = async (userId, email) => {
  return await User.findByIdAndUpdate(
    userId,
    { email, isEmailVerified: true },
    { new: true }
  );
};

const markEmailVerifiedByEmail = async (email) => {
  return await User.updateMany({ email }, { isEmailVerified: true });
};

/* ==============================
   Registration Gate Filter
   Uses AepsEkyc reference existence instead of the removed outletId field.
============================== */
const registeredOutletFilter = {
  AepsEkyc: { $exists: true, $ne: null },
};

const findPendingRegisteredRetailers = async ({ page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const filter = {
    adminApproved: "pending",
    ...registeredOutletFilter,
  };

  const [retailers, total] = await Promise.all([
    User.find(filter)
      .select("-refreshTokens -devices")
      .populate("AepsEkyc")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    retailers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const findRetailerById = async (retailerId) => {
  return await User.findById(retailerId)
    .select("-refreshTokens -devices")
    .populate("AepsEkyc");
};

const updateRetailerReview = async (retailerId, payload) => {
  return await User.findOneAndUpdate(
    {
      _id: retailerId,
      adminApproved: "pending",
      ...registeredOutletFilter,
    },
    payload,
    { new: true, runValidators: true }
  )
    .select("-refreshTokens -devices")
    .populate("AepsEkyc");
};

const saveRetailerRegistration = async (userId, payload) => {
  return await User.findByIdAndUpdate(userId, payload, {
    new: true,
    runValidators: true,
  }).select("-refreshTokens -devices");
};

const findById = async (userId) => {
  return await User.findById(userId).select("aadhaarNumber mobile");
};

/* ==============================
   Update eKYC Status — writes to AepsEkyc document, not User.
   Accepts optional extraEkycFields to allow atomic multi-field updates.
============================== */
const updateEKYCStatus = async (userId, status, rejectionReason = null, extraEkycFields = {}) => {
  return AepsEkyc.findOneAndUpdate(
    { userId },
    {
      eKYCStatus: status,
      eKYCRejectionReason: rejectionReason,
      ...extraEkycFields,
    },
    { new: true, upsert: false }
  );
};

export {
  findByMobile,
  createUser,
  verifyMobile,
  findById,
  findByEmail,
  findByPan,
  findByAadhaar,
  setEmailVerified,
  markEmailVerifiedByEmail,
  saveRetailerRegistration,
  findPendingRegisteredRetailers,
  findRetailerById,
  updateRetailerReview,
  updateEKYCStatus,
};

