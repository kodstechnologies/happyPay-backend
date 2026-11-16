import { asyncHandler } from '../../../utils/asyncHandler.js';
import {
  sendEmailOtp,
  verifyEmailOtp,
} from "../services/emailOtp.service.js";

import { ApiResponse } from "../../../utils/ApiResponse.js";
import { findByEmail } from "../repository/user.repository.js";

export const sendOtp = asyncHandler(async (req, res) => {
  const { email, userId, isUpdate } = req.body;

  // If this is an update request (for existing user changing email)
  if (isUpdate && userId) {
    // For profile update flow - send OTP to update email
    const { sendRetailerEmailUpdateOtp } = await import("../services/auth.services.js");
    const result = await sendRetailerEmailUpdateOtp({ userId, newEmail: email });
    
    const response = ApiResponse.success(
      result,
      "OTP sent successfully",
      null,
      200
    );
    return res.status(response.statusCode).json(response);
  }

  // For registration flow - check if email is already registered to another user
  const existingUser = await findByEmail(email);
  if (
    existingUser &&
    (!userId || existingUser._id.toString() !== String(userId))
  ) {
    const response = ApiResponse.error(
      "Email is already registered",
      null,
      null,
      409
    );
    return res.status(response.statusCode).json(response);
  }

  const data = await sendEmailOtp(email);

  const response = ApiResponse.success(
    data,
    "OTP sent successfully",
    null,
    200
  );
  return res.status(response.statusCode).json(response);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { userId, email, otp, isUpdate } = req.body;

  // If this is an update request (for existing user changing email)
  if (isUpdate && userId) {
    // For profile update flow - verify OTP to update email
    const { verifyRetailerEmailUpdateOtp } = await import("../services/auth.services.js");
    const result = await verifyRetailerEmailUpdateOtp({ userId, otp });
    
    const response = ApiResponse.success(
      result,
      "Email updated successfully",
      null,
      200
    );
    return res.status(response.statusCode).json(response);
  }

  // For registration flow
  const data = await verifyEmailOtp(email, otp, userId);

  const response = ApiResponse.success(
    data,
    "Email verified successfully",
    null,
    200
  );
  return res.status(response.statusCode).json(response);
});

