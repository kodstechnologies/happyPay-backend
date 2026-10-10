import { asyncHandler } from '../../../utils/asyncHandler.js';
import {
  sendEmailOtp,
  verifyEmailOtp,
} from "../services/emailOtp.service.js";

import { ApiResponse } from "../../../utils/ApiResponse.js";
import { findByEmail } from "../repository/user.repository.js";

export const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if email is already registered
  const existingUser = await findByEmail(email);
  if (existingUser) {
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
  const { email, otp } = req.body;

  const data = await verifyEmailOtp(email, otp);

  const response = ApiResponse.success(
    data,
    "Email verified successfully",
    null,
    200
  );
  return res.status(response.statusCode).json(response);
});

