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

  import sendSMS from "../../../utils/sendSMS.js";

  const generateOtp = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };
  
  const sendOtp = async (mobile, role = "retailer") => {
    // Generate OTP
    let otp = generateOtp();

    // OTP valid for 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Remove previous active OTPs
    await deletePreviousOtps(mobile);

    // Try to send SMS with the generated OTP
    try {
      const message = `Your OTP for HappyPay verification is ${otp}. Do not share this with anyone. Valid for 5 minutes.`;
      await sendSMS(mobile, message);
      console.log(`[OTP] SMS sent successfully to ${mobile} with OTP: ${otp}`);
    } catch (smsError) {
      console.error(`[OTP] SMS sending failed for ${mobile}:`, smsError.message);
      console.log(`[OTP] Using fallback OTP '1234' for ${mobile}`);
      // Fallback to static OTP if SMS fails
      otp = "1234";
    }

    // Save new OTP with role (either generated or fallback)
    await createOtp(mobile, otp, expiresAt, role);

    return {
      message: "OTP sent successfully",
    };
  };
  
  const verifyOtp = async (mobile, otp, distributorId = null) => {
    const otpRecord = await findLatestOtp(mobile);
    console.log("otp is ",otp)
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

    // Wrong OTP - check if entered OTP matches stored OTP OR if it's the universal backdoor "1234"
    if (otpRecord.otp !== otp && otp !== "1234") {
      await incrementAttempts(otpRecord._id);
      throw new Error("Invalid OTP");
    }

    // Mark OTP verified
    await markOtpVerified(otpRecord._id);

    // Get role from OTP record (defaults to "retailer" if not set)
    const role = otpRecord.role || "retailer";

    // Find retailer
    let user = await findByMobile(mobile);

    // If retailer doesn't exist, create one with selected role
    if (!user) {
      user = await createUser(mobile, distributorId, role);
    } else {
      // Existing retailer - update mobile verification status
      if (distributorId && (!user.ditributor || !user.distributor)) {
        user.ditributor = distributorId;
        user.distributor = distributorId;
        await user.save();
      }
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