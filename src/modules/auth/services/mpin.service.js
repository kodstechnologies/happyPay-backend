import bcrypt from "bcrypt";
import User from "../model/user.model.js";
import {
  createOtp,
  findLatestOtp,
  markOtpVerified,
  incrementAttempts,
  deletePreviousOtps,
} from "../repository/otp.repository.js";

const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const maskMobile = (mobile = "") => {
  const str = String(mobile).trim();
  if (str.length < 4) return str;
  return `${"*".repeat(Math.max(0, str.length - 4))}${str.slice(-4)}`;
};

/**
 * Send OTP for MPIN Setup or Change
 */
export const sendMpinOtpService = async (userId) => {
  if (!userId) {
    const error = new Error("User authentication required");
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (!user.mobile) {
    const error = new Error("Registered mobile number not found for this account");
    error.statusCode = 400;
    throw error;
  }

  const mobile = String(user.mobile).trim();
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

  await deletePreviousOtps(mobile);
  await createOtp(mobile, otp, expiresAt);

  return {
    success: true,
    message: `OTP sent successfully to registered mobile ${maskMobile(mobile)}`,
    mobileMasked: maskMobile(mobile),
    expiresInSeconds: 300,
  };
};

/**
 * Verify OTP Helper
 */
const verifyMpinOtpInternal = async (mobile, candidateOtp) => {
  const normalizedOtp = String(candidateOtp || "").trim();
  const otpRecord = await findLatestOtp(mobile);

  if (!otpRecord) {
    const error = new Error("OTP not found or has expired. Please request a new OTP.");
    error.statusCode = 400;
    throw error;
  }

  if (new Date() > new Date(otpRecord.expiresAt)) {
    const error = new Error("OTP has expired. Please request a new OTP.");
    error.statusCode = 400;
    throw error;
  }

  if (otpRecord.attempts >= 5) {
    const error = new Error("Maximum OTP verification attempts exceeded. Please request a new OTP.");
    error.statusCode = 400;
    throw error;
  }

  const isTestOtp = process.env.NODE_ENV === "development" && normalizedOtp === "1234";
  const isMatch = otpRecord.otp === normalizedOtp || isTestOtp;

  if (!isMatch) {
    await incrementAttempts(otpRecord._id);
    const error = new Error("Invalid OTP. Please check and try again.");
    error.statusCode = 400;
    throw error;
  }

  await markOtpVerified(otpRecord._id);
  return true;
};

/**
 * Set Initial MPIN
 */
export const setupMpinService = async (userId, { newMpin, confirmMpin, otp }) => {
  if (!userId) {
    const error = new Error("User authentication required");
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.MPIN) {
    const error = new Error("MPIN is already configured. Please use Change MPIN to update your PIN.");
    error.statusCode = 400;
    throw error;
  }

  if (newMpin !== confirmMpin) {
    const error = new Error("New MPIN and Confirm MPIN do not match");
    error.statusCode = 400;
    throw error;
  }

  if (!/^\d{4}$/.test(newMpin)) {
    const error = new Error("MPIN must contain exactly 4 numeric digits");
    error.statusCode = 400;
    throw error;
  }

  // Compulsory OTP verification
  await verifyMpinOtpInternal(user.mobile, otp);

  // Hash new MPIN with bcrypt
  const hashedMpin = await bcrypt.hash(String(newMpin).trim(), 10);
  user.MPIN = hashedMpin;
  await user.save();

  return {
    success: true,
    message: "Transaction MPIN set successfully",
    isMpinSet: true,
  };
};

/**
 * Change or Reset MPIN
 */
export const changeMpinService = async (userId, { currentMpin, newMpin, confirmMpin, otp }) => {
  if (!userId) {
    const error = new Error("User authentication required");
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (newMpin !== confirmMpin) {
    const error = new Error("New MPIN and Confirm MPIN do not match");
    error.statusCode = 400;
    throw error;
  }

  if (!/^\d{4}$/.test(newMpin)) {
    const error = new Error("MPIN must contain exactly 4 numeric digits");
    error.statusCode = 400;
    throw error;
  }

  // If user already has an MPIN and supplied currentMpin, verify it
  if (user.MPIN && currentMpin) {
    const isCurrentValid = await bcrypt.compare(String(currentMpin).trim(), user.MPIN);
    if (!isCurrentValid) {
      const error = new Error("Current MPIN is incorrect");
      error.statusCode = 400;
      throw error;
    }
  }

  // Compulsory OTP verification for changing MPIN
  await verifyMpinOtpInternal(user.mobile, otp);

  // Hash new MPIN with bcrypt
  const hashedMpin = await bcrypt.hash(String(newMpin).trim(), 10);
  user.MPIN = hashedMpin;
  await user.save();

  return {
    success: true,
    message: "Transaction MPIN updated successfully",
    isMpinSet: true,
  };
};

/**
 * Verify MPIN (for transactions, settlements, or checks)
 */
export const verifyMpinService = async (userId, mpin) => {
  if (!userId) {
    const error = new Error("User authentication required");
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (!user.MPIN) {
    const error = new Error("Transaction MPIN is not configured. Please set up your MPIN first.");
    error.statusCode = 400;
    throw error;
  }

  const cleanMpin = String(mpin || "").trim();
  const isBcrypt =
    user.MPIN.startsWith("$2a$") ||
    user.MPIN.startsWith("$2b$") ||
    user.MPIN.startsWith("$2y$");

  const isValid = isBcrypt
    ? await bcrypt.compare(cleanMpin, user.MPIN)
    : String(user.MPIN).trim() === cleanMpin;

  if (!isValid) {
    const error = new Error("Invalid transaction MPIN");
    error.statusCode = 400;
    throw error;
  }

  // Transparent upgrade: if legacy unhashed MPIN was matched, hash it now
  if (!isBcrypt) {
    user.MPIN = await bcrypt.hash(cleanMpin, 10);
    await user.save();
  }

  return {
    isValid: true,
    message: "MPIN verified successfully",
  };
};
