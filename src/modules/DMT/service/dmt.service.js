import sanitizePayload from "../../../utils/sanitizePayload.js";
import {
  loginRemitter,
  registerRemitter,
  registerRemitterVerify,
  remitterEkyc,
  addBeneficiary,
  verifyBeneficiary,
  getBeneficiaries,
  deleteBeneficiary,
  deleteBeneficiaryVerifyOtp,
  generateTransactionOtp,
  doTransaction,
  getTransactionStatus,
} from "../../external/services/provider.service.js";

// =============================================================
// Remitter Services (Strict Provider Contract)
// =============================================================

//   Login / Query Remitter

export const getRemitterDetailsService = async (payload = {}) => {
  return await loginRemitter(payload);
};

// 2. Register Remitter

export const registerRemitterService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await registerRemitter(cleanPayload);
};

//  Verify Remitter Registration OTP
export const verifyRemitterOtpService = async (payload = {}) => {
  return await registerRemitterVerify(payload);
};

// 4. Remitter eKYC
export const performRemitterEkycService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await remitterEkyc(cleanPayload);
};

// =============================================================
// Beneficiary Services
// =============================================================

// Fetch all registered beneficiaries for a remitter

export const fetchBeneficiariesService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await getBeneficiaries(cleanPayload);
};

/**
 * Verify beneficiary bank account via penny drop
 */
export const verifyBeneficiaryAccountService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await verifyBeneficiary(cleanPayload);
};
//  Add a new beneficiary

export const addBeneficiaryService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await addBeneficiary(cleanPayload);
};

//  Initiate beneficiary deletion (triggers OTP)

export const deleteBeneficiaryService = async (payload = {}) => {
  return await deleteBeneficiary(payload);
};

//  Verify OTP and confirm beneficiary deletion

export const verifyDeleteBeneficiaryOtpService = async (payload = {}) => {
  return await deleteBeneficiaryVerifyOtp(payload);
};

// =============================================================
// Transaction Services
// =============================================================

//  Generate pre-transaction OTP

export const generateTransactionOtpService = async (payload = {}) => {
  return await generateTransactionOtp(payload);
};

/**
 * Execute money transfer transaction (IMPS / NEFT)
 */
export const executeTransactionService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);

  return await doTransaction(cleanpayload);
};

//  Check transaction status

export const checkTransactionStatusService = async (payload = {}) => {
  return await getTransactionStatus(payload);
};
