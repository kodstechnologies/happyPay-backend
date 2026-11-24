/**
 * UPI Cashpoint Service (Mock Mode)
 *
 * All external provider API calls have been replaced with mock implementations
 * that generate realistic responses and store data in the local database.
 * This allows the full UPI Cashpoint flow to work end-to-end without an
 * external payment provider.
 */

import User from "../../auth/model/user.model.js";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";
import UpiTransaction from "../models/upiTransaction.model.js";
import UpiEkyc from "../models/upiEkyc.model.js";
import logger from "../../../utils/logger.js";
import { getUpiStateList, getUpiDistrict } from "../../external/services/provider.service.js";

const fail = (statusCode, message, meta = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.meta = meta;
  error.data = meta;
  return error;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Initiate UPI Cashpoint Payment (Mock)
// ─────────────────────────────────────────────────────────────────────────────

const initiateUpiCashpointService = async (payload = {}) => {
  const { amount, latitude = "", longitude = "", merchantLoginId = "" } = payload;
  const txnid = payload.txnid || generate15CharTxnId("TXN");
  const numAmount = Number(amount) || 0;

  // Generate a mock RRN (12-digit reference number)
  const rrn = String(Date.now()).slice(-12).padStart(12, "0");

  // Generate a mock UPI QR string
  const qrString = `upi://pay?pa=happypay@yesbank&pn=HappyPayCashpoint&am=${numAmount.toFixed(2)}&cu=INR&tr=${txnid}&tn=UPICashpoint`;

  // Resolve userId from the payload or merchantLoginId
  let userId = payload.userId || null;
  if (!userId && merchantLoginId) {
    const upiEkyc = await UpiEkyc.findOne({ merchantId: String(merchantLoginId).trim() });
    if (upiEkyc) userId = upiEkyc.userId;
  }

  // Store the mock transaction in the DB
  if (userId) {
    await UpiTransaction.create({
      userId,
      merchantId: String(merchantLoginId || "MOCK_MERCHANT").trim(),
      txnid,
      amount: numAmount,
      qrString,
      rrn,
      latitude: String(latitude),
      longitude: String(longitude),
      status: "INITIATED",
    });
    logger.info(`[UPI Mock] Transaction stored. txnid=${txnid} amount=₹${numAmount}`);
  }

  return {
    status: true,
    statuscode: "SUCCESS",
    response_code: 0,
    txnid,
    orderid: txnid,
    qrString,
    rrn,
    bankRefNum: rrn,
    amount: numAmount,
    msg: "QR code generated successfully (mock)",
    message: "QR code generated successfully (mock)",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Merchant Registration (Mock)
// ─────────────────────────────────────────────────────────────────────────────

const merchantRegistrationService = async ({ userId, overrides = {}, clientIp = "127.0.0.1" } = {}) => {
  if (!userId) {
    throw fail(400, "User ID is required for merchant registration");
  }

  const retailer = await User.findById(userId);
  if (!retailer) {
    throw fail(404, "Retailer not found with provided User ID");
  }

  // Generate a mock merchant ID (e.g., "HPMR" + timestamp + random)
  const merchantId = `HPMR${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;

  logger.info(`[UPI Mock] Merchant registered. userId=${userId} merchantId=${merchantId}`);

  return {
    status: true,
    statuscode: "SUCCESS",
    merchantId,
    merchant_id: merchantId,
    msg: "Merchant registered successfully (mock)",
    message: "Merchant registered successfully (mock)",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Merchant Registration — Send OTP (Mock)
// ─────────────────────────────────────────────────────────────────────────────

const merchantRegistrationSendOtpService = async ({ merchantId }) => {
  if (!merchantId) {
    throw fail(400, "merchantId is required to send OTP");
  }

  // Generate a mock OTP — in production this would be sent via SMS
  const mockOtp = "1234";

  logger.info(`[UPI Mock] OTP sent for merchantId=${merchantId} otp=${mockOtp}`);

  return {
    status: true,
    statuscode: "SUCCESS",
    msg: "OTP sent successfully (mock)",
    message: "OTP sent successfully (mock)",
    // Include the OTP in the response for testing/dev convenience
    otp: mockOtp,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Merchant Registration — Verify OTP (Mock)
// ─────────────────────────────────────────────────────────────────────────────

const merchantRegistrationVerifyService = async ({ merchantId, otp }) => {
  if (!merchantId || !otp) {
    throw fail(400, "merchantId and otp are required for OTP verification");
  }

  // Accept any non-empty OTP in mock mode
  logger.info(`[UPI Mock] OTP verified for merchantId=${merchantId} otp=${otp}`);

  // Mark OTP as verified in the UpiEkyc document
  await UpiEkyc.findOneAndUpdate(
    { merchantId: String(merchantId).trim() },
    { otpVerified: true },
    { returnDocument: "after" }
  );

  return {
    status: true,
    statuscode: "SUCCESS",
    msg: "OTP VERIFIED.",
    message: "OTP verified successfully (mock)",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Seller Onboarding (Mock)
// ─────────────────────────────────────────────────────────────────────────────

const sellerOnboardingService = async (payload = {}) => {
  const {
    osVersion = "",
    osType = "",
    appVersion = "",
    deviceFingerprint = "",
    ipaddress = "",
    longitude = "",
    latitude = "",
    merchantId,
  } = payload;

  if (!merchantId) {
    throw fail(400, "merchantId is required for seller onboarding");
  }

  logger.info(`[UPI Mock] Seller onboarded. merchantId=${merchantId} os=${osType}`);

  // Mark seller as onboarded in the UpiEkyc document
  await UpiEkyc.findOneAndUpdate(
    { merchantId: String(merchantId).trim() },
    { sellerOnboarded: true },
    { returnDocument: "after" }
  );

  return {
    status: true,
    statuscode: "SUCCESS",
    msg: "Seller onboarding completed successfully (mock)",
    message: "Seller onboarding completed successfully (mock)",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Merchant eKYC (Mock)
// ─────────────────────────────────────────────────────────────────────────────

const merchantEkycService = async ({ merchantId, pidData } = {}) => {
  if (!merchantId || !pidData) {
    throw fail(400, "merchantId and pidData are required for eKYC");
  }

  logger.info(`[UPI Mock] eKYC completed for merchantId=${merchantId}`);

  return {
    status: true,
    statuscode: "SUCCESS",
    msg: "Merchant eKYC completed successfully (mock)",
    message: "Merchant eKYC completed successfully (mock)",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. Get UPI State List (Mock)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_STATES = [
  { description: "Andhra Pradesh", code: "AP" },
  { description: "Assam", code: "AS" },
  { description: "Bihar", code: "BR" },
  { description: "Chhattisgarh", code: "CG" },
  { description: "Delhi", code: "DL" },
  { description: "Goa", code: "GA" },
  { description: "Gujarat", code: "GJ" },
  { description: "Haryana", code: "HR" },
  { description: "Himachal Pradesh", code: "HP" },
  { description: "Jharkhand", code: "JH" },
  { description: "Karnataka", code: "KA" },
  { description: "Kerala", code: "KL" },
  { description: "Madhya Pradesh", code: "MP" },
  { description: "Maharashtra", code: "MH" },
  { description: "Odisha", code: "OR" },
  { description: "Punjab", code: "PB" },
  { description: "Rajasthan", code: "RJ" },
  { description: "Tamil Nadu", code: "TN" },
  { description: "Telangana", code: "TG" },
  { description: "Uttar Pradesh", code: "UP" },
  { description: "Uttarakhand", code: "UK" },
  { description: "West Bengal", code: "WB" },
];

// Normalize provider lookup payloads ({ code, description }[]) into our shape
const normalizeLookupItems = (payload) => {
  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  return list
    .map((item) => ({
      description: item?.description ?? item?.name ?? "",
      code: item?.code ?? item?.stateCode ?? item?.districtCode ?? "",
    }))
    .filter((item) => item.description || item.code);
};

const paginateLookup = (items, { page = 1, limit = 20, search = "" } = {}) => {
  let filtered = items;

  if (search && search.trim()) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.description.toLowerCase().includes(searchLower) ||
        s.code.toLowerCase().includes(searchLower)
    );
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginated = filtered.slice(startIndex, endIndex);

  return {
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: endIndex < total,
      hasPrevPage: page > 1,
    },
  };
};

const getUpiStateListService = async ({ page = 1, limit = 20, search = "" } = {}) => {
  let states = null;

  try {
    const providerRes = await getUpiStateList();
    states = normalizeLookupItems(providerRes);
  } catch (err) {
    logger.warn(`[UPI StateList] Provider call failed, using fallback: ${err?.message || err}`);
  }

  if (!states || states.length === 0) {
    states = [...MOCK_STATES];
  }

  return paginateLookup(states, { page, limit, search });
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. Get UPI District List (Mock)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_DISTRICTS = {
  RJ: [
    { description: "Jaipur", code: "RJ01" },
    { description: "Jodhpur", code: "RJ02" },
    { description: "Udaipur", code: "RJ03" },
    { description: "Kota", code: "RJ04" },
    { description: "Ajmer", code: "RJ05" },
  ],
  DL: [
    { description: "New Delhi", code: "DL01" },
    { description: "South Delhi", code: "DL02" },
    { description: "North Delhi", code: "DL03" },
  ],
  MH: [
    { description: "Mumbai", code: "MH01" },
    { description: "Pune", code: "MH02" },
    { description: "Nagpur", code: "MH03" },
  ],
  KA: [
    { description: "Bengaluru", code: "KA01" },
    { description: "Mysuru", code: "KA02" },
    { description: "Mangaluru", code: "KA03" },
  ],
  UP: [
    { description: "Lucknow", code: "UP01" },
    { description: "Kanpur", code: "UP02" },
    { description: "Varanasi", code: "UP03" },
  ],
};

const getUpiDistrictService = async ({ stateCode, page = 1, limit = 20, search = "" } = {}) => {
  let districts = null;

  try {
    // Provider accepts the state code as a form field; send common key variants
    const providerRes = await getUpiDistrict({ statecode: stateCode, stateCode });
    districts = normalizeLookupItems(providerRes);
  } catch (err) {
    logger.warn(`[UPI District] Provider call failed for stateCode=${stateCode}, using fallback: ${err?.message || err}`);
  }

  if (!districts || districts.length === 0) {
    districts = MOCK_DISTRICTS[String(stateCode).toUpperCase()] || [
      { description: "Default District", code: `${stateCode}01` },
      { description: "Central District", code: `${stateCode}02` },
    ];
  }

  return paginateLookup(districts, { page, limit, search });
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  initiateUpiCashpointService,
  merchantRegistrationService,
  merchantRegistrationSendOtpService,
  merchantRegistrationVerifyService,
  sellerOnboardingService,
  merchantEkycService,
  getUpiStateListService,
  getUpiDistrictService,
};
