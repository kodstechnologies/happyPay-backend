import ApiResponse from "../../../utils/ApiResponse.js";
import ApiError from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getRemitterDetailsService,
  registerRemitterService,
  verifyRemitterOtpService,
  performRemitterEkycService,
  fetchBeneficiariesService,
  verifyBeneficiaryAccountService,
  addBeneficiaryService,
  verifyBeneficiaryService,
  deleteBeneficiaryService,
  verifyDeleteBeneficiaryOtpService,
  generateTransactionOtpService,
  executeTransactionService,
  checkTransactionStatusService,
  fetchBeneficiaries,
} from "../service/dmt.service.js";
import {
  verifyWalletBalance,
  processServiceWalletTransaction,
} from "../../wallet/services/wallet.service.js";

const getAuthFields = (user) => {
  const outletid = user?.outletid || user?.outletId ;
  const referenceKey = user?.referenceKey ||" BQXXFJeYaKfVh8OZhKDBMEofllxIpAqbHGKW1+It8USaOGfFXXU7FNSReycNR8ce";
  
  if (!outletid) throw ApiError.unauthorized("Outlet ID is missing from user session.");
  if (!referenceKey) throw ApiError.unauthorized("Reference Key is missing from user session.");
  
  return { outletid, referenceKey };
};

export const getRemitterDetailsController = asyncHandler(async (req, res) => {
  const authFields = getAuthFields(req.user);
  const payload = { 
    ...authFields,
    ...req.query, 
    ...req.params, 
    ...req.body,
    outletid: req.user?.outletid || req.user?.outletId || authFields.outletid,
  };
  const result = await getRemitterDetailsService(payload);

  const message = result?.isNewRegistration
    ? "New remitter detected. Registration initiated and OTP sent."
    : "Remitter details fetched successfully";

  return res.status(200).json(
    ApiResponse.success(
      result,
      message
    )
  );
});

export const registerRemitterController = asyncHandler(async (req, res) => {
  const authFields = getAuthFields(req.user);
  const payload = {
    ...authFields,
    ...req.body,
    referenceKey: req.body?.referenceKey || authFields.referenceKey,
  };
  const result = await registerRemitterService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Remitter registration initiated. OTP sent to registered mobile number"
    )
  );
});

export const verifyRemitterOtpController = asyncHandler(async (req, res) => {
  const authFields = getAuthFields(req.user);
  const payload = {
    ...authFields,
    ...req.body,
    referenceKey: req.body?.referenceKey || authFields.referenceKey,
  };
  const result = await verifyRemitterOtpService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Remitter OTP verified and registered successfully"
    )
  );
});

export const performRemitterEkycController = asyncHandler(async (req, res) => {
  const authFields = getAuthFields(req.user);
  const payload = {
    mobile: req.body.mobile,
    outletid: req.body?.outletid || req.user?.outletid || req.user?.outletId || authFields.outletid,
    referenceKey: req.body?.referenceKey ,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    txnid: req.body.txnid,
    ci: req.body.ci,
    hmac: req.body.hmac,
    Piddata: req.body.Piddata,
    ts: req.body.ts,
    dpId: req.body.dpId,
    dc: req.body.dc,
    mi: req.body.mi,
    mc: req.body.mc,
    rdsVer: req.body.rdsVer,
    rdsId: req.body.rdsId,
    sessionKey: req.body.sessionKey,
    srno: req.body.srno,
  };
  const result = await performRemitterEkycService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Remitter eKYC processed successfully"
    )
  );
});

// =============================================================
// Beneficiary Controllers
// =============================================================

export const fetchBeneficiariesController = asyncHandler(async (req, res) => {
  const payload = { 
    ...req.body,
    ...getAuthFields(req.user)
  };
  // fetchBeneficiaries call for get data from provider
  const result = await fetchBeneficiariesService(payload);
  // call this t get data from db
  // const result = await fetchBeneficiaries(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiaries fetched successfully"
    )
  );
});

export const verifyBeneficiaryAccountController = asyncHandler(async (req, res) => {
  const { outletid, referenceKey } = getAuthFields(req.user);
  const {
    accountNumber,
    bankIfsc,
    remitterMobile,
    txnid,
    latitude,
    longitude,
  } = req.body;

  const payload = {
    accountNumber,
    bankIfsc: bankIfsc.toUpperCase(),
    remitterMobile,
    txnid,
    latitude,
    longitude,
    outletid,
    referenceKey,
  };
  const result = await verifyBeneficiaryAccountService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary bank account verified successfully"
    )
  );
});

export const addBeneficiaryController = asyncHandler(async (req, res) => {
  const { outletid: sessionOutletId, referenceKey } = getAuthFields(req.user);
  const {
    bankId,
    outletid,
    name,
    ifsc,
    accountNumber,
    beneficiaryMobile,
    remitterMobile,
    verified,
  } = req.body;

  const payload = {
    bankId,
    outletid: outletid || sessionOutletId,
    name,
    ifsc: ifsc.toUpperCase(),
    accountNumber,
    beneficiaryMobile,
    remitterMobile,
    referenceKey,
    verified,
  };
  const result = await addBeneficiaryService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary added successfully"
    )
  );
});

export const verifyBeneficiaryController = asyncHandler(async (req, res) => {
  const { outletid: sessionOutletId, referenceKey: sessionRefKey } = getAuthFields(req.user);
  const { outletid, referenceKey, beneficiaryId, otp, remitterMobile } = req.body;

  const payload = {
    outletid: outletid || sessionOutletId,
    referenceKey: referenceKey || sessionRefKey,
    beneficiaryId,
    otp,
    remitterMobile,
  };
  const result = await verifyBeneficiaryService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary verified and added successfully"
    )
  );
});

export const deleteBeneficiaryController = asyncHandler(async (req, res) => {
  const { outletid, referenceKey } = getAuthFields(req.user);
  const { beneficiaryId, remitterMobile, outletid: bodyOutletId } = req.body;

  const payload = {
    beneficiaryId,
    remitterMobile,
    outletid: bodyOutletId || outletid,
    referenceKey: req.body.referenceKey || referenceKey,
  };
  const result = await deleteBeneficiaryService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary deletion OTP sent successfully"
    )
  );
});

export const verifyDeleteBeneficiaryOtpController = asyncHandler(async (req, res) => {
  const { outletid, referenceKey } = getAuthFields(req.user);
  const { beneficiaryId, remitterMobile, otp, outletid: bodyOutletId, referenceKey: bodyRefKey } = req.body;

  const payload = {
    beneficiaryId,
    remitterMobile,
    otp: String(otp).trim(),
    outletid: bodyOutletId || outletid,
    referenceKey: bodyRefKey || referenceKey,
  };
  const result = await verifyDeleteBeneficiaryOtpService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary deleted successfully"
    )
  );
});

// =============================================================
// Transaction Controllers
// =============================================================

export const generateTransactionOtpController = asyncHandler(async (req, res) => {
  const { outletid, referenceKey } = getAuthFields(req.user);
  const targetMobile = req.body.remitterMobile;
  const targetBeneId = req.body.beneficiaryId;

  const payload = {
    remitterMobile: targetMobile,
    amount: req.body.amount,
   beneficiaryId: targetBeneId,
    outletid: req.body.outletid || outletid,
    referenceKey: req.body.referenceKey || referenceKey,
  };
  const result = await generateTransactionOtpService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Transaction OTP generated successfully"
    )
  );
});

export const executeTransactionController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?._id || req.body?.userId;
  const transferAmount = Math.round(Number(req.body.amount || 0) * 100) / 100;

  // 1. Pre-flight guard: Ensure retailer has sufficient wallet balance before hitting provider
  if (userId && transferAmount > 0) {
    await verifyWalletBalance(userId, transferAmount);
  }

  const { outletid, referenceKey } = getAuthFields(req.user);
  const targetMobile = req.body.remitterMobile || req.body.mobile;
  const targetBeneId = req.body.bene_id || req.body.beneficiaryId;
  const targetTxnId = req.body.txnid || req.body.client_ref_id || `DMT_${Date.now()}`;
  const targetLatlong = req.body.latitude && req.body.longitude
    ? `${req.body.latitude},${req.body.longitude}`
    : req.body.latlong || "28.7041,77.1025";

  const payload = {
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    txnid: targetTxnId,
    amount: req.body.amount,
    mode: req.body.mode,
    ifsc: req.body.ifsc,
    referenceKey: req.body.referenceKey || referenceKey,
    account: req.body.account,
    remitterMobile: targetMobile,
    outletid: req.body.outletid || outletid,
    mobile: targetMobile,
    ...(targetBeneId ? { bene_id: targetBeneId } : {}),
    latlong: targetLatlong,
    client_ref_id: targetTxnId,
    otp: req.body?.otp || "",
  };
  const result = await executeTransactionService(payload);

  // 2. Determine provider success based on live gateway response structure
  // Live response: { status: "SUCCESS", msg: "Transaction Successful", data: { externalRef: "...", txnReferenceId: "...", txnValue: "100.00", beneficiaryName: "...", ... } }
  const isSuccess =
    result?.status === "SUCCESS" ||
    result?.msg === "Transaction Successful" ||
    result?.data?.status === "SUCCESS" ||
    Boolean(result?.data?.txnReferenceId);

  // 3. Atomically debit wallet and record ledger entry upon success
  if (isSuccess && userId && transferAmount > 0) {
    const dmtTxnId = String(
      result?.data?.externalRef ||
      result?.data?.txnReferenceId ||
      targetTxnId
    );

    const beneName = String(result?.data?.beneficiaryName || "").trim();
    const beneAccount = String(result?.data?.beneficiaryAccount || req.body.account || "").trim();
    const beneIfsc = String(result?.data?.beneficiaryIfsc || req.body.ifsc || "").trim().toUpperCase();
    const bankName = beneIfsc ? beneIfsc.slice(0, 4) : "Bank";
    const mode = String(req.body.mode || "IMPS").toUpperCase();
    const effectiveAmount = Number(result?.data?.txnValue || transferAmount);

    try {
      await processServiceWalletTransaction({
        userId,
        type: "debit",
        amount: effectiveAmount,
        service: "DMT",
        transactionId: dmtTxnId,
        payee: {
          bankName,
          accountNumber: beneAccount,
          ifscCode: beneIfsc,
          accountHolderName: beneName || undefined,
        },
        description: `DMT transfer of ₹${effectiveAmount.toFixed(2)} to ${beneName || 'Beneficiary'}${beneAccount ? ` (A/C: ••••${beneAccount.slice(-4)})` : ""} via ${mode}`,
        status: "success",
      });
    } catch (walletErr) {
      console.error("[DMT] Wallet ledger debit error:", walletErr?.message || walletErr);
      if (!walletErr?.message?.includes("duplicate")) {
        throw walletErr;
      }
    }
  }

  return res.status(200).json(
    ApiResponse.success(
      result,
      "DMT transaction processed successfully"
    )
  );
});

export const checkTransactionStatusController = asyncHandler(async (req, res) => {
  const payload = { 
    ...req.query, 
    ...req.params, 
    ...req.body,
    ...getAuthFields(req.user)
  };
  const result = await checkTransactionStatusService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Transaction status fetched successfully"
    )
  );
});
