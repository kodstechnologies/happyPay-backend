import {
  findRetailerById,
  saveAepsEkyc,
  findAepsEkycByUserId,
} from "../repository/aeps.repository.js";
import { getLoginStatus } from "../../external/services/provider.service.js";

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
    outletId: retailer.outletId || null,
    fullName: retailer.fullName || null,
    mobile: retailer.mobile || null,
    email: retailer.email || null,
  };
};

const recordEkycOutlet = async ({ userId, outletId }) => {
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

  return saveAepsEkyc({
    userId,
    outletId: String(outletId).trim(),
  });
};

const responseText = (value) => {
  if (typeof value === "string") return value.toLowerCase();
  if (!value || typeof value !== "object") return "";
  return Object.values(value).map(responseText).join(" ");
};

const isKycRequired = (providerResponse) => {
  const text = responseText(providerResponse);
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
    outletId || saved?.outletId || retailer?.outletId || "",
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

export {
  getRetailerKycDetails,
  recordEkycOutlet,
  checkLoginStatus,
  isKycRequired,
};
