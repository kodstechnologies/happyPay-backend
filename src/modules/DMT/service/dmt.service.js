import sanitizePayload from "../../../utils/sanitizePayload.js";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";
import {
  loginRemitter,
  registerRemitter,
  registerRemitterVerify,
  remitterEkyc,
  addBeneficiary,
  verifyBeneficiary,
  verifyAccount,
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

export const getRemitterDetailsService = async (payload = {}) => {
  const loginResult = await loginRemitter(payload);

  const msg = String(loginResult?.msg || loginResult?.message || "").toLowerCase();
  const isNotFound =
    msg.includes("not found") ||
    msg.includes("not registered") ||
    loginResult?.status === "FAILED" ||
    (loginResult?.kyc === 0 && !loginResult?.name);

  // If Remitter is Not Found and Aadhaar is provided, trigger internal registration
  if (isNotFound && payload.aadhaar) {
    const sessionRefKey = loginResult?.referenceKey || payload.referenceKey;
    const registerPayload = sanitizePayload({
      ...payload,
      aadhaar: payload.aadhaar,
      referenceKey: sessionRefKey,
    });

    console.log("[DMT Backend] Auto-initiating remitter registration for:", payload.mobile);
    try {
      const registerResult = await registerRemitter(registerPayload);
      console.log("[DMT Backend] Auto-registration response:", registerResult);

      return {
        ...registerResult,
        isNewRegistration: true,
        referenceKey: registerResult?.referenceKey || sessionRefKey,
        data: {
          ...(registerResult?.data || {}),
          referenceKey:
            registerResult?.data?.referenceKey ||
            registerResult?.referenceKey ||
            sessionRefKey,
          status: registerResult?.status || "SUCCESS",
          msg: registerResult?.msg || "Remitter registration initiated. OTP sent to mobile number.",
        },
      };
    } catch (regError) {
      console.error("[DMT Backend] Auto-registration failed:", regError?.message || regError);
      return {
        ...loginResult,
        isNewRegistration: true,
        referenceKey: sessionRefKey,
        data: {
          ...(loginResult?.data || {}),
          referenceKey: sessionRefKey,
        },
      };
    }
  }

  return loginResult;
};

// 2. Register Remitter

export const registerRemitterService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await registerRemitter(cleanPayload);
};

//  Verify Remitter Registration OTP
export const verifyRemitterOtpService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await registerRemitterVerify(cleanPayload);
};

// 4. Remitter eKYC
export const performRemitterEkycService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  const providerPayload = {
    mobile: cleanPayload.mobile,
    outletid: cleanPayload.outletid || cleanPayload.outletId,
    referenceKey: cleanPayload.referenceKey,
    latitude: String(cleanPayload.latitude),
    longitude: String(cleanPayload.longitude),
    txnid: cleanPayload.txnid,
    ci: cleanPayload.ci,
    hmac: cleanPayload.hmac,
    Piddata: cleanPayload.Piddata,
    ts: cleanPayload.ts,
    dpId: cleanPayload.dpId,
    dc: cleanPayload.dc,
    mi: cleanPayload.mi,
    mc: cleanPayload.mc,
    rdsVer: cleanPayload.rdsVer,
    rdsId: cleanPayload.rdsId,
    sessionKey: cleanPayload.sessionKey,
    srno: cleanPayload.srno,
  };
  return await remitterEkyc(providerPayload);
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
 * Verify beneficiary bank account via demographic verifyAccount external service
 * Required provider fields: txnid, longitude, latitude, bankIfsc, accountNumber
 */
export const verifyBeneficiaryAccountService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);

  // Generate unique random txnid if not supplied
  const txnid = cleanPayload.txnid || generate15CharTxnId("TXN");
  const bankIfsc = cleanPayload.bankIfsc || cleanPayload.ifsc || "";
  const accountNumber = cleanPayload.accountNumber || cleanPayload.account_number || "";
  const latitude = String(cleanPayload.latitude || "28.7041");
  const longitude = String(cleanPayload.longitude || "77.1025");

  const providerPayload = {
    ...cleanPayload,
    txnid,
    bankIfsc,
    accountNumber,
    latitude,
    longitude,
  };

  return await verifyAccount(providerPayload);
};
//  Add a new beneficiary

export const addBeneficiaryService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await addBeneficiary(cleanPayload);
};

/**
 * Verify added beneficiary via OTP (rdmt/verify-bene)
 * Required provider fields: outletid, referenceKey, beneficiaryId, otp, remitterMobile
 */
export const verifyBeneficiaryService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await verifyBeneficiary(cleanPayload);
};

//  Initiate beneficiary deletion (triggers OTP)

export const deleteBeneficiaryService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await deleteBeneficiary(cleanPayload);
};

//  Verify OTP and confirm beneficiary deletion

export const verifyDeleteBeneficiaryOtpService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await deleteBeneficiaryVerifyOtp(cleanPayload);
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

  return await doTransaction(cleanPayload);
};

//  Check transaction status

export const checkTransactionStatusService = async (payload = {}) => {
  return await getTransactionStatus(payload);
};
