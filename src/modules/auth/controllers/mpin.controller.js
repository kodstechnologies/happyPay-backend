import { asyncHandler } from "../../../utils/asyncHandler.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import {
  sendMpinOtpService,
  setupMpinService,
  changeMpinService,
  verifyMpinService,
} from "../services/mpin.service.js";

export const sendMpinOtpController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?._id;
  const result = await sendMpinOtpService(userId);

  return res.status(200).json(
    ApiResponse.success(
      result,
      result.message || "OTP sent successfully",
      null,
      200
    )
  );
});

export const setupMpinController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?._id;
  const result = await setupMpinService(userId, req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      result.message || "MPIN configured successfully",
      null,
      200
    )
  );
});

export const changeMpinController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?._id;
  const result = await changeMpinService(userId, req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      result.message || "MPIN updated successfully",
      null,
      200
    )
  );
});

export const verifyMpinController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?._id;
  const result = await verifyMpinService(userId, req.body.mpin);

  return res.status(200).json(
    ApiResponse.success(
      result,
      result.message || "MPIN verified successfully",
      null,
      200
    )
  );
});
