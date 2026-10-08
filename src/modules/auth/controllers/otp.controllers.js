import * as otpService from "../services/otp.services.js";
import { findByMobile } from "../repository/user.repository.js";
import ApiResponse from "../../../utils/ApiResponse.js";

const sendOtp = async (req, res, next) => {
  try {
    const { mobile } = req.body;

    // Check if mobile number is already registered
    const existingUser = await findByMobile(mobile);
    if (existingUser) {
      const response = ApiResponse.error(
        "Mobile number is already registered",
        null,
        null,
        409
      );
      return res.status(response.statusCode).json(response);
    }

    const result = await otpService.sendOtp(mobile);

    const response = ApiResponse.success(
      result,
      "OTP sent successfully",
      null,
      200
    );
    return res.status(response.statusCode).json(response);
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;

    const result = await otpService.verifyOtp(mobile, otp);

    const response = ApiResponse.success(
      result,
      "OTP verified successfully",
      null,
      200
    );
    return res.status(response.statusCode).json(response);
  } catch (error) {
    next(error);
  }
};

export {
  sendOtp,
  verifyOtp,
};