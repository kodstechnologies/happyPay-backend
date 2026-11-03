import Otp from "../model/otp.model.js";

const createOtp = async (mobile, otp, expiresAt, role = "retailer") => {
  const testOtp = process.env.NODE_ENV === "development"
    ? String(otp).length === 4
      ? "1234"
      : "123456"
    : otp;

  console.log("Creating OTP", mobile, testOtp, expiresAt, role);

  return await Otp.create({
    mobile,
    otp: testOtp,
    expiresAt,
    role,
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

const checkMobileOtpVerified = async (mobile) => {
  
  const verifiedOtp = await Otp.findOne({
    mobile,
    isVerified: true,
  }).sort({ updatedAt: -1 });
  return !!verifiedOtp;
};

export {
  createOtp,
  findLatestOtp,
  markOtpVerified,
  incrementAttempts,
  deletePreviousOtps,
  checkMobileOtpVerified,
};