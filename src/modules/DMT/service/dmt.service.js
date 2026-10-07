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
  return await addBeneficiary(payload);
};

/**
 * Service to verify beneficiary bank account
 * @param {Object} payload - { mobile, account_number, ifsc, etc. }
 */
const verifyBeneficiaryService = async (payload = {}) => {
  return await verifyBeneficiary(payload);
};

/**
 * Service to fetch beneficiaries for a customer mobile number
 * @param {Object} payload - { mobile }
 */
const getBeneficiariesService = async (payload = {}) => {
  return await getBeneficiaries(payload);
};

/**
 * Service to initiate beneficiary deletion (sends OTP)
 * @param {Object} payload - { mobile, bene_id }
 */
const deleteBeneficiaryService = async (payload = {}) => {
  return await deleteBeneficiary(payload);
};

/**
 * Service to verify OTP and confirm beneficiary deletion
 * @param {Object} payload - { mobile, bene_id, otp }
 */
const deleteBeneficiaryVerifyOtpService = async (payload = {}) => {
  return await deleteBeneficiaryVerifyOtp(payload);
};

/**
 * Service to generate pre-transaction OTP
 * @param {Object} payload - { mobile, amount, etc. }
 */
const generateTransactionOtpService = async (payload = {}) => {
  return await generateTransactionOtp(payload);
};

/**
 * Service to execute money transfer transaction
 * @param {Object} payload - { mobile, bene_id, amount, mode, otp, etc. }
 */
const doTransactionService = async (payload = {}) => {
  return await doTransaction(payload);
};

/**
 * Service to check transaction status
 * @param {Object} payload - { reference_id / txnid / client_ref_id }
 */
const getTransactionStatusService = async (payload = {}) => {
  return await getTransactionStatus(payload);
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
