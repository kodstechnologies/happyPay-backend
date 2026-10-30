import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";
import {
  initiateUpiCashpointService,
  merchantRegistrationService,
  merchantRegistrationSendOtpService,
  merchantRegistrationVerifyService,
  sellerOnboardingService,
  merchantEkycService,
} from "../services/upiCashpoint.service.js";

/**
 * Controller to initiate UPI Cashpoint payment
 */
const initiateUpiCashpointController = asyncHandler(async (req, res) => {
  const txnid = req.body.txnid || generate15CharTxnId("TXN");
  const merchantLoginId =
    req.body.merchantLoginId ||
    req.user?.outletid ||
    req.user?.outletId ||
    req.user?.mobile ||
    req.user?.userId ||
    "HAPPY_PAY_MERCHANT";

  const payload = {
    ...req.body,
    txnid,
    merchantLoginId: String(merchantLoginId).trim(),
  };

  const result = await initiateUpiCashpointService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "UPI Cashpoint transaction initiated successfully"
    )
  );
});

/**
 * Controller to send OTP for Merchant Registration
 * Strictly uses only merchantId
 */
const merchantRegistrationSendOtpController = asyncHandler(async (req, res) => {
  const { merchantId } = req.body;

  const result = await merchantRegistrationSendOtpService({ merchantId });

  return res.status(200).json(
    ApiResponse.success(
      result,
      result?.msg || result?.message || "Merchant registration OTP sent successfully"
    )
  );
});

/**
 * Controller to verify OTP for Merchant Registration
 * Strictly uses only merchantId and otp
 */
const merchantRegistrationVerifyController = asyncHandler(async (req, res) => {
  const { merchantId, otp } = req.body;

  const result = await merchantRegistrationVerifyService({ merchantId, otp });

  return res.status(200).json(
    ApiResponse.success(
      result,
      result?.msg || result?.message || "Merchant registration verified successfully"
    )
  );
});

/**
 * Controller for Merchant Registration
 * Extracts userId from req.body and registers merchant with external provider
 */
const merchantRegistrationController = asyncHandler(async (req, res) => {
  const userId =
    req.body?.userId ||
    req.body?.userid ||
    req.user?.userId ||
    req.user?.id ||
    req.user?._id;

  if (!userId) {
    return res.status(400).json(
      ApiResponse.error("User ID is required in request body", null, null, 400)
    );
  }

  const clientIp =
    req.body?.ipaddress ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "127.0.0.1";

  const result = await merchantRegistrationService({
    userId,
    overrides: req.body,
    clientIp,
  });

  return res.status(200).json(
    ApiResponse.success(
      result,
      result?.msg || result?.message || "Merchant registered successfully"
    )
  );
});

/**
 * Controller for Seller Onboarding
 * Strictly passes only (osVersion, osType, appVersion, deviceFingerprint, ipaddress, longitude, latitude, merchantId)
 */
const sellerOnboardingController = asyncHandler(async (req, res) => {
  const {
    osVersion,
    osType,
    appVersion,
    deviceFingerprint,
    ipaddress,
    longitude,
    latitude,
    merchantId,
  } = req.body;

  const result = await sellerOnboardingService({
    osVersion,
    osType,
    appVersion,
    deviceFingerprint,
    ipaddress,
    longitude,
    latitude,
    merchantId,
  });

  return res.status(200).json(
    ApiResponse.success(
      result,
      result?.msg || result?.message || "Seller onboarded successfully"
    )
  );
});

/**
 * Controller for Merchant eKYC
 * Strictly uses only merchantId and pidData
 */
const merchantEkycController = asyncHandler(async (req, res) => {
  const { merchantId, pidData } = req.body;

  const result = await merchantEkycService({ merchantId, pidData });

  return res.status(200).json(
    ApiResponse.success(
      result,
      result?.msg || result?.message || "Merchant eKYC completed successfully"
    )
  );
});

export {
  initiateUpiCashpointController,
  merchantRegistrationController,
  merchantRegistrationSendOtpController,
  merchantRegistrationVerifyController,
  sellerOnboardingController,
  merchantEkycController,
};
