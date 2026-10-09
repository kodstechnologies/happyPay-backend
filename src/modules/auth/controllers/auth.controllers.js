import { asyncHandler } from '../../../utils/asyncHandler.js';
import {
  sendRetailerLoginOtp as sendRetailerLoginOtpService,
  verifyRetailerLoginOtp as verifyRetailerLoginOtpService,
  retailerLogout,
  retailerRegister,
  reapplyForKyc,
  getRetailerDetailsService,
} from "../services/auth.services.js";

import ApiResponse from "../../../utils/ApiResponse.js";
import cloudinary from "../../../config/cloudinary.js";
import logger from "../../../utils/logger.js";
import { getBankList } from "../../external/services/provider.service.js";

const retailerFileFields = [
  "selfie",
  "panDocument",
  "aadhaarDocument",
  "shopInsidePhoto",
  "shopOutsidePhoto",
  "shopLocationPhoto",
  "businessProofDocument",
];

const uploadedRetailerFiles = (files = {}) =>
  retailerFileFields.flatMap((field) => files[field] || []);

const cloudinaryResourceType = (fileUrl = "") =>
  String(fileUrl).match(/\/(image|raw|video)\/upload\//)?.[1] || "image";

const removeUploadedRetailerFiles = async (files = []) => {
  await Promise.all(
    files.map(async (file) => {
      if (!file?.filename) {
        return;
      }

      try {
        await cloudinary.uploader.destroy(file.filename, {
          resource_type: cloudinaryResourceType(file.path),
          invalidate: true,
        });
      } catch (cleanupError) {
        logger.error(
          `Cloudinary cleanup failed for ${file.filename}`,
          cleanupError
        );
      }
    })
  );
};


const sendRetailerLoginOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    const data = await sendRetailerLoginOtpService({
      mobile,
    });

    return res.status(200).json(
      ApiResponse.success(
        data,
        "OTP sent successfully"
      )
    );
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(
        ApiResponse.error(
          error.message || "Failed to send OTP"
        )
      );
  }
};

const verifyRetailerLoginOtp = async (req, res) => {
  try {
    const {
      mobile,
      otp,
      fcmToken,
      deviceId,
      platform,
      deviceName,
    } = req.body;

    const data = await verifyRetailerLoginOtpService({
      mobile,
      otp,
      fcmToken,
      deviceId,
      platform,
      deviceName,
    });

    return res.status(200).json(
      ApiResponse.success(
        data,
        "Login successful"
      )
    );
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(
        ApiResponse.error(
          error.message || "Login failed"
        )
      );
  }
};


const logoutRetailer = async (
  req,
  res
) => {
  const {
    refreshToken,
    deviceId,
  } = req.body;

  await retailerLogout({
    refreshToken,
    deviceId,
  });

  return res
    .status(200)
    .json(
      ApiResponse.success(
        null,
        "Logout successful"
      )
    );
};

const registerRetailer = asyncHandler(async (req, res) => {
  const files = uploadedRetailerFiles(req.files);

  try {
    const documents = Object.fromEntries(
      retailerFileFields.map((field) => [
        field,
        req.files?.[field]?.[0]?.path || "",
      ])
    );

    const data = await retailerRegister({
      ...req.body,
      ...documents,
    });

    return res.status(201).json(
      ApiResponse.success(
        data,
        "Retailer registered successfully",
        null,
        201
      )
    );
  } catch (error) {
    await removeUploadedRetailerFiles(files);
    throw error;
  }
});

const getBankListController = asyncHandler(async (req, res) => {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );

    const result = await getBankList({
      page,
      limit,
    });

    return res.status(200).json(
      ApiResponse.success(
        result.data,
        "Bank list fetched successfully",
        result.meta
      )
    );
  } catch (error) {
    console.error(
      "Bank list fetching error:",
      error.message
    );

    console.error(
      "Provider response:",
      error.response?.data
    );

    const providerStatus = error.response?.status;

    const statusCode =
      providerStatus >= 400 &&
        providerStatus < 500
        ? providerStatus
        : 502;

    const message =
      error.response?.data?.msg ||
      error.response?.data?.message ||
      "Failed to fetch bank list";

    return res.status(statusCode).json(
      ApiResponse.error(
        message,
        error.response?.data || null
      )
    );
  }
});


export {
  sendRetailerLoginOtp,
  verifyRetailerLoginOtp,
  logoutRetailer,
  registerRetailer,
  getBankListController,
  getRetailerDetails,
};


const getRetailerDetails = asyncHandler(async (req, res) => {
  const { retailerId } = req.params;
  const { registrationStatus } = req.query;

  const retailer = await getRetailerDetailsService(retailerId, registrationStatus);

  return res.status(200).json(
    ApiResponse.success(
      retailer,
      "Retailer details retrieved successfully",
      null,
      200
    )
  );
});
