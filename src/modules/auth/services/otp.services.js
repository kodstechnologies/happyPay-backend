import {
    createOtp,
    findLatestOtp,
    markOtpVerified,
    incrementAttempts,
    deletePreviousOtps,
  } from "../repository/otp.repository.js";
  
  import {
    findByMobile,
    createUser,
    verifyMobile,
  } from "../repository/user.repository.js";
  
  const generateOtp = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };
  
  const sendOtp = async (mobile) => {
    // Generate OTP
    const otp = generateOtp();
  
    // OTP valid for 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
    // Remove previous active OTPs
    await deletePreviousOtps(mobile);
  
    // Save new OTP
    await createOtp(mobile, otp, expiresAt);
  
    // TODO:
    // Integrate SMS provider here.
    //
    // Example:
    // await smsService.sendOtp(mobile, otp);
  
    return {
      message: "OTP sent successfully",
    };
  };
  
  const verifyOtp = async (mobile, otp) => {
    const otpRecord = await findLatestOtp(mobile);
  
    if (!otpRecord) {
      throw new Error("OTP not found or expired");
    }
  
    if (otpRecord.expiresAt < new Date()) {
      throw new Error("OTP has expired");
    }
  
    // Maximum 5 attempts
    if (otpRecord.attempts >= 5) {
      throw new Error("Maximum OTP attempts exceeded");
    }
  
    // Wrong OTP
    if (otpRecord.otp !== otp) {
      await incrementAttempts(otpRecord._id);
  
      throw new Error("Invalid OTP");
    }
  
    // Mark OTP verified
    await markOtpVerified(otpRecord._id);
  
    // Find retailer
    let user = await findByMobile(mobile);
  
    // If retailer doesn't exist, create one
    if (!user) {
      user = await createUser(mobile);
    } else {
      // Existing retailer
      user = await verifyMobile(user._id);
    }
  
    return {
      user,
    };
  };
  
  export {
    sendOtp,
    verifyOtp,
  };