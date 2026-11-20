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
  { stateName: "Andhra Pradesh", stateCode: "AP" },
  { stateName: "Assam", stateCode: "AS" },
  { stateName: "Bihar", stateCode: "BR" },
  { stateName: "Chhattisgarh", stateCode: "CG" },
  { stateName: "Delhi", stateCode: "DL" },
  { stateName: "Goa", stateCode: "GA" },
  { stateName: "Gujarat", stateCode: "GJ" },
  { stateName: "Haryana", stateCode: "HR" },
  { stateName: "Himachal Pradesh", stateCode: "HP" },
  { stateName: "Jharkhand", stateCode: "JH" },
  { stateName: "Karnataka", stateCode: "KA" },
  { stateName: "Kerala", stateCode: "KL" },
  { stateName: "Madhya Pradesh", stateCode: "MP" },
  { stateName: "Maharashtra", stateCode: "MH" },
  { stateName: "Odisha", stateCode: "OR" },
  { stateName: "Punjab", stateCode: "PB" },
  { stateName: "Rajasthan", stateCode: "RJ" },
  { stateName: "Tamil Nadu", stateCode: "TN" },
  { stateName: "Telangana", stateCode: "TG" },
  { stateName: "Uttar Pradesh", stateCode: "UP" },
  { stateName: "Uttarakhand", stateCode: "UK" },
  { stateName: "West Bengal", stateCode: "WB" },
];

const getUpiStateListService = async ({ page = 1, limit = 20, search = "" } = {}) => {
  let states = [...MOCK_STATES];

  if (search && search.trim()) {
    const searchLower = search.toLowerCase();
    states = states.filter(
      (s) =>
        s.stateName.toLowerCase().includes(searchLower) ||
        s.stateCode.toLowerCase().includes(searchLower)
    );
  }

  const total = states.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedStates = states.slice(startIndex, endIndex);

  return {
    data: paginatedStates,
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

// ─────────────────────────────────────────────────────────────────────────────
// 8. Get UPI District List (Mock)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_DISTRICTS = {
  RJ: [
    { districtName: "Jaipur", districtCode: "RJ01" },
    { districtName: "Jodhpur", districtCode: "RJ02" },
    { districtName: "Udaipur", districtCode: "RJ03" },
    { districtName: "Kota", districtCode: "RJ04" },
    { districtName: "Ajmer", districtCode: "RJ05" },
  ],
  DL: [
    { districtName: "New Delhi", districtCode: "DL01" },
    { districtName: "South Delhi", districtCode: "DL02" },
    { districtName: "North Delhi", districtCode: "DL03" },
  ],
  MH: [
    { districtName: "Mumbai", districtCode: "MH01" },
    { districtName: "Pune", districtCode: "MH02" },
    { districtName: "Nagpur", districtCode: "MH03" },
  ],
  KA: [
    { districtName: "Bengaluru", districtCode: "KA01" },
    { districtName: "Mysuru", districtCode: "KA02" },
    { districtName: "Mangaluru", districtCode: "KA03" },
  ],
  UP: [
    { districtName: "Lucknow", districtCode: "UP01" },
    { districtName: "Kanpur", districtCode: "UP02" },
    { districtName: "Varanasi", districtCode: "UP03" },
  ],
};

const getUpiDistrictService = async ({ stateCode, page = 1, limit = 20, search = "" } = {}) => {
  let districts = MOCK_DISTRICTS[String(stateCode).toUpperCase()] || [
    { districtName: "Default District", districtCode: `${stateCode}01` },
    { districtName: "Central District", districtCode: `${stateCode}02` },
  ];

  if (search && search.trim()) {
    const searchLower = search.toLowerCase();
    districts = districts.filter(
      (d) =>
        d.districtName.toLowerCase().includes(searchLower) ||
        d.districtCode.toLowerCase().includes(searchLower)
    );
  }

  const total = districts.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedDistricts = districts.slice(startIndex, endIndex);

  return {
    data: paginatedDistricts,
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
