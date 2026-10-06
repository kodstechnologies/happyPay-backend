import env from "../../../config/env.js";
import ApiResponse from "../../../utils/ApiResponse.js";

import {
  generateAccessToken,
  generateRefreshToken,
} from "../../../utils/jwt.js";
import { resolveUserAccess } from "../../../utils/rbac.js";
import { getBankList } from "../../external/services/provider.service.js";

import {
  findRetailerByEmail,
  findRetailerByMobile,
  createTestRetailer,
  createRetailer,
  updateLastLogin,
  addRefreshToken,
  addOrUpdateDevice,
  findUserByRefreshToken,
  removeRefreshToken,
  deactivateDevice,
  updateKycStatusToPending,
} from "../repository/auth.repository.js";

import {
  createOtp,
  deletePreviousOtps,
  findLatestOtp,
  markOtpVerified,
  incrementAttempts,
} from "../repository/otp.repository.js";


/* ==============================
   Token Payloads
============================== */

const buildAccessTokenPayload = (user, access) => ({
  userId: user._id.toString(),
  email: user.email,
  userType: "retailer",
  roles: access.roles,
  permissions: access.permissions,
});

const buildRefreshTokenPayload = (user) => ({
  userId: user._id.toString(),
  userType: "retailer",
});


/* ==============================
   Calculate Refresh Token Expiry
============================== */

const getRefreshTokenExpiry = () => {
  const expiresIn =
    env.JWT_REFRESH_EXPIRES_IN || "30d";

  const match = expiresIn.match(
    /^(\d+)([smhd])$/
  );

  if (!match) {
    return new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );
  }

  const value = Number(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(
    Date.now() + value * multipliers[unit]
  );
};


const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
};

const generateOtp = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

const assertRetailerMobile = (mobile) => {
  if (!mobile) {
    badRequest("Mobile number is required");
  }

  if (!/^[0-9]{10}$/.test(String(mobile).trim())) {
    badRequest("Please enter a valid 10-digit mobile number");
  }
};

/* ==============================
   Retailer Login — Send OTP
============================== */

const sendRetailerLoginOtp = async ({ mobile }) => {
  assertRetailerMobile(mobile);

  const normalizedMobile = String(mobile).trim();
  const user = await findRetailerByMobile(normalizedMobile);

  if (!user) {
    const error = new Error(
      "Retailer not registered. Please register first."
    );
    error.statusCode = 404;
    throw error;
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await deletePreviousOtps(normalizedMobile);
  await createOtp(normalizedMobile, otp, expiresAt);

  return {
    mobile: normalizedMobile,
    expiresInSeconds: 300,
  };
};


/* ==============================
   Retailer Login — Verify OTP
============================== */

const verifyRetailerLoginOtp = async ({
  mobile,
  otp,
  fcmToken,
  deviceId,
  platform,
  deviceName,
}) => {

  /* ==============================
     Validate Input
  ============================== */

  assertRetailerMobile(mobile);

  const normalizedMobile = String(mobile).trim();
  const normalizedOtp = String(otp || "").trim();

  if (!normalizedOtp) {
    badRequest("OTP is required");
  }

  if (!/^[0-9]{4}$/.test(normalizedOtp)) {
    badRequest("OTP must be 4 digits");
  }




  /* ==============================
     Find Retailer By Mobile
  ============================== */

  let user = await findRetailerByMobile(normalizedMobile);

  if (!user) {
    const error = new Error(
      "Retailer not registered. Please register first."
    );

    error.statusCode = 404;

    throw error;
  }


  /* ==============================
     Verify OTP
  ============================== */

  const otpRecord = await findLatestOtp(normalizedMobile);

  if (!otpRecord) {
    const error = new Error(
      "OTP not found or already verified"
    );
    error.statusCode = 401;
    throw error;
  }

  if (otpRecord.expiresAt < new Date()) {
    const error = new Error("OTP has expired");
    error.statusCode = 401;
    throw error;
  }

  if (otpRecord.attempts >= 5) {
    const error = new Error(
      "Maximum OTP attempts exceeded"
    );
    error.statusCode = 429;
    throw error;
  }

  if (otpRecord.otp !== normalizedOtp) {
    await incrementAttempts(otpRecord._id);

    const error = new Error("Invalid OTP");
    error.statusCode = 401;
    throw error;
  }

  await markOtpVerified(otpRecord._id);


  /* ==============================
     Check Account Status
  ============================== */

  if (!user.isActive) {
    const error = new Error(
      "Retailer account is inactive"
    );

    error.statusCode = 403;

    throw error;
  }

  if (user.status === "blocked") {
    const error = new Error(
      "Retailer account is blocked"
    );

    error.statusCode = 403;

    throw error;
  }

  if (user.status === "suspended") {
    const error = new Error(
      "Retailer account is suspended"
    );

    error.statusCode = 403;

    throw error;
  }





  /* ==============================
     Generate Tokens
  ============================== */

  const access = resolveUserAccess(user);
  const accessToken = generateAccessToken(buildAccessTokenPayload(user, access));
  const refreshToken = generateRefreshToken(buildRefreshTokenPayload(user));

  // Save Refresh Token
  await addRefreshToken(user._id, {
    token: refreshToken,
    deviceId: deviceId || "unknown",
    expiresAt: getRefreshTokenExpiry(),
    lastUsedAt: new Date(),
  });

  // Save Device Info if provided
  if (deviceId && platform) {
    await addOrUpdateDevice(user._id, {
      deviceId,
      fcmToken: fcmToken || "dummy",
      platform,
      deviceName,
    });
  }

  await updateLastLogin(user._id);

  return {
    user: {
      id: user._id,
      email: user.email,
      mobile: user.mobile,
      status: user.status,
      kycStatus: user.kycStatus,
      adminApproved: user.adminApproved,
      outletId: user.outletId,
      roles: access.roles,
      permissions: access.permissions,
    },
    accessToken,
    refreshToken,
  };
};




/* ==============================
   Retailer Logout
============================== */

const retailerLogout = async ({
  refreshToken,
  deviceId,
}) => {
  if (!refreshToken) {
    const error = new Error(
      "Refresh token is required"
    );

    error.statusCode = 400;

    throw error;
  }

  const user = await findUserByRefreshToken(
    refreshToken
  );

  if (!user) {
    return null;
  }

  const storedToken = user.refreshTokens.find(
    (item) => item.token === refreshToken
  );

  const logoutDeviceId =
    deviceId || storedToken?.deviceId;

  await removeRefreshToken({
    userId: user._id,
    refreshToken,
    deviceId: logoutDeviceId,
  });

  if (logoutDeviceId) {
    await deactivateDevice(
      user._id,
      logoutDeviceId
    );
  }

  return null;
};




/* ==============================
   Reapply For KYC
============================== */

const reapplyForKyc = async (userId) => {
  const updatedUser = await updateKycStatusToPending(userId);
  if (!updatedUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return {
    kycStatus: updatedUser.kycStatus,
    kycRejectionReason: updatedUser.kycRejectionReason,
  };
};

const retailerRegister = async (data) => {
  const {
    mobile,
    email,
    fcmToken,
    deviceId,
    platform,
    deviceName,
  } = data;

  if (!mobile) {
    const error = new Error("Mobile number is required");
    error.statusCode = 400;
    throw error;
  }

  let user = await findRetailerByMobile(mobile);
  if (user) {
    const error = new Error("Retailer with this mobile already exists");
    error.statusCode = 409;
    throw error;
  }

  if (email) {
    const existingEmail = await findRetailerByEmail(email);
    if (existingEmail) {
      const error = new Error("Retailer with this email already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  // Map flat validation fields to Mongoose schema structure
  const mappedData = {
    ...data,
    aadhaarNumber: data.aadhaar,
    dateOfBirth: data.dob,
    businessProofType: data.businessProof,
    bank: {
      name: data.bankName,
      ifscCode: data.ifscCode,
      accountNumber: data.accountNumber,
      confirmAccountNumber: data.confirmAccountNumber,
    }
  };

  // Create new user with all the data
  user = await createRetailer(mappedData);

  const access = resolveUserAccess(user);
  const accessToken = generateAccessToken(buildAccessTokenPayload(user, access));
  const refreshToken = generateRefreshToken(buildRefreshTokenPayload(user));

  await addRefreshToken(user._id, {
    token: refreshToken,
    deviceId: deviceId || "unknown",
    expiresAt: getRefreshTokenExpiry(),
    lastUsedAt: new Date(),
  });

  if (deviceId && fcmToken && platform) {
    await addOrUpdateDevice(user._id, {
      deviceId,
      fcmToken,
      platform,
      deviceName,
    });
  }

  await updateLastLogin(user._id);

  return {
    user: {
      id: user._id,
      email: user.email,
      mobile: user.mobile,
      status: user.status,
      kycStatus: user.kycStatus,
      roles: access.roles,
      permissions: access.permissions,
    },
    accessToken,
    refreshToken,
  };
};

export {
  sendRetailerLoginOtp,
  verifyRetailerLoginOtp,
  retailerLogout,
  retailerRegister,
  reapplyForKyc,
};