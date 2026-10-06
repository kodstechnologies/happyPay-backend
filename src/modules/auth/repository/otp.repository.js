import Otp from "../model/otp.model.js";

const createOtp = async (mobile, otp, expiresAt) => {
  const testOtp = process.env.NODE_ENV === "development"
    ? String(otp).length === 4
      ? "1234"
      : "123456"
    : otp;

  console.log("Creating OTP", mobile, testOtp, expiresAt);

  return await Otp.create({
    mobile,
    otp: testOtp,
    expiresAt,
  });
};

const findLatestOtp = async (mobile) => {
  return await Otp.findOne({
    mobile,
    isVerified: false,
  }).sort({ createdAt: -1 });
};

const markOtpVerified = async (otpId) => {
  return await Otp.findByIdAndUpdate(
    otpId,
    {
      isVerified: true,
    },
    {
      new: true,
    }
  );
};

const incrementAttempts = async (otpId) => {
  return await Otp.findByIdAndUpdate(
    otpId,
    {
      $inc: { attempts: 1 },
    },
    {
      new: true,
    }
  );
};

const deletePreviousOtps = async (mobile) => {
  return await Otp.deleteMany({
    mobile,
    isVerified: false,
  });
};

export {
  createOtp,
  findLatestOtp,
  markOtpVerified,
  incrementAttempts,
  deletePreviousOtps,
};