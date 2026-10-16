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
import {
  upsertRemitter,
  updateRemitterEkycStatus,
} from "../repository/remitter.repository.js";
import {
  upsertBeneficiary,
  updateBeneficiaryVerificationStatus,
  deleteBeneficiaryRecord,
  getBenificiary,
} from "../repository/benificiary.repository.js";

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

    try {
      const registerResult = await registerRemitter(registerPayload);

      // Persist remitter record in database
      try {
        await upsertRemitter({
          mobile: payload.mobile,
          aadhar: payload.aadhaar || payload.aadhar,
          outletId: payload.outletid || payload.outletId,
        });
      } catch (dbErr) {
        console.error("[DMT Backend] Auto-registration DB persist failed:", dbErr?.message || dbErr);
      }
     
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

  // If remitter was found in provider, synchronize with local database
  if (!isNotFound && payload.mobile) {
    try {
      const isKycDone =
        loginResult?.kyc === 1 ||
        String(loginResult?.kyc_status || "").toUpperCase() === "SUCCESS";

      await upsertRemitter({
        mobile: payload.mobile,
        aadhar: payload.aadhaar || payload.aadhar,
        name: loginResult?.name || loginResult?.remitterName || "",
        outletId: payload.outletid || payload.outletId,
      });

      if (isKycDone) {
        await updateRemitterEkycStatus(payload.mobile, "COMPLETED");
      }
    } catch (dbErr) {
      console.error("[DMT Backend] Syncing existing remitter in DB failed:", dbErr?.message || dbErr);
    }
  }

  return loginResult;
};

// 2. Register Remitter
export const registerRemitterService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  const registerResult = await registerRemitter(cleanPayload);

  // Persist remitter in database on successful provider registration initiation
  try {
    const aadharValue = cleanPayload.aadhaar || cleanPayload.aadhar || payload.aadhaar || payload.aadhar;
    if (cleanPayload.mobile && aadharValue) {
      await upsertRemitter({
        mobile: cleanPayload.mobile,
        aadhar: aadharValue,
        outletId: cleanPayload.outletid || payload.outletid || payload.outletId,
      });
    }
  } catch (dbErr) {
    console.error("[DMT Backend] Remitter DB registration failed:", dbErr?.message || dbErr);
  }

  return registerResult;
};

//  Verify Remitter Registration OTP
export const verifyRemitterOtpService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  const verifyResult = await registerRemitterVerify(cleanPayload);

  // Sync remitter name if provided in OTP verification response
  try {
    const remitterName =
      verifyResult?.data?.name ||
      verifyResult?.name ||
      verifyResult?.remitterName ||
      verifyResult?.data?.remitterName;

    if (cleanPayload.mobile && remitterName) {
      await upsertRemitter({
        mobile: cleanPayload.mobile,
        name: remitterName,
        outletId: cleanPayload.outletid || payload.outletid || payload.outletId,
      });
    }
  } catch (dbErr) {
    console.error("[DMT Backend] Remitter DB update on verify OTP failed:", dbErr?.message || dbErr);
  }

  return verifyResult;
};

// 4. Remitter eKYC
export const performRemitterEkycService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  const ekycResult = await remitterEkyc(cleanPayload);

  const isSuccess =
    ekycResult?.status === "SUCCESS" ||
    ekycResult?.status === true ||
    ekycResult?.status === 1 ||
    ekycResult?.success === true ||
    ekycResult?.response_code === 1 ||
    ekycResult?.statusCode === 200 ||
    /success/i.test(String(ekycResult?.msg || ekycResult?.message || ""));

  if (isSuccess && cleanPayload.mobile) {
    try {
      await updateRemitterEkycStatus(cleanPayload.mobile, "COMPLETED");
    } catch (dbErr) {
      console.error("[DMT Backend] Remitter DB eKYC status update failed:", dbErr?.message || dbErr);
    }
  }

  return ekycResult;
};

// =============================================================
// Beneficiary Services
// =============================================================

// Fetch all registered beneficiaries for a remitter

export const fetchBeneficiariesService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await getBeneficiaries(cleanPayload);
};

// fetch benificiaries from our databse
export const fetchBeneficiaries = async (payload = {}) => {
   const cleanpayload={
    remitterMobile:payload.mobile,
    outletid:payload.outletid,
    verified:true
   }
  return await getBenificiary(cleanpayload);
};
/**
 * Verify beneficiary bank account via demographic verifyAccount external service
 */
export const verifyBeneficiaryAccountService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  const txnid = cleanPayload.txnid || generate15CharTxnId("TXN");
  const bankIfsc = cleanPayload.bankIfsc;
  const accountNumber = cleanPayload.accountNumber;
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

  const verifyResult = await verifyAccount(providerPayload);

  // Check if provider verification was successful
  const isSuccess =
    verifyResult?.status === "SUCCESS" ||
    verifyResult?.status === true ||
    verifyResult?.status === 1 ||
    verifyResult?.success === true ||
    verifyResult?.response_code === 1 ||
    verifyResult?.statusCode === 200 ||
    /success/i.test(String(verifyResult?.msg || verifyResult?.message || ""));

  if (isSuccess && accountNumber) {
    try {
      await updateBeneficiaryVerificationStatus({
        accountNumber,
        remitterMobile: cleanPayload.remitterMobile,
        verified: true,
      });
    } catch (dbErr) {
      console.error(
        "[DMT Backend] Beneficiary DB verification status update failed:",
        dbErr?.message || dbErr
      );
    }
  }

  return verifyResult;
};
//  Add a new beneficiary

export const addBeneficiaryService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  const providerResult = await addBeneficiary(cleanPayload);

  // Persist beneficiary in DB if provider call succeeded
  const isSuccess =
    providerResult?.status === "SUCCESS" 
  
  if (isSuccess) {

       await upsertBeneficiary({
        name: cleanPayload.name,
        ifsc: cleanPayload.ifsc,
        accountNumber: cleanPayload.accountNumber,
        bankId: cleanPayload.bankId,
        beneficiaryMobile: cleanPayload.beneficiaryMobile,
        beneficiaryId: String( providerResult?.beneficiaryId)?.trim(),
        remitterMobile: cleanPayload.remitterMobile,
        outletid: cleanPayload.outletid,
        referenceKey:providerResult?.referenceKey
      });
  }

  return providerResult;
};

/**
 * Verify added beneficiary via OTP (rdmt/verify-bene)
 * Required provider fields: outletid, referenceKey, beneficiaryId, otp, remitterMobile
 */
export const verifyBeneficiaryService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  const verifyResult = await verifyBeneficiary(cleanPayload);

  // Check if provider OTP verification was successful
  const isSuccess =
    verifyResult?.status === "SUCCESS" ||
    verifyResult?.status === true ||
    verifyResult?.status === 1 ||
    verifyResult?.success === true ||
    verifyResult?.response_code === 1 ||
    verifyResult?.statusCode === 200 ||
    /success/i.test(String(verifyResult?.msg || verifyResult?.message || ""));

  const beneficiaryId =
    verifyResult?.beneficiaryId ||
    verifyResult?.data?.beneficiaryId ||
    cleanPayload.beneficiaryId;

  if (isSuccess && beneficiaryId) {
    try {
      await updateBeneficiaryVerificationStatus({
        beneficiaryId: String(beneficiaryId).trim(),
        remitterMobile: cleanPayload.remitterMobile,
        verified: true,
      });
    } catch (dbErr) {
      console.error(
        "[DMT Backend] Beneficiary DB OTP verification update failed:",
        dbErr?.message || dbErr
      );
    }
  }

  return verifyResult;
};

//  Initiate beneficiary deletion (triggers OTP)

export const deleteBeneficiaryService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await deleteBeneficiary(cleanPayload);
};

//  Verify OTP and confirm beneficiary deletion

export const verifyDeleteBeneficiaryOtpService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  const deleteResult = await deleteBeneficiaryVerifyOtp(cleanPayload);

  // Check if provider deletion completed successfully
  const isSuccess =
    deleteResult?.statuscode === "TXN" ||
    deleteResult?.status === "SUCCESS" ||
    deleteResult?.status === true ||
    deleteResult?.statusCode === 200 ||
    /transaction successful|successful|success|deleted/i.test(
      String(deleteResult?.status || deleteResult?.msg || deleteResult?.message || "")
    );

  if (isSuccess && cleanPayload.beneficiaryId) {
    try {
      await deleteBeneficiaryRecord({
        beneficiaryId: String(cleanPayload.beneficiaryId).trim(),
        remitterMobile: cleanPayload.remitterMobile,
      });
    } catch (dbErr) {
      console.error(
        "[DMT Backend] Beneficiary DB deletion failed:",
        dbErr?.message || dbErr
      );
    }
  }

  return deleteResult;
};

// =============================================================
// Transaction Services
// =============================================================

//  Generate pre-transaction OTP

export const generateTransactionOtpService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await generateTransactionOtp(cleanPayload);
};

/**
 * Execute money transfer transaction (IMPS / NEFT)
 */
export const executeTransactionService = async (payload = {}) => {
  // const cleanPayload = sanitizePayload(payload);

  return await doTransaction(payload);
};

//  Check transaction status

export const checkTransactionStatusService = async (payload = {}) => {
  return await getTransactionStatus(payload);
};
