import { asyncHandler } from '../../../utils/asyncHandler.js';
import {
  sendRetailerLoginOtp as sendRetailerLoginOtpService,
  verifyRetailerLoginOtp as verifyRetailerLoginOtpService,
  retailerLogout,
  retailerRegister,
  reapplyForKyc,
  getRetailerDetailsService,
  getAuthenticatedRetailerService,
  updateRetailerProfileService,
  refreshAccessToken,
  getRetailerAadhaarAndMobile,
} from "../services/auth.services.js";

import {
  updateShopDetails,
  updateAboutDetails,
  updateAadhaarDetails,
  updateBankDetailsAndOnboard,
  getCurrentRegistrationStep,
} from "../services/registration.service.js";

import ApiResponse from "../../../utils/ApiResponse.js";
import cloudinary from "../../../config/cloudinary.js";
import logger from "../../../utils/logger.js";
import { getBankList } from "../../external/services/provider.service.js";
import { validatePincode } from "../services/pincode.service.js";
import User from "../model/user.model.js";
import { parsePagination, buildPaginationMetadata, escapeRegex } from "../../../utils/queryHelpers.js";
import { getRetailerTransactions } from "../../transaction/service/transaction.service.js";

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
    // For registration incomplete or admin rejection errors, include user details in response
    if (error.statusCode === 403 && error.data) {
      return res
        .status(error.statusCode)
        .json(
          ApiResponse.error(
            error.message || "Failed to send OTP",
            error.data,
            null,
            error.statusCode
          )
        );
    }

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

    if (data?.accessToken) {
      const isProduction = process.env.NODE_ENV === "production";
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
      };

      res.cookie("accessToken", data.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      if (data?.refreshToken) {
        res.cookie("refreshToken", data.refreshToken, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
      }

      res.cookie("token", data.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });
    }

    return res.status(200).json(
      ApiResponse.success(
        data,
        "Login successful"
      )
    );
  } catch (error) {
    // Handle validation errors by including additional status information
    let errorData = null;

    // If it's an eKYC error, include the eKYC status fields in data
    if (error.eKYCStatus !== undefined) {
      errorData = {
        eKYCStatus: error.eKYCStatus,
        currentRegistrationStep: error.currentRegistrationStep
      };
    }
    
    // If it's a registration error, include the registration status fields in data
    else if (error.registrationStatus !== undefined) {
      errorData = {
        registrationStatus: error.registrationStatus,
        currentRegistrationStep: error.currentRegistrationStep
      };
    }
    
    // If it's an admin approval error, include the admin approval status fields in data
    else if (error.adminApproved !== undefined) {
      errorData = {
        adminApproved: error.adminApproved,
        reasonOfRejection: error.reasonOfRejection,
        currentRegistrationStep: error.currentRegistrationStep
      };
    }

    return res
      .status(error.statusCode || 500)
      .json(
        ApiResponse.error(
          error.message || "Login failed",
          errorData
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

const refreshAccessTokenController = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json(
      ApiResponse.error("Refresh token is required", null, null, 400)
    );
  }

  try {
    const result = await refreshAccessToken(refreshToken);
    return res.status(200).json(
      ApiResponse.success(result, "Token refreshed successfully", null, 200)
    );
  } catch (error) {
    return res
      .status(error.statusCode || 401)
      .json(
        ApiResponse.error(
          error.message || "Failed to refresh token",
          null,
          null,
          error.statusCode || 401
        )
      );
  }
});

const getRetailerAadhaarAndMobileController = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json(
      ApiResponse.error("User ID is required", null, null, 400)
    );
  }

  try {
    const result = await getRetailerAadhaarAndMobile(userId);
    return res.status(200).json(
      ApiResponse.success(result, "Aadhaar and mobile fetched successfully", null, 200)
    );
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(
        ApiResponse.error(
          error.message || "Failed to fetch Aadhaar and mobile",
          null,
          null,
          error.statusCode || 500
        )
      );
  }
});
//change
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

    // Only apply limit if explicitly provided in query
    const limit = req.query.limit
      ? Math.min(Math.max(Number(req.query.limit), 1), 500)
      : undefined;

    const result = await getBankList({
      page,
      limit,
    });
  console.log("Bank list fetched successfully:", result);
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

const getAuthenticatedRetailer = asyncHandler(async (req, res) => {
  const retailerId = req.user?.userId;
  if (!retailerId) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "User not authenticated",
    });
  }

  const retailer = await getAuthenticatedRetailerService(retailerId);

  return res.status(200).json(
    ApiResponse.success(
      retailer,
      "Authenticated retailer details retrieved successfully",
      null,
      200
    )
  );
});

const updateShopDetailsController = asyncHandler(async (req, res) => {
  const files = uploadedRetailerFiles(req.files);
  try {
    const data = await updateShopDetails(req.body, req.files || {});
    return res.status(200).json(
      ApiResponse.success(data, "Shop details updated successfully", null, 200)
    );
  } catch (error) {
    await removeUploadedRetailerFiles(files);
    throw error;
  }
});

const updateAboutDetailsController = asyncHandler(async (req, res) => {
  const data = await updateAboutDetails(req.body, req.files || {});
  return res.status(200).json(
    ApiResponse.success(data, "About details updated successfully", null, 200)
  );
});

const updateAadhaarDetailsController = asyncHandler(async (req, res) => {
  const files = uploadedRetailerFiles(req.files);
  try {
    const data = await updateAadhaarDetails(req.body, req.files || {});
    return res.status(200).json(
      ApiResponse.success(data, "Aadhaar details updated successfully", null, 200)
    );
  } catch (error) {
    await removeUploadedRetailerFiles(files);
    throw error;
  }
});

const updateBankDetailsController = asyncHandler(async (req, res) => {
  const data = await updateBankDetailsAndOnboard(req.body);
  return res.status(200).json(
    ApiResponse.success(data, "Bank details updated and registration completed successfully", null, 200)
  );
});

const getCurrentRegistrationStepController = asyncHandler(async (req, res) => {
  const { userId, mobile } = req.body;
  const data = await getCurrentRegistrationStep({ userId, mobile });
  return res.status(200).json(
    ApiResponse.success(data, "Current registration step retrieved successfully", null, 200)
  );
});

const getRetailerProfileController = asyncHandler(async (req, res) => {
  const retailerId = req.user?.userId;
  if (!retailerId) {
    return res.status(401).json(
      ApiResponse.error("User not authenticated", null, null, 401)
    );
  }

  const retailer = await getRetailerDetailsService(retailerId);

  return res.status(200).json(
    ApiResponse.success(
      retailer,
      "Retailer profile retrieved successfully",
      null,
      200
    )
  );
});

const updateRetailerProfileController = asyncHandler(async (req, res) => {
  const retailerId = req.user?.userId;
  if (!retailerId) {
    return res.status(401).json(
      ApiResponse.error("User not authenticated", null, null, 401)
    );
  }

  const updatedRetailer = await updateRetailerProfileService(
    retailerId,
    req.body,
    req.files || {}
  );

  return res.status(200).json(
    ApiResponse.success(
      updatedRetailer,
      "Retailer profile updated successfully",
      null,
      200
    )
  );
});

const validatePincodeController = asyncHandler(async (req, res) => {
  const { pincode } = req.params;
  const result = await validatePincode(pincode);

  if (!result.isValid) {
    return res.status(400).json(
      ApiResponse.error(result.message || "Invalid pincode", null, null, 400)
    );
  }

  return res.status(200).json(
    ApiResponse.success(result, "Pincode validated successfully", null, 200)
  );
});

const getDownlineRetailersController = asyncHandler(async (req, res) => {
  const distributorId = req.user?.userId;
  if (!distributorId) {
    return res.status(401).json(
      ApiResponse.error("User not authenticated", null, null, 401)
    );
  }

  const { page, limit, skip } = parsePagination(req.query);
  const query = { ditributor: distributorId };

  if (req.query.status) {
    query.status = req.query.status;
  }
  if (req.query.adminApproved) {
    query.adminApproved = req.query.adminApproved;
  }

  if (req.query.search && String(req.query.search).trim()) {
    const escaped = escapeRegex(String(req.query.search).trim().slice(0, 100));
    const regex = { $regex: escaped, $options: "i" };
    query.$or = [
      { fullName: regex },
      { email: regex },
      { mobile: regex },
      { "shop.name": regex },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select("fullName email mobile panNumber status adminApproved registrationStatus shop createdAt aadhaarVerified")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  const items = users.map((u) => {
    let statusLabel = "Pending";
    if (u.status === "blocked") statusLabel = "Blocked";
    else if (u.status === "suspended") statusLabel = "Suspended";
    else if (u.adminApproved === "approved") statusLabel = "Approved";
    else if (u.adminApproved === "rejected") statusLabel = "Rejected";
    else if (u.status === "active" && u.adminApproved === "pending") statusLabel = "Pending";
    else if (u.status === "active") statusLabel = "Active";

    return {
      id: u._id.toString(),
      name: u.fullName || u.shop?.name || "Retailer",
      mobile: u.mobile || "",
      email: u.email || "",
      shopName: u.shop?.name || "",
      status: statusLabel,
      rawStatus: u.status,
      adminApproved: u.adminApproved,
      registeredAt: u.createdAt,
    };
  });

  return res.status(200).json(
    ApiResponse.success(
      items,
      "Downline retailers retrieved successfully",
      buildPaginationMetadata(total, page, limit),
      200
    )
  );
});

const getDownlineRetailerTransactionsController = asyncHandler(async (req, res) => {
  const distributorId = req.user?.userId;
  const { id } = req.params;

  if (!distributorId) {
    return res.status(401).json(
      ApiResponse.error("User not authenticated", null, null, 401)
    );
  }

  // Ensure this retailer was registered by this distributor
  const retailer = await User.findOne({ _id: id, ditributor: distributorId }).lean();
  if (!retailer) {
    return res.status(404).json(
      ApiResponse.error("Retailer not found or not in your downline network", null, null, 404)
    );
  }

  const result = await getRetailerTransactions(id, req.query);

  return res.status(200).json(
    ApiResponse.success(
      result.transactions,
      "Retailer transactions retrieved successfully",
      result.pagination,
      200
    )
  );
});

export {
  sendRetailerLoginOtp,
  verifyRetailerLoginOtp,
  logoutRetailer,
  registerRetailer,
  refreshAccessTokenController,
  getRetailerAadhaarAndMobileController,
  getBankListController,
  getRetailerDetails,
  getAuthenticatedRetailer,
  getRetailerProfileController,
  updateRetailerProfileController,
  updateShopDetailsController,
  updateAboutDetailsController,
  updateAadhaarDetailsController,
  updateBankDetailsController,
  getCurrentRegistrationStepController,
  validatePincodeController,
  getDownlineRetailersController,
  getDownlineRetailerTransactionsController,
};

