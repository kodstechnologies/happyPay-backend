import {
  findRetailerById,
  saveAepsEkyc,
  findAepsEkycByUserId,
} from "../repository/aeps.repository.js";
import { getLoginStatus, onboardMerchant } from "../../external/services/provider.service.js";
import User from "../../auth/model/user.model.js";

const fail = (statusCode, message, meta = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.meta = meta;
  error.data = meta;
  return error;
};

const isBlank = (value) =>
  value === undefined ||
  value === null ||
  String(value).trim() === "";

const toDateOnly = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

/* ==============================
   Get Retailer KYC Details
============================== */

const getRetailerKycDetails = async (retailerId) => {
  // Validate retailer ID
  if (!retailerId) {
    const error = new Error("Retailer ID is required");
    error.statusCode = 400;
    throw error;
  }

  // Find retailer
  const retailer = await findRetailerById(retailerId);

  if (!retailer) {
    const error = new Error("Retailer not found");
    error.statusCode = 404;
    throw error;
  }

  // Return KYC details
  return {
    retailerId: retailer._id,
    aadhaarNumber: retailer.aadhaarNumber || null,
    panNumber: retailer.panNumber || null,
    outletId: retailer.AepsEkyc?.outletId || null,
    fullName: retailer.fullName || null,
    mobile: retailer.mobile || null,
    email: retailer.email || null,
  };
};

const recordEkycOutlet = async ({ userId, outletId, referenceKey, pidOptionWadh, eKYCStatus }) => {
  if (!userId) {
    const error = new Error("User id is required");
    error.statusCode = 401;
    throw error;
  }

  if (!outletId) {
    const error = new Error("Outlet id is required");
    error.statusCode = 400;
    throw error;
  }

  if (!referenceKey) {
    const error = new Error("Reference key is required");
    error.statusCode = 400;
    throw error;
  }

  return saveAepsEkyc({
    userId,
    outletId: String(outletId).trim(),
    referenceKey: String(referenceKey).trim(),
    pidOptionWadh: pidOptionWadh ? String(pidOptionWadh).trim() : undefined,
    eKYCStatus,
  });
};

const responseText = (value) => {
  if (typeof value === "string") return value.toLowerCase();
  if (!value || typeof value !== "object") return "";
  return Object.values(value).map(responseText).join(" ");
};

const isKycRequired = (providerResponse) => {
  const text = responseText(providerResponse);
  if (
    text.includes("no-action-required") ||
    text.includes("no action required") ||
    text.includes("no_action_required")
  ) {
    return false;
  }
  return (
    text.includes("action required") ||
    text.includes("action-required") ||
    text.includes("biometric authentication required") ||
    text.includes("kyc required") ||
    text.includes("biometric required") ||
    text.includes("ekyc required")
  );
};

const checkLoginStatus = async ({ userId, outletId }) => {
  if (!userId) {
    const error = new Error("User id is required");
    error.statusCode = 401;
    throw error;
  }

  const [saved, retailer] = await Promise.all([
    findAepsEkycByUserId(userId),
    findRetailerById(userId),
  ]);

  const resolvedOutletId = String(
    outletId || saved?.outletId || retailer?.AepsEkyc?.outletId || "",
  ).trim();

  if (!resolvedOutletId) {
    const error = new Error("Outlet id is required");
    error.statusCode = 400;
    throw error;
  }

  const provider = await getLoginStatus({ outlet_id: resolvedOutletId });

  return {
    outletId: resolvedOutletId,
    kycRequired: isKycRequired(provider),
    provider,
  };
};

/* ==============================
   Onboard Merchant to AEPS Gateway
============================== */
const onboardMerchantService = async (userId) => {
  if (!userId) {
    throw fail(400, "User ID is required for merchant onboarding");
  }

  const user = await User.findById(userId).populate("AepsEkyc");
  if (!user) {
    throw fail(404, "Retailer not found");
  }

  // Idempotency: if retailer already has an outletId, return existing data
  if (user.AepsEkyc?.outletId) {
    return {
      userId: user._id,
      outletId: user.AepsEkyc.outletId,
      eKYCStatus: user.AepsEkyc.eKYCStatus || "PENDING",
      referenceKey: user.AepsEkyc.referenceKey || null,
      alreadyOnboarded: true,
      message: "Retailer is already onboarded",
    };
  }

  const parsedDob = user.dateOfBirth ? toDateOnly(user.dateOfBirth) : "";
  const onboardPayload = {
    mobile: user.mobile || "",
    name: user.fullName || "",
    gender: user.gender || "",
    pan: user.panNumber || "",
    email: user.email || "",
    aadhaar: user.aadhaarNumber || "",
    fulladdress: user.shop?.completeAddress || user.shop?.address?.addressLine || "",
    pincode: user.shop?.address?.pincode || "",
    city: user.shop?.address?.city || "",
    dob: parsedDob,
    latitude: user.shop?.location?.latitude || 0,
    longitude: user.shop?.location?.longitude || 0,
  };

  if (!onboardPayload.mobile) throw fail(400, "Retailer mobile number is missing in database");
  if (!onboardPayload.pan) throw fail(400, "Retailer PAN number is missing in database");
  if (!onboardPayload.aadhaar) throw fail(400, "Retailer Aadhaar number is missing in database");

  let providerResult;
  try {
    providerResult = await onboardMerchant(onboardPayload);
  } catch (error) {
    const rawStatus =
      error.statusCode ||
      error.response?.status ||
      error.providerData?.code;
    const numericStatus = Number(rawStatus);
    const providerStatus =
      numericStatus >= 400 && numericStatus < 600 ? numericStatus : null;

    const providerData =
      error.providerData?.details ||
      error.providerData ||
      error.response?.data ||
      null;

    const providerMessage =
      providerData?.msg ||
      providerData?.message ||
      error.providerData?.message ||
      error.message ||
      "Merchant onboarding failed at external gateway";

    throw fail(
      providerStatus || 502,
      providerMessage,
      providerData || null
    );
  }

  const providerStatus = String(providerResult?.status || "").toUpperCase();
  const providerData = providerResult?.data || {};
  const outletId = providerData.outletId || providerResult?.outletId;

  if (providerStatus !== "SUCCESS" || isBlank(outletId)) {
    const rawCode =
      providerResult?.statusCode ||
      providerResult?.status_code ||
      providerResult?.code ||
      providerResult?.response_code ||
      providerData?.statusCode ||
      providerData?.code;
    const parsedCode = Number(rawCode);
    const resolvedStatusCode =
      parsedCode >= 400 && parsedCode < 600 ? parsedCode : 400;

    let errorMessage;
    if (providerStatus === "SUCCESS" && isBlank(outletId)) {
      errorMessage =
        providerData?.msg ||
        providerData?.message ||
        "Merchant onboarding completed at gateway but outletId was not returned";
    } else {
      errorMessage =
        providerResult?.msg ||
        providerResult?.message ||
        providerData?.msg ||
        providerData?.message ||
        providerResult?.error ||
        "Merchant onboarding failed at external gateway";
    }

    throw fail(
      resolvedStatusCode,
      errorMessage,
      providerResult || null
    );
  }

  const ekycDoc = await saveAepsEkyc({
    userId: user._id,
    outletId: String(outletId),
    eKYCStatus: "PENDING",
  });

  user.AepsEkyc = ekycDoc._id;
  await user.save();

  return {
    userId: user._id,
    outletId: ekycDoc.outletId,
    eKYCStatus: ekycDoc.eKYCStatus,
    onboarding: providerResult,
  };
};

export {
  getRetailerKycDetails,
  recordEkycOutlet,
  checkLoginStatus,
  isKycRequired,
  onboardMerchantService,
};
