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
    const { mobile, otp, panNumber } = req.body;
    const panDocument = req.file?.path || req.body.panDocument || null;

    // Check if PAN document file is uploaded (since Joi can't validate files)
    if (!panDocument) {
      const response = ApiResponse.error(
        "PAN document file is required",
        null,
        null,
        400
      );
      return res.status(response.statusCode).json(response);
    }

    const result = await otpService.verifyOtp(mobile, otp, { panNumber, panDocument });

    const response = ApiResponse.success(
      result,
      "OTP verified successfully",
      null,
      200
    );
    return res.status(response.statusCode).json(response);
  } catch (error) {
    // Handle specific OTP-related errors with appropriate status codes
    if (error.message === "OTP not found or expired") {
      const response = ApiResponse.error(
        "OTP not found or has expired. Please request a new OTP",
        null,
        null,
        404
      );
      return res.status(response.statusCode).json(response);
    }

    if (error.message === "OTP has expired") {
      const response = ApiResponse.error(
        "OTP has expired. Please request a new OTP",
        null,
        null,
        410
      );
      return res.status(response.statusCode).json(response);
    }

    if (error.message === "Maximum OTP attempts exceeded") {
      const response = ApiResponse.error(
        "Maximum OTP verification attempts exceeded. Please request a new OTP",
        null,
        null,
        429
      );
      return res.status(response.statusCode).json(response);
    }

    if (error.message === "Invalid OTP") {
      const response = ApiResponse.error(
        "Invalid OTP. Please enter the correct OTP",
        null,
        null,
        400
      );
      return res.status(response.statusCode).json(response);
    }

    // For any other errors, pass to global error handler
    next(error);
  }
};

export {
  sendOtp,
  verifyOtp,
};