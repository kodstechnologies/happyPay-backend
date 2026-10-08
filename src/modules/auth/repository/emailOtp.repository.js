import EmailOtp from "../model/EmailOtp.model.js";


const findLatestOtp = async (email) => {
  return await EmailOtp.findOne({
    email,
    isVerified: false,
  }).sort({
    createdAt: -1,
  });
};


const deleteExistingOtps = async (email) => {
  return await EmailOtp.deleteMany({
    email,
    isVerified: false,
  });
};


const createOtp = async (data) => {
  return await EmailOtp.create(data);
};


const markOtpVerified = async (otpRecord) => {
  otpRecord.isVerified = true;
  otpRecord.verifiedAt = new Date();

  return await otpRecord.save();
};

const findVerifiedOtp = async (email) => {
  return await EmailOtp.findOne({
    email,
    isVerified: true,
  }).sort({
    verifiedAt: -1,
  });
};

const checkEmailOtpVerified = async (email) => {
  const verifiedOtp = await EmailOtp.findOne({
    email,
    isVerified: true,
  }).sort({ verifiedAt: -1 });

  return !!verifiedOtp;
};


export {
  findLatestOtp,
  deleteExistingOtps,
  createOtp,
  markOtpVerified,
  findVerifiedOtp,
  checkEmailOtpVerified,
};