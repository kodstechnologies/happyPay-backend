import {
  initiateUpiCashpointPayment,
  merchantRegistration,
  merchantRegistrationSendOtp,
  merchantRegistrationVerify,
  merchantRegistrationOnboarding,
  merchantEKYC,
} from "../../external/services/provider.service.js";
import User from "../../auth/model/user.model.js";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";

const fail = (statusCode, message, meta = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.meta = meta;
  error.data = meta;
  return error;
};

const STATE_CODE_MAP = {
  "ANDAMAN AND NICOBAR ISLANDS": "AN",
  "ANDHRA PRADESH": "AP",
  "ARUNACHAL PRADESH": "AR",
  "ASSAM": "AS",
  "BIHAR": "BR",
  "CHANDIGARH": "CH",
  "CHHATTISGARH": "CG",
  "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "DH",
  "DELHI": "DL",
  "GOA": "GA",
  "GUJARAT": "GJ",
  "HARYANA": "HR",
  "HIMACHAL PRADESH": "HP",
  "JAMMU AND KASHMIR": "JK",
  "JHARKHAND": "JH",
  "KARNATAKA": "KA",
  "KERALA": "KL",
  "LADAKH": "LA",
  "LAKSHADWEEP": "LD",
  "MADHYA PRADESH": "MP",
  "MAHARASHTRA": "MH",
  "MANIPUR": "MN",
  "MEGHALAYA": "ML",
  "MIZORAM": "MZ",
  "NAGALAND": "NL",
  "ODISHA": "OR",
  "PUDUCHERRY": "PY",
  "PUNJAB": "PB",
  "RAJASTHAN": "RJ",
  "SIKKIM": "SK",
  "TAMIL NADU": "TN",
  "TELANGANA": "TG",
  "TRIPURA": "TR",
  "UTTAR PRADESH": "UP",
  "UTTARAKHAND": "UK",
  "WEST BENGAL": "WB",
};

const mapStateToCode = (stateName = "") => {
  if (!stateName || typeof stateName !== "string") return "";
  const cleaned = stateName.trim().toUpperCase();
  if (cleaned.length === 2) return cleaned;
  return STATE_CODE_MAP[cleaned] || "";
};

const formatDateToDDMMYYYY = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const splitFullName = (fullName = "") => {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: "", lastname: "" };
  if (parts.length === 1) return { firstname: parts[0], lastname: parts[0] };
  const firstname = parts[0];
  const lastname = parts.slice(1).join(" ");
  return { firstname, lastname };
};

const initiateUpiCashpointService = async (payload = {}) => {
  return await initiateUpiCashpointPayment(payload);
};

/**
 * Service for Merchant Registration in UPI Cashpoint
 * Extracts retailer data by userId and maps strictly to the 24 required external fields.
 */
const merchantRegistrationService = async ({ userId, overrides = {}, clientIp = "127.0.0.1" } = {}) => {
  if (!userId) {
    throw fail(400, "User ID is required for merchant registration");
  }

  const retailer = await User.findById(userId);
  if (!retailer) {
    throw fail(404, "Retailer not found with provided User ID");
  }

  // Identify primary or first active bank
  const primaryBank =
    (Array.isArray(retailer.banks) && retailer.banks.find((b) => b?.isPrimary && b?.isActive !== false)) ||
    (Array.isArray(retailer.banks) && retailer.banks.find((b) => b?.isActive !== false)) ||
    retailer.banks?.[0] ||
    {};

  // Shop details
  const shop = retailer.shop || {};
  const shopAddress = shop.address || {};
  const fullAddress =
    shop.completeAddress ||
    [shopAddress.addressLine, shopAddress.city, shopAddress.state, shopAddress.pincode]
      .filter(Boolean)
      .join(", ") ||
    "";

  // Name extraction
  const { firstname: derivedFirstname, lastname: derivedLastname } = splitFullName(retailer.fullName);

  // State and stateCode derivation
  const resolvedState = overrides.state || shopAddress.state || "";
  const resolvedStateCode =
    overrides.stateCode ||
    retailer.stateCode ||
    mapStateToCode(resolvedState) ||
    "";

  // Date of birth formatted as DD-MM-YYYY (e.g. 15-08-1995)
  const resolvedDob =
    overrides.dob ||
    formatDateToDDMMYYYY(retailer.dateOfBirth) ||
    "";

  // Gender (single char uppercase: M/F/T)
  const resolvedGender =
    overrides.gender ||
    (retailer.gender ? String(retailer.gender).trim().toUpperCase().charAt(0) : "M");

  // Marital status (uppercase, e.g. MARRIED)
  const resolvedMaritalStatus =
    overrides.maritalstatus ||
    (retailer.maritalStatus ? String(retailer.maritalStatus).trim().toUpperCase() : "");

  // Transaction ID
  const resolvedTxnId =
    overrides.txnid ||
    generate15CharTxnId("TXN");

  // Build payload using strictly and exclusively the 24 required external fields
  const payload = {
    stateCode: String(resolvedStateCode).trim(),
    fathername: String(overrides.fathername || retailer.fatherName || "").trim(),
    mothername: String(overrides.mothername || retailer.motherName || "").trim(),
    firstname: String(overrides.firstname || derivedFirstname || "").trim(),
    lastname: String(overrides.lastname || derivedLastname || "").trim(),
    dob: String(resolvedDob).trim(),
    email: String(overrides.email || retailer.email || "").trim(),
    phone: String(overrides.phone || overrides.mobile || retailer.mobile || "").trim(),
    latitude: overrides.latitude !== undefined && overrides.latitude !== null && overrides.latitude !== ""
      ? String(overrides.latitude).trim()
      : shop.location?.latitude !== undefined && shop.location?.latitude !== null
        ? String(shop.location.latitude).trim()
        : "",
    longitude: overrides.longitude !== undefined && overrides.longitude !== null && overrides.longitude !== ""
      ? String(overrides.longitude).trim()
      : shop.location?.longitude !== undefined && shop.location?.longitude !== null
        ? String(shop.location.longitude).trim()
        : "",
    txnid: String(resolvedTxnId).trim(),
    merchantpincode: String(overrides.merchantpincode || overrides.pincode || shopAddress.pincode || "").trim(),
    panno: String(overrides.panno || overrides.pan || retailer.panNumber || "").trim(),
    accountnumber: String(overrides.accountnumber || primaryBank.accountNumber || "").trim(),
    ifsc: String(overrides.ifsc || primaryBank.ifscCode || "").trim(),
    bankname: String(overrides.bankname || primaryBank.name || "").trim(),
    aadharno: String(overrides.aadharno || overrides.aadhaar || retailer.aadhaarNumber || "").trim(),
    state: String(resolvedState).trim(),
    shopname: String(overrides.shopname || shop.name || "").trim(),
    address: String(overrides.address || fullAddress).trim(),
    gender: String(resolvedGender).trim(),
    maritalstatus: String(resolvedMaritalStatus).trim(),
    ipaddress: String(overrides.ipaddress || clientIp || "127.0.0.1").trim(),
    district: String(overrides.district || shopAddress.district || shopAddress.city || "").trim(),
  };

  return await merchantRegistration(payload);
};

/**
 * Service to send OTP for Merchant Registration
 * Strictly uses merchantId as required by the provider API
 */
const merchantRegistrationSendOtpService = async ({ merchantId }) => {
  return await merchantRegistrationSendOtp({ merchantId });
};

/**
 * Service to verify OTP for Merchant Registration
 * Strictly uses merchantId and otp as required by the provider API
 */
const merchantRegistrationVerifyService = async ({ merchantId, otp }) => {
  return await merchantRegistrationVerify({ merchantId, otp });
};

/**
 * Service for Seller Onboarding in UPI Cashpoint
 * Strictly uses only the 8 required fields:
 * (osVersion, osType, appVersion, deviceFingerprint, ipaddress, longitude, latitude, merchantId)
 */
const sellerOnboardingService = async (payload = {}) => {
  const {
    osVersion,
    osType,
    appVersion,
    deviceFingerprint,
    ipaddress,
    longitude,
    latitude,
    merchantId,
  } = payload;

  const externalPayload = {
    osVersion: String(osVersion).trim(),
    osType: String(osType).trim(),
    appVersion: String(appVersion).trim(),
    deviceFingerprint: String(deviceFingerprint).trim(),
    ipaddress: String(ipaddress).trim(),
    longitude: String(longitude).trim(),
    latitude: String(latitude).trim(),
    merchantId: String(merchantId).trim(),
  };

  return await merchantRegistrationOnboarding(externalPayload);
};

/**
 * Service for Merchant eKYC in UPI Cashpoint
 * Strictly uses only ("merchantId", "pidData") as required by external merchantEKYC API
 */
const merchantEkycService = async ({ merchantId, pidData } = {}) => {
  const externalPayload = {
    merchantId: String(merchantId).trim(),
    pidData: typeof pidData === "string" ? pidData.trim() : pidData,
  };

  return await merchantEKYC(externalPayload);
};

export {
  initiateUpiCashpointService,
  merchantRegistrationService,
  merchantRegistrationSendOtpService,
  merchantRegistrationVerifyService,
  sellerOnboardingService,
  merchantEkycService,
};
