import ApiError from "../../../utils/ApiError.js";
import {
  addBeneficiary,
  verifyBeneficiary,
  getBeneficiaries,
  deleteBeneficiary,
  deleteBeneficiaryVerifyOtp,
  generateTransactionOtp,
  doTransaction,
  getTransactionStatus,
} from "../../external/services/provider.service.js";

/**
 * Service to add a new beneficiary
 * @param {Object} payload - { mobile, name/bene_name, account_number, ifsc, etc. }
 */
const addBeneficiaryService = async (payload = {}) => {
 
  const result = await addBeneficiary(payload);
  return result;
};

/**
 * Service to verify beneficiary bank account
 * @param {Object} payload - { mobile, account_number, ifsc, etc. }
 */
const verifyBeneficiaryService = async (payload = {}) => {
  if (!payload || Object.keys(payload).length === 0) {
    throw ApiError.badRequest("Beneficiary verification details are required");
  }

  const result = await verifyBeneficiary(payload);
  return result;
};

/**
 * Service to fetch beneficiaries for a customer mobile number
 * @param {Object} payload - { mobile }
 */
const getBeneficiariesService = async (payload = {}) => {
  if (!payload?.mobile) {
    throw ApiError.badRequest("Customer mobile number is required");
  }

  const result = await getBeneficiaries(payload);
  return result;
};

/**
 * Service to initiate beneficiary deletion (sends OTP)
 * @param {Object} payload - { mobile, bene_id }
 */
const deleteBeneficiaryService = async (payload = {}) => {
  const result = await deleteBeneficiary(payload);
  return result;
};

/**
 * Service to verify OTP and confirm beneficiary deletion
 * @param {Object} payload - { mobile, bene_id, otp }
 */
const deleteBeneficiaryVerifyOtpService = async (payload = {}) => {
 
  const result = await deleteBeneficiaryVerifyOtp(payload);
  return result;
};

/**
 * Service to generate pre-transaction OTP
 * @param {Object} payload - { mobile, amount, etc. }
 */
const generateTransactionOtpService = async (payload = {}) => {
  if (!payload?.mobile) {
    throw ApiError.badRequest("Customer mobile number is required");
  }

  const result = await generateTransactionOtp(payload);
  return result;
};

/**
 * Service to execute money transfer transaction
 * @param {Object} payload - { mobile, bene_id, amount, mode, otp, etc. }
 */
const doTransactionService = async (payload = {}) => {
  if (!payload || Object.keys(payload).length === 0) {
    throw ApiError.badRequest("Transaction details are required");
  }

  if (!payload.mobile || !payload.amount) {
    throw ApiError.badRequest("Customer mobile and transaction amount are required");
  }

  const result = await doTransaction(payload);
  return result;
};

/**
 * Service to check transaction status
 * @param {Object} payload - { reference_id / txnid / client_ref_id }
 */
const getTransactionStatusService = async (payload = {}) => {
  if (!payload || Object.keys(payload).length === 0) {
    throw ApiError.badRequest("Transaction identifier parameter is required");
  }

  const result = await getTransactionStatus(payload);
  return result;
};

export {
  addBeneficiaryService,
  verifyBeneficiaryService,
  getBeneficiariesService,
  deleteBeneficiaryService,
  deleteBeneficiaryVerifyOtpService,
  generateTransactionOtpService,
  doTransactionService,
  getTransactionStatusService,
};
