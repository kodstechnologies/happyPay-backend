import User from "../model/user.model.js";

const findByMobile = async (mobile) => {
  return await User.findOne({ mobile });
};

const createUser = async (mobile, panDetails = {}) => {
  const userData = {
    mobile,
    isMobileVerified: true,
    registrationStatus: "IN_PROGRESS",
    currentRegistrationStep: "ACCOUNT",
  };

  // Add PAN details if provided
  if (panDetails.panNumber) {
    userData.panNumber = String(panDetails.panNumber).trim().toUpperCase();
  }
  if (panDetails.panDocument) {
    userData.panDocument = String(panDetails.panDocument).trim();
  }

  return await User.create(userData);
};

const verifyMobile = async (userId, panDetails = {}) => {
  const updateData = {
    isMobileVerified: true,
    registrationStatus: "IN_PROGRESS",
    currentRegistrationStep: "ACCOUNT",
  };

  // Add PAN details if provided
  if (panDetails.panNumber) {
    updateData.panNumber = String(panDetails.panNumber).trim().toUpperCase();
  }
  if (panDetails.panDocument) {
    updateData.panDocument = String(panDetails.panDocument).trim();
  }

  return await User.findByIdAndUpdate(
    userId,
    updateData,
    {
      new: true,
    }
  );
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
    {
      email,
      isEmailVerified: true,
    },
    {
      new: true,
    }
  );
};

const markEmailVerifiedByEmail = async (email) => {
  return await User.updateMany(
    { email },
    { isEmailVerified: true }
  );
};

const registeredOutletFilter = {
  outletId: { $exists: true, $nin: [null, ""] },
};

const findPendingRegisteredRetailers = async ({
  page = 1,
  limit = 10,
} = {}) => {
  const skip = (page - 1) * limit;

  const filter = {
    adminApproved: "pending",
    ...registeredOutletFilter,
  };

  const [retailers, total] = await Promise.all([
    User.find(filter)
      .select("-refreshTokens -devices")
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
  return await User.findById(retailerId).select(
    "-refreshTokens -devices"
  );
};

const updateRetailerReview = async (retailerId, payload) => {
  return await User.findOneAndUpdate(
    {
      _id: retailerId,
      adminApproved: "pending",
      ...registeredOutletFilter,
    },
    payload,
    {
      new: true,
      runValidators: true,
    }
  ).select("-refreshTokens -devices");
};

const saveRetailerRegistration = async (userId, payload) => {
  return await User.findByIdAndUpdate(
    userId,
    payload,
    {
      new: true,
      runValidators: true,
    }
  ).select("-refreshTokens -devices");
};

export {
  findByMobile,
  createUser,
  verifyMobile,
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


const updateEKYCStatus = async (userId, status, rejectionReason = null) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      eKYCStatus: status,
      eKYCRejectionReason: rejectionReason,
    },
    {
      new: true,
    }
  );
};
