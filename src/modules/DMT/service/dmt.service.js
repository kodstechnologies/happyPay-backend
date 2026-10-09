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

// -------------------------------------------------------------
// Remitter Services
// -------------------------------------------------------------

/**
 * Service to query / login remitter by mobile number
 * @param {Object} payload - { mobile }
 */
const queryRemitterService = async (payload = {}) => {
  const requestPayload = {
    mobile: payload.mobile,
    ...payload,
  };
  return await loginRemitter(requestPayload);
};

const loginRemitterService = queryRemitterService;

/**
 * Service to register a new remitter (triggers OTP)
 * @param {Object} payload - { mobile, fname/first_name, lname/last_name, pincode, dob, address, latlong, stateresp }
 */
const registerRemitterService = async (payload = {}) => {
  const fname = payload.fname || payload.first_name || payload.name?.split(" ")[0] || "";
  const lname =
    payload.lname ||
    payload.last_name ||
    (payload.name && payload.name.split(" ").length > 1
      ? payload.name.split(" ").slice(1).join(" ")
      : "");

  const requestPayload = {
    ...payload,
    fname,
    lname,
  };

  return await registerRemitter(requestPayload);
};

/**
 * Service to verify remitter registration OTP
 * @param {Object} payload - { mobile, otp, stateresp, remitter_id, otp_ref }
 */
const registerRemitterVerifyService = async (payload = {}) => {
  return await registerRemitterVerify(payload);
};

/**
 * Service to perform remitter biometric / Aadhaar eKYC
 * @param {Object} payload - { mobile, aadhar_no/aadhaar_number, biometric_data, piddata, latlong }
 */
const remitterEkycService = async (payload = {}) => {
  const requestPayload = {
    ...payload,
    aadhar_no: payload.aadhar_no || payload.aadhaar_number,
  };
  return await remitterEkyc(requestPayload);
};

// -------------------------------------------------------------
// Beneficiary Services
// -------------------------------------------------------------

/**
 * Service to add a new beneficiary
 * @param {Object} payload - { mobile, name/bene_name, account_number, ifsc, bank_name, etc. }
 */
const addBeneficiaryService = async (payload = {}) => {
  const name = payload.bene_name || payload.name;
  const requestPayload = {
    ...payload,
    name,
    bene_name: name,
  };
  return await addBeneficiary(requestPayload);
};

/**
 * Service to verify beneficiary bank account (Penny Drop)
 * @param {Object} payload - { mobile, account_number, ifsc }
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

// -------------------------------------------------------------
// Transaction Services
// -------------------------------------------------------------

/**
 * Service to generate pre-transaction OTP
 * @param {Object} payload - { mobile, amount, bene_id }
 */
const generateTransactionOtpService = async (payload = {}) => {
  return await generateTransactionOtp(payload);
};

/**
 * Service to execute money transfer transaction
 * @param {Object} payload - { mobile, bene_id, amount, mode, otp, latlong, client_ref_id }
 */
const doTransactionService = async (payload = {}) => {
  return await doTransaction(payload);
};

/**
 * Service to check DMT transaction status
 * @param {Object} payload - { reference_id / txnid / client_ref_id }
 */
const getTransactionStatusService = async (payload = {}) => {
  return await getTransactionStatus(payload);
};

export {
  queryRemitterService,
  loginRemitterService,
  registerRemitterService,
  registerRemitterVerifyService,
  remitterEkycService,
  addBeneficiaryService,
  verifyBeneficiaryService,
  getBeneficiariesService,
  deleteBeneficiaryService,
  deleteBeneficiaryVerifyOtpService,
  generateTransactionOtpService,
  doTransactionService,
  getTransactionStatusService,
};
