import ApiResponse from "../../../utils/ApiResponse.js";
import {
  getRetailerKycDetails,
  recordEkycOutlet,
  checkLoginStatus,
  isKycRequired,
  onboardMerchantService,
  extractProviderEkycFields,
  normalizeAction,
  persistAepsEkycState,
  resolveAepsReferenceKey,
} from "../services/aeps.service.js";
import { resolveBankForAeps } from "../../bankMaster/services/bankMaster.service.js";
import {
  doEkyc,
  doBioEkyc,
  verifyTfa,
  balanceEnquiry,
  miniStatement,
  cashWithdraw,
  cashDeposite,
  sendOtp,
  outletRegister,
  outletRegisterVerify,
} from "../../external/services/provider.service.js";
import { updateEKYCStatus } from "../../auth/repository/user.repository.js";
import User from "../../auth/model/user.model.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import generate15CharTxnId from "../../../utils/generateTxnId.js";
import sanitizePayload from "../../../utils/sanitizePayload.js";
import {
  verifyWalletBalance,
  processServiceWalletTransaction,
  getUserWalletBalance,
} from "../../wallet/services/wallet.service.js";
import { calculateTransactionPricing } from "../../pricing/services/pricingEngine.service.js";
import { sendWalletTransferNotification } from "../../notifications/services/notification.services.js";

/* ==============================
   Get Retailer KYC Details Controller
============================== */

const getRetailerKycDetailsController = async (req, res) => {
  try {
    const { retailerId } = req.params;

    console.log("Fetching KYC details for retailer:", retailerId);

    const kycDetails = await getRetailerKycDetails(retailerId);

    return res.status(200).json(
      ApiResponse.success(
        kycDetails,
        "Retailer KYC details fetched successfully"
      )
    );
  } catch (error) {
    console.log("Error fetching KYC details:", error.message);

    return res
      .status(error.statusCode || 500)
      .json(
        ApiResponse.error(
          error.message || "Failed to fetch KYC details"
        )
      );
  }
};

const doEkycController = async (req, res) => {
  const { outlet_id, userId: bodyUserId } = req.body;
  const userId = bodyUserId || req.user?.userId || req.user?._id || req.user?.id;

  try {
    if (!outlet_id) {
      return res.status(400).json(
        ApiResponse.error("outlet_id is required", null, null, 400)
      );
    }

    const payload = {
      outlet_id,
    };

    const result = await doEkyc(payload);
    console.log("-------------result", result);

    // Determine eKYC status, action, referenceKey, and pidOptionWadh from provider response
    const fields = extractProviderEkycFields(result);
    const providerStatus = String(
      result?.status || result?.data?.status || fields.status || ""
    ).trim().toUpperCase();
    const providerAction = normalizeAction(fields.action);
    const kycRequired = isKycRequired(result);
    const referenceKey = fields.referenceKey;
    const pidOptionWadh = fields.pidOptionWadh;

    const isNoActionRequired =
      providerAction === "NO-ACTION-REQUIRED" ||
      fields.innerStatus.toUpperCase() === "APPROVED";

    const isActionRequired =
      !isNoActionRequired &&
      (providerAction === "ACTION-REQUIRED" || kycRequired);

    if (isNoActionRequired) {
      const saved = await persistAepsEkycState({
        userId,
        outletId: outlet_id,
        referenceKey,
        pidOptionWadh,
        eKYCStatus: "COMPLETED",
        eKYCRejectionReason: null,
      });

      return res.status(200).json(
        ApiResponse.success(
          {
            provider: result,
            status: "NO-ACTION-REQUIRED",
            statusCode: 200,
            message: "NO-ACTION-REQUIRED",
            referenceKey: referenceKey || saved?.referenceKey || null,
            pidOptionWadh: pidOptionWadh || saved?.pidOptionWadh || null,
            ekyc: saved,
            eKYCStatus: "COMPLETED",
          },
          "NO-ACTION-REQUIRED",
          null,
          200
        )
      );
    }

    if (isActionRequired) {
      if (!referenceKey) {
        const gatewayMsg =
          result?.msg ||
          result?.message ||
          result?.data?.msg ||
          result?.data?.message ||
          "referenceKey not found in provider response";
        return res.status(400).json(
          ApiResponse.error(gatewayMsg, result || null, null, 400)
        );
      }

      const saved = await persistAepsEkycState({
        userId,
        outletId: outlet_id,
        referenceKey,
        pidOptionWadh,
        eKYCStatus: "ACTION_REQUIRED",
        eKYCRejectionReason: null,
      });

      return res.status(200).json(
        ApiResponse.success(
          {
            provider: result,
            status: "ACTION-REQUIRED",
            statusCode: 200,
            message: "ACTION-REQUIRED",
            referenceKey,
            pidOptionWadh,
            ekyc: saved,
            kycRequired: true,
            eKYCStatus: "ACTION_REQUIRED",
          },
          "ACTION-REQUIRED",
          null,
          200
        )
      );
    }

    if (providerStatus === "FAILED" || providerStatus === "REJECTED" || providerStatus === "ERROR") {
      const rejectionReason =
        result?.msg ||
        result?.message ||
        result?.data?.msg ||
        result?.data?.message ||
        "eKYC verification failed";

      await persistAepsEkycState({
        userId,
        outletId: outlet_id,
        referenceKey,
        pidOptionWadh,
        eKYCStatus: "FAILED",
        eKYCRejectionReason: rejectionReason,
      });

      return res.status(400).json(
        ApiResponse.error(
          rejectionReason,
          {
            provider: result,
            status: "FAILED",
            statusCode: 400,
            message: rejectionReason,
            referenceKey: referenceKey || null,
            pidOptionWadh: pidOptionWadh || null,
            kycRequired: false,
            eKYCStatus: "FAILED",
          },
          null,
          400
        )
      );
    }

    if (providerStatus === "COMPLETED" || providerStatus === "SUCCESS") {
      const saved = await persistAepsEkycState({
        userId,
        outletId: outlet_id,
        referenceKey,
        pidOptionWadh,
        eKYCStatus: "COMPLETED",
        eKYCRejectionReason: null,
      });

      return res.status(200).json(
        ApiResponse.success(
          {
            provider: result,
            status: "COMPLETED",
            statusCode: 200,
            message: result?.msg || result?.message || "eKYC completed successfully",
            referenceKey: referenceKey || saved?.referenceKey || null,
            pidOptionWadh: pidOptionWadh || saved?.pidOptionWadh || null,
            ekyc: saved,
            kycRequired: false,
            eKYCStatus: "COMPLETED",
          },
          result?.msg || result?.message || "eKYC completed successfully",
          null,
          200
        )
      );
    }

    // Default fallback
    const saved = await persistAepsEkycState({
      userId,
      outletId: outlet_id,
      referenceKey,
      pidOptionWadh,
    });

    return res.status(200).json(
      ApiResponse.success(
        {
          provider: result,
          status: "SUCCESS",
          statusCode: 200,
          message: "eKYC status checked successfully",
          referenceKey: referenceKey || saved?.referenceKey || null,
          pidOptionWadh: pidOptionWadh || saved?.pidOptionWadh || null,
          ekyc: saved,
          kycRequired: false,
          eKYCStatus: saved?.eKYCStatus || "PENDING",
        },
        "eKYC status checked successfully",
        null,
        200
      )
    );
  } catch (error) {
    console.log("Error checking eKYC status:", error?.message);

    const providerData = error?.providerData || error?.response?.data;
    let actualMessage =
      error?.message ||
      providerData?.msg ||
      providerData?.message ||
      providerData?.details?.msg ||
      providerData?.details?.message;

    if (typeof actualMessage === "object" && actualMessage !== null) {
      try {
        actualMessage = Object.values(actualMessage).flat().filter(Boolean).join(", ");
      } catch {
        actualMessage = JSON.stringify(actualMessage);
      }
    }

    if (!actualMessage || String(actualMessage).toLowerCase().startsWith("request failed with status code")) {
      actualMessage =
        providerData?.msg ||
        providerData?.message ||
        providerData?.error ||
        "Failed to check eKYC status at bank gateway";
    }

    const fields = extractProviderEkycFields(providerData || error);
    const providerAction = normalizeAction(fields.action);
    const providerTxnStatus = String(fields.innerStatus || fields.status || "")
      .trim()
      .toUpperCase();

    // Provider sometimes returns "already completed" as an error payload
    // (status FAILED wrapper with action NO-ACTION-REQUIRED / status APPROVED
    // nested inside). Treat it as a successful completion and persist referenceKey if present.
    if (
      providerAction === "NO-ACTION-REQUIRED" ||
      providerTxnStatus === "APPROVED"
    ) {
      const saved = await persistAepsEkycState({
        userId,
        outletId: outlet_id,
        referenceKey: fields.referenceKey,
        pidOptionWadh: fields.pidOptionWadh,
        eKYCStatus: "COMPLETED",
        eKYCRejectionReason: null,
      });

      return res.status(200).json(
        ApiResponse.success(
          {
            provider: providerData,
            status: "NO-ACTION-REQUIRED",
            statusCode: 200,
            message: String(actualMessage),
            referenceKey: fields.referenceKey || saved?.referenceKey || null,
            pidOptionWadh: fields.pidOptionWadh || saved?.pidOptionWadh || null,
            ekyc: saved,
            kycRequired: false,
            eKYCStatus: "COMPLETED",
          },
          String(actualMessage),
          null,
          200
        )
      );
    }

    // Even when check-ekyc fails (e.g. "Outlet not yet registered with bank" or
    // ACTION-REQUIRED wrapped as error), persist any returned referenceKey/pidOptionWadh.
    if (fields.referenceKey || fields.pidOptionWadh) {
      await persistAepsEkycState({
        userId,
        outletId: outlet_id,
        referenceKey: fields.referenceKey,
        pidOptionWadh: fields.pidOptionWadh,
      });
    }

    const rawStatus = Number(error?.statusCode || error?.response?.status || providerData?.statusCode || providerData?.code);
    const resolvedStatus = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 400;

    return res.status(resolvedStatus).json(
      ApiResponse.error(
        String(actualMessage),
        providerData || null,
        null,
        resolvedStatus
      )
    );
  }
};

const biometricFields = [
  "outlet_id",
  "referenceKey",
  "latitude",
  "longitude",
  "dc",
  "ci",
  "hmac",
  "mc",
  "dpId",
  "PidDatatype",
  "Piddata",
  "rdsId",
  "rdsVer",
  "sessionKey",
  "mi",
  "errInfo",
  "errCode",
  "fCount",
  "fType",
  "iCount",
  "iType",
  "pCount",
  "pType",
  "srno",
  "qScore",
  "nmPoints",
  "sysid",
  "ts"
];

const pickFields = (body, fields) =>
  Object.fromEntries(fields.map((field) => [field, body?.[field]]));

const biometricDefaults = {
  fCount: "1",
  fType: "2",
  iCount: "0",
  iType: "0",
  pCount: "0",
  pType: "0",
};

const withBiometricDefaults = (payload) => {
  const next = { ...payload };

  for (const [key, fallback] of Object.entries(biometricDefaults)) {
    if (next[key] == null || String(next[key]).trim() === "") {
      next[key] = fallback;
    }
  }

  return {
    ...next,
    i_count: next.iCount,
    i_type: next.iType,
    f_count: next.fCount,
    f_type: next.fType,
    p_count: next.pCount,
    p_type: next.pType,
  };
};

const doBioEkycController = asyncHandler(async (req, res) => {
  const userId = req.body.userId || req.user?.userId || req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json(
      ApiResponse.error("User ID is required to perform biometric eKYC")
    );
  }

  const rawInputRefKey =
    req.body.referenceKey ||
    req.body.referencekey ||
    req.body.ReferenceKey ||
    req.body.reference_key ||
    req.body.refKey;

  const inputRefKey = await resolveAepsReferenceKey({
    userId,
    outletId: req.body.outlet_id,
    providedReferenceKey: rawInputRefKey,
  });

  const rawBiometric = pickFields(req.body, biometricFields);
  if (inputRefKey && !rawBiometric.referenceKey) {
    rawBiometric.referenceKey = inputRefKey;
  }

  const payload = withBiometricDefaults(rawBiometric);
  if (inputRefKey) {
    payload.referenceKey = inputRefKey;
    payload.referencekey = inputRefKey;
  }

  console.log("========== DO BIO EKYC PAYLOAD ==========");
  console.log("payload:", payload);
  console.log("=======================================");

  let result;
  try {
    result = await doBioEkyc(payload);
  } catch (error) {
    console.log("doBioEkyc error:", error);

    // Check for AEPS activation pending or already completed
    const providerData = error?.providerData || error?.response?.data;
    let actualMessage =
      error?.message ||
      providerData?.msg ||
      providerData?.message ||
      providerData?.details?.msg ||
      providerData?.details?.message;

    if (typeof actualMessage === "object" && actualMessage !== null) {
      try {
        actualMessage = Object.values(actualMessage).flat().filter(Boolean).join(", ");
      } catch {
        actualMessage = JSON.stringify(actualMessage);
      }
    }

    const errFields = extractProviderEkycFields(providerData || error);
    const effectiveRefKey = errFields.referenceKey || inputRefKey;
    const effectiveWadh = errFields.pidOptionWadh || payload.pidOptionWadh;
    const errAction = normalizeAction(errFields.action);
    const errInnerStatus = String(errFields.innerStatus || errFields.status || "").trim().toUpperCase();
    const lowerMessage = typeof actualMessage === "string" ? actualMessage.toLowerCase() : "";

    if (
      errAction === "NO-ACTION-REQUIRED" ||
      errInnerStatus === "APPROVED" ||
      lowerMessage.includes("already completed") ||
      lowerMessage.includes("no action required")
    ) {
      const saved = await persistAepsEkycState({
        userId,
        outletId: payload.outlet_id,
        referenceKey: effectiveRefKey,
        pidOptionWadh: effectiveWadh,
        eKYCStatus: "COMPLETED",
        eKYCRejectionReason: null,
      });

      return res.status(200).json(
        ApiResponse.success(
          {
            provider: providerData,
            ekyc: saved,
            referenceKey: effectiveRefKey || saved?.referenceKey || null,
          },
          "Biometric eKYC completed successfully"
        )
      );
    }

    // Check if error is about AEPS activation pending
    if (
      lowerMessage.includes("aeps activation pending") ||
      lowerMessage.includes("activation is pending") ||
      lowerMessage.includes("pending at the bank") ||
      lowerMessage.includes("pending from the bank")
    ) {
      await persistAepsEkycState({
        userId,
        outletId: payload.outlet_id,
        referenceKey: effectiveRefKey,
        pidOptionWadh: effectiveWadh,
        eKYCStatus: "PENDING",
        eKYCRejectionReason: actualMessage,
      });

      return res.status(400).json(
        ApiResponse.error(
          "AEPS activation is pending from the bank",
          {
            provider: providerData,
            status: "PENDING",
            eKYCStatus: "PENDING",
            referenceKey: effectiveRefKey || null,
          },
          null,
          400
        )
      );
    }

    if (effectiveRefKey || effectiveWadh) {
      await persistAepsEkycState({
        userId,
        outletId: payload.outlet_id,
        referenceKey: effectiveRefKey,
        pidOptionWadh: effectiveWadh,
      });
    }

    throw error;
  }

  console.log("====================================result", result);

  // Extract referenceKey and pidOptionWadh from the provider response
  const fields = extractProviderEkycFields(result);
  const referenceKey =
    fields.referenceKey ||
    payload.referenceKey ||
    inputRefKey;
  const pidOptionWadh =
    fields.pidOptionWadh ||
    payload.pidOptionWadh;

  if (!referenceKey) {
    return res.status(400).json(
      ApiResponse.error("referenceKey not found in provider response or request")
    );
  }

  const saved = await persistAepsEkycState({
    userId,
    outletId: payload.outlet_id,
    referenceKey,
    pidOptionWadh,
    eKYCStatus: "COMPLETED",
    eKYCRejectionReason: null,
  });

  return res.status(200).json(
    ApiResponse.success(
      {
        provider: result,
        ekyc: saved,
      },
      "Biometric eKYC completed successfully"
    )
  );
});

const verifyTfaController = async (req, res) => {
  try {
    const { actcode, aadhaar } = req.body;

    // Step 1: Check whether actcode is provided
    if (!actcode) {
      return res.status(400).json(
        ApiResponse.error("actcode is required")
      );
    }

    // Step 2: Check whether Aadhaar is provided
    if (!aadhaar) {
      return res.status(400).json(
        ApiResponse.error("aadhaar is required")
      );
    }

    // Step 3: Check whether TFA login is required
    if (actcode !== "LOGINREQUIRED") {
      return res.status(200).json(
        ApiResponse.success(
          {
            actcode,
            tfaRequired: false,
            verified: false,
          },
          "TFA verification is not required"
        )
      );
    }

    // Step 4: Prepare the existing biometric payload
    const payload = pickFields(req.body, [
      ...biometricFields,
      "aadhaar",
      "ts",
    ]);

    const tfaUserId = req.user?.userId || req.user?._id || req.user?.id;
    if (!payload.referenceKey) {
      const resolvedRefKey = await resolveAepsReferenceKey({
        userId: tfaUserId,
        outletId: payload.outlet_id,
        providedReferenceKey: payload.referenceKey,
      });
      if (resolvedRefKey) {
        payload.referenceKey = resolvedRefKey;
      }
    }

    // Step 5: Verify TFA only when actcode is LOGINREQUIRED
    const result = await verifyTfa(payload);

    // Step 6: Deduct ₹1 from retailer wallet after successful TFA verification
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    console.log("===== TFA VERIFICATION WALLET DEDUCTION START =====");
    console.log("User ID:", userId);
    console.log("Auth User:", req.user);

    if (userId) {
      try {
        console.log("Step 1: Checking wallet balance...");
        // Verify wallet has sufficient balance (at least ₹1)
        const walletCheck = await verifyWalletBalance(userId, 1);
        console.log("Wallet check passed:", walletCheck);

        console.log("Step 2: Processing wallet transaction...");
        // Process wallet transaction - debit ₹1 for TFA verification
        const walletTxn = await processServiceWalletTransaction({
          userId,
          type: "debit",
          amount: 1,
          service: "AEPS",
          transactionId: generate15CharTxnId("TFA"),
          description: "Daily 2FA Authentication Fee",
          status: "success",
        });
        console.log("Wallet transaction successful:", walletTxn);

        console.log("Step 3: Getting updated wallet balance...");
        // Get updated wallet balance
        const walletData = await getUserWalletBalance(userId);
        console.log("Updated wallet data:", walletData);

        console.log("===== TFA VERIFICATION WALLET DEDUCTION SUCCESS =====");

        return res.status(200).json(
          ApiResponse.success(
            {
              ...result,
              wallet: walletData,
              transaction: walletTxn.transaction,
            },
            "TFA verified successfully"
          )
        );
      } catch (walletError) {
        console.error("===== TFA VERIFICATION WALLET DEDUCTION FAILED =====");
        console.error("Error details:", walletError);
        console.error("Error message:", walletError.message);
        console.error("Error statusCode:", walletError.statusCode);
        console.error("Error stack:", walletError.stack);
        console.error("=====================================================");

        // Return TFA success even if wallet deduction fails (non-critical)
        return res.status(200).json(
          ApiResponse.success(
            result,
            "TFA verified successfully (wallet deduction skipped)"
          )
        );
      }
    }

    return res.status(200).json(
      ApiResponse.success(
        result,
        "TFA verified successfully"
      )
    );
  } catch (error) {
    return res
      .status(error.statusCode || error.response?.status || 500)
      .json(
        ApiResponse.error(
          error.response?.data?.message ||
          error.message ||
          "Failed to verify TFA"
        )
      );
  }
};

const loginStatusController = async (req, res) => {
  try {
    const result = await checkLoginStatus({
      userId: req.user?.userId,
      outletId: req.user?.outlet_id || req.user?.outletId || req.user?.outletid || req.body?.outlet_id,
    });

    return res.status(200).json(
      ApiResponse.success(result, "Login status fetched successfully")
    );
  } catch (error) {
    return res
      .status(error.statusCode || error.response?.status || 500)
      .json(
        ApiResponse.error(
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch login status"
        )
      );
  }
};

const balanceEnquiryController = async (req, res) => {
  try {
    const {
      outlet_id,
      referenceKey,
      latitude,
      longitude,
      aadhaar,
      mobile,
      bankiin: rawBankiin,
      bankMasterId,
      ts,
      // Biometric fields
      dc,
      ci,
      hmac,
      mc,
      dpId,
      PidDatatype,
      Piddata,
      rdsId,
      rdsVer,
      sessionKey,
      mi,
      errInfo,
      errCode,
      fCount,
      fType,
      iCount,
      iType,
      pCount,
      pType,
      qScore,
      nmPoints,
      srno,
      sysid,

    } = req.body;

    // ── Bank Master resolution ──────────────────────────────────────────────
    // Prefer bankMasterId resolution (validates isActive + aeps.enabled).
    // Fall back to raw bankiin for older clients or manual overrides.
    let bankiin = rawBankiin;
    if (bankMasterId) {
      const bmBank = await resolveBankForAeps(String(bankMasterId));
      bankiin = bmBank.iin;
      console.log(`[AEPS BalanceEnquiry] Resolved bankiin=${bankiin} from BankMaster ${bankMasterId}`);
    }
    // ───────────────────────────────────────────────────────────────────────

    const userId = req.user?.userId || req.user?._id || req.user?.id || req.body?.userId;
    const resolvedReferenceKey = await resolveAepsReferenceKey({
      userId,
      outletId: outlet_id,
      providedReferenceKey: referenceKey,
    });

    // Prepare payload for provider API
    const payload = {
      outlet_id,
      ...(resolvedReferenceKey ? { referenceKey: resolvedReferenceKey } : {}),
      latitude,
      longitude,
      aadhaar,
      mobile,
      bankiin,
      ts,
      // Include biometric fields if provided
      ...(dc && { dc }),
      ...(ci && { ci }),
      ...(hmac && { hmac }),
      ...(mc && { mc }),
      ...(dpId && { dpId }),
      ...(PidDatatype && { PidDatatype }),
      ...(Piddata && { Piddata }),
      ...(rdsId && { rdsId }),
      ...(rdsVer && { rdsVer }),
      ...(sessionKey && { sessionKey }),
      ...(mi && { mi }),
      ...(errInfo && { errInfo }),
      ...(errCode && { errCode }),
      ...(fCount && { fCount }),
      ...(fType && { fType }),
      ...(iCount && { iCount }),
      ...(iType && { iType }),
      ...(pCount && { pCount }),
      ...(pType && { pType }),
      ...(qScore && { qScore }),
      ...(nmPoints && { nmPoints }),
      ...(srno && { srno }),
      ...(sysid && { sysid }),
    };

    console.log("Balance Enquiry Payload:", payload);

    // Call provider API
    const result = await balanceEnquiry(payload);

    console.log("Balance Enquiry Response:", result);

    return res.status(200).json(
      ApiResponse.success(
        result,
        "Balance enquiry completed successfully"
      )
    );
  } catch (error) {
    console.error("Balance Enquiry Error:", error);

    return res
      .status(error.statusCode || error.response?.status || 500)
      .json(
        ApiResponse.error(
          error.response?.data?.message ||
          error.message ||
          "Failed to complete balance enquiry",
          error.response?.data || error.providerData || null,
          null,
          error.statusCode || error.response?.status || 500
        )
      );
  }
};

const miniStatementController = async (req, res) => {
  try {
    const {
      outlet_id,
      referenceKey,
      latitude,
      longitude,
      aadhaar,
      mobile,
      bankiin: rawBankiin,
      bankMasterId,
      ts,
      // Biometric fields
      dc,
      ci,
      hmac,
      mc,
      dpId,
      PidDatatype,
      Piddata,
      rdsId,
      rdsVer,
      sessionKey,
      mi,
      errInfo,
      errCode,
      fCount,
      fType,
      iCount,
      iType,
      pCount,
      pType,
      qScore,
      nmPoints,
      srno,
      sysid,

    } = req.body;

    // ── Bank Master resolution ──────────────────────────────────────────────
    let bankiin = rawBankiin;
    if (bankMasterId) {
      const bmBank = await resolveBankForAeps(String(bankMasterId));
      bankiin = bmBank.iin;
      console.log(`[AEPS MiniStatement] Resolved bankiin=${bankiin} from BankMaster ${bankMasterId}`);
    }
    // ───────────────────────────────────────────────────────────────────────

    const userId = req.user?.userId || req.user?._id || req.user?.id || req.body?.userId;
    const resolvedReferenceKey = await resolveAepsReferenceKey({
      userId,
      outletId: outlet_id,
      providedReferenceKey: referenceKey,
    });

    // Prepare payload for provider API
    const payload = {
      outlet_id,
      ...(resolvedReferenceKey ? { referenceKey: resolvedReferenceKey } : {}),
      latitude,
      longitude,
      aadhaar,
      mobile,
      bankiin,
      ts,
      // Include biometric fields if provided
      ...(dc && { dc }),
      ...(ci && { ci }),
      ...(hmac && { hmac }),
      ...(mc && { mc }),
      ...(dpId && { dpId }),
      ...(PidDatatype && { PidDatatype }),
      ...(Piddata && { Piddata }),
      ...(rdsId && { rdsId }),
      ...(rdsVer && { rdsVer }),
      ...(sessionKey && { sessionKey }),
      ...(mi && { mi }),
      ...(errInfo && { errInfo }),
      ...(errCode && { errCode }),
      ...(fCount && { fCount }),
      ...(fType && { fType }),
      ...(iCount && { iCount }),
      ...(iType && { iType }),
      ...(pCount && { pCount }),
      ...(pType && { pType }),
      ...(qScore && { qScore }),
      ...(nmPoints && { nmPoints }),
      ...(srno && { srno }),
      ...(sysid && { sysid }),
    };

    console.log("===== MINI STATEMENT START =====");
    console.log("Mini Statement Payload:", payload);

    // Call provider API
    const result = await miniStatement(payload);

    console.log("Mini Statement Response:", result);
    console.log("Mini Statement Successful");

    // Step: Credit ₹1 to retailer wallet after successful mini statement
    console.log("===== MINI STATEMENT WALLET CREDIT START =====");
    console.log("User ID:", userId);

    let walletData = null;
    let walletTxn = null;

    if (userId) {
      try {
        console.log("Step 1: Checking cashback eligibility...");
        // Check if customer already received cashback today for mini statement
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const Transaction = require("../../transaction/model/transaction.model").default;
        const Wallet = require("../../wallet/model/wallet.model").default;

        // Get retailer's wallet
        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
          console.log("Wallet not found for retailer, skipping cashback");
        } else {
          // Check if cashback already given today for this customer
          const existingCashback = await Transaction.findOne({
            wallet: wallet._id,
            type: "credit",
            service: "AEPS",
            status: "success",
            description: "Mini Statement Service Credit",
            "payee.mobile": mobile,
            createdAt: {
              $gte: today,
              $lt: tomorrow,
            },
          });

          if (existingCashback) {
            console.log("Cashback already given today for this customer. Skipping cashback.");
            console.log("Existing cashback transaction:", existingCashback.transactionId);
          } else {
            console.log("Step 2: Processing wallet credit transaction...");
            // Process wallet transaction - credit ₹1 for mini statement
            walletTxn = await processServiceWalletTransaction({
              userId,
              type: "credit",
              amount: 1,
              service: "AEPS",
              transactionId: generate15CharTxnId("MST"),
              description: "Mini Statement Service Credit",
              status: "success",
              payee: {
                mobile: mobile,
                aadharNumber: aadhaar,
              },
            });
            console.log("Wallet credit transaction successful:", walletTxn);

            console.log("Step 3: Getting updated wallet balance...");
            // Get updated wallet balance
            walletData = await getUserWalletBalance(userId);
            console.log("Updated wallet data:", walletData);

            console.log("Step 4: Sending cashback notification to retailer...");
            // Send notification to retailer about cashback
            sendWalletTransferNotification({
              recipientId: userId,
              type: "WALLET_CREDIT",
              title: "Cashback Received",
              body: "You received ₹1 cashback for Mini Statement service.",
              data: {
                service: "AEPS",
                serviceName: "Mini Statement",
                amount: "1",
                transactionId: walletTxn?.transaction?.transactionId || "",
              },
            }).catch((err) => console.error("Failed to send cashback notification:", err));
            console.log("Cashback notification sent successfully");

            console.log("===== MINI STATEMENT WALLET CREDIT SUCCESS =====");
          }
        }
      } catch (walletError) {
        console.error("===== MINI STATEMENT WALLET CREDIT FAILED =====");
        console.error("Error details:", walletError);
        console.error("Error message:", walletError.message);
        console.error("Error statusCode:", walletError.statusCode);
        console.error("Error stack:", walletError.stack);
        console.error("======================================================");
        // Continue with response even if wallet credit fails (non-critical)
      }
    }

    return res.status(200).json(
      ApiResponse.success(
        {
          ...result,
          wallet: walletData,
          transaction: walletTxn?.transaction,
        },
        "Mini statement fetched successfully"
      )
    );
  } catch (error) {
    console.error("===== MINI STATEMENT ERROR =====");
    console.error("Mini Statement Error:", error);
    console.error("===============================");

    return res
      .status(error.statusCode || error.response?.status || 500)
      .json(
        ApiResponse.error(
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch mini statement",
          error.response?.data || error.providerData || null,
          null,
          error.statusCode || error.response?.status || 500
        )
      );
  }
};

const cashWithdrawController = async (req, res) => {
  try {
    const {
      outlet_id,
      referenceKey,
      latitude,
      longitude,
      aadhaar,
      mobile,
      bankiin: rawBankiin,
      bankMasterId,
      amount,
      ts,
      // Biometric fields
      dc,
      ci,
      hmac,
      mc,
      dpId,
      PidDatatype,
      Piddata,
      rdsId,
      rdsVer,
      sessionKey,
      mi,
      errInfo,
      errCode,
      fCount,
      fType,
      iCount,
      iType,
      pCount,
      pType,
      qScore,
      nmPoints,
      srno,
      sysid,

    } = req.body;

    // ── Bank Master resolution ──────────────────────────────────────────────
    let bankiin = rawBankiin;
    if (bankMasterId) {
      const bmBank = await resolveBankForAeps(String(bankMasterId));
      bankiin = bmBank.iin;
      console.log(`[AEPS CashWithdraw] Resolved bankiin=${bankiin} from BankMaster ${bankMasterId}`);
    }
    // ───────────────────────────────────────────────────────────────────────

    const userId = req.user?.userId || req.user?._id || req.user?.id || req.body?.userId;
    const resolvedReferenceKey =
      Number(amount) > 5000
        ? await resolveAepsReferenceKey({
            userId,
            outletId: outlet_id,
            providedReferenceKey: referenceKey,
          })
        : referenceKey;

    const txnid = generate15CharTxnId("TXN")
    // Prepare payload for provider API
    const payload = {
      outlet_id,
      ...(resolvedReferenceKey ? { referenceKey: resolvedReferenceKey } : { referenceKey }),
      txnid,
      latitude,
      longitude,
      aadhaar,
      mobile,
      bankiin,
      amount,
      ts,
      // Include biometric fields if provided
      ...(dc && { dc }),
      ...(ci && { ci }),
      ...(hmac && { hmac }),
      ...(mc && { mc }),
      ...(dpId && { dpId }),
      ...(PidDatatype && { PidDatatype }),
      ...(Piddata && { Piddata }),
      ...(rdsId && { rdsId }),
      ...(rdsVer && { rdsVer }),
      ...(sessionKey && { sessionKey }),
      ...(mi && { mi }),
      ...(errInfo && { errInfo }),
      ...(errCode && { errCode }),
      ...(fCount && { fCount }),
      ...(fType && { fType }),
      ...(iCount && { iCount }),
      ...(iType && { iType }),
      ...(pCount && { pCount }),
      ...(pType && { pType }),
      ...(qScore && { qScore }),
      ...(nmPoints && { nmPoints }),
      ...(srno && { srno }),
      ...(sysid && { sysid }),
    };

    console.log("Cash Withdraw Payload:", payload);

    // Call provider API
    const result = await cashWithdraw(payload);

    console.log("Cash Withdraw Response:", result);

    // Determine provider success based on live gateway response structure
    // Live response: { status: "SUCCESS", msg: "Transaction Successful", txnid: "...", rrn: "...", ... }
    const isSuccess =
      result?.status === "SUCCESS" ||
      result?.msg === "Transaction Successful" ||
      Boolean(result?.txnid);

    const withdrawAmount = Math.round(Number(amount || result?.amount || 0) * 100) / 100;

    // Atomically credit retailer wallet & log AEPS transaction history
    if (isSuccess && userId && withdrawAmount > 0) {
      const aepsTxnId = String(result?.txnid || txnid || generate15CharTxnId("TXN"));
      const bankName = String(result?.name || bankiin || "Bank").trim();
      const aadharMasked = aadhaar ? `•••• •••• ${String(aadhaar).slice(-4)}` : "";

      const pricing = await calculateTransactionPricing({
        userId,
        service: "AEPS",
        category: "Cash Withdrawal",
        amount: withdrawAmount,
      });

      try {
        const walletTxn = await processServiceWalletTransaction({
          userId,
          type: "credit",
          amount: withdrawAmount,
          service: "AEPS",
          transactionId: aepsTxnId,
          commissionEarned: pricing.retailerCommission,
          charges: pricing.charges,
          distributorCommission: pricing.distributorCommission,
          distributorId: pricing.distributorId,
          commissionBreakdown: pricing.commissionBreakdown,
          payee: {
            bankName,
            aadharNumber: aadharMasked || undefined,
            accountHolderName: result?.name || undefined,
          },
          description: `AEPS Cash Withdrawal of ₹${withdrawAmount.toFixed(2)} from ${bankName}${aadharMasked ? ` (${aadharMasked})` : ""}`,
          status: "success",
        });

        // Send notification about commission earned
        if (pricing.retailerCommission > 0) {
          sendWalletTransferNotification({
            recipientId: userId,
            type: "WALLET_CREDIT",
            title: "Commission Earned",
            body: `You earned ₹${pricing.retailerCommission.toFixed(2)} commission for Cash Withdrawal service.`,
            data: {
              service: "AEPS",
              serviceName: "Cash Withdrawal",
              amount: String(pricing.retailerCommission),
              transactionId: aepsTxnId,
            },
          }).catch((err) => console.error("Failed to send commission notification:", err));
        }
      } catch (walletErr) {
        console.error("[AEPS] Wallet ledger credit error:", walletErr?.message || walletErr);
        if (!walletErr?.message?.includes("duplicate")) {
          throw walletErr;
        }
      }
    }

    return res.status(200).json(
      ApiResponse.success(
        {
          ...result,
          amount,
        },
        "Cash withdrawal completed successfully"
      )
    );
  } catch (error) {
    console.error("Cash Withdraw Error:", error);

    return res
      .status(error.statusCode || error.response?.status || 500)
      .json(
        ApiResponse.error(
          error.response?.data?.message ||
          error.message ||
          "Failed to complete cash withdrawal",
          error.response?.data || error.providerData || null,
          null,
          error.statusCode || error.response?.status || 500
        )
      );
  }
};

const sendOtpController = async (req, res) => {
  try {
    const {
      outlet_id,
      referenceKey,
      latitude,
      longitude,
      aadhaar,
      MobileNumber,
      bankiin: rawBankiin,
      bankMasterId,
      amount,
    } = req.body;

    // ── Bank Master resolution ──────────────────────────────────────────────
    let bankiin = rawBankiin;
    if (bankMasterId) {
      const bmBank = await resolveBankForAeps(String(bankMasterId));
      bankiin = bmBank.iin;
      console.log(`[AEPS SendOtp] Resolved bankiin=${bankiin} from BankMaster ${bankMasterId}`);
    }
    // ───────────────────────────────────────────────────────────────────────

    const userId = req.user?.userId || req.user?._id || req.user?.id || req.body?.userId;
    const resolvedReferenceKey = await resolveAepsReferenceKey({
      userId,
      outletId: outlet_id,
      providedReferenceKey: referenceKey,
    });

    // Prepare payload for provider API
    const payload = {
      outlet_id,
      ...(resolvedReferenceKey ? { referenceKey: resolvedReferenceKey } : {}),
      latitude,
      longitude,
      aadhaar,
      MobileNumber,
      bankiin,
      amount,
    };

    console.log("Send OTP Payload:", payload);

    // Call provider API
    const result = await sendOtp(payload);

    console.log("Send OTP Response:", result);

    return res.status(200).json(
      ApiResponse.success(
        result,
        "OTP sent successfully"
      )
    );
  } catch (error) {
    console.error("Send OTP Error:", error);

    return res
      .status(error.statusCode || error.response?.status || 500)
      .json(
        ApiResponse.error(
          error.response?.data?.message ||
          error.message ||
          "Failed to send OTP",
          error.response?.data || error.providerData || null,
          null,
          error.statusCode || error.response?.status || 500
        )
      );
  }
};

/* ==============================
   Cash Deposit Controller
============================== */

const cashDepositController = async (req, res) => {
  try {
    const {
      txnid,
      outlet_id,
      referenceKey,
      latitude,
      longitude,
      aadhaar,
      mobile,
      bankiin: rawBankiin,
      bankMasterId,
      amount,
      ts,
      // Biometric fields
      dc,
      ci,
      hmac,
      mc,
      dpId,
      PidDatatype,
      Piddata,
      rdsId,
      rdsVer,
      sessionKey,
      mi,
      errInfo,
      errCode,
      fCount,
      fType,
      iCount,
      iType,
      pCount,
      pType,
      qScore,
      nmPoints,
      srno,
      sysid,
    } = req.body;

    // ── Bank Master resolution ──────────────────────────────────────────────
    let bankiin = rawBankiin;
    if (bankMasterId) {
      const bmBank = await resolveBankForAeps(String(bankMasterId));
      bankiin = bmBank.iin;
      console.log(`[AEPS CashDeposit] Resolved bankiin=${bankiin} from BankMaster ${bankMasterId}`);
    }
    // ───────────────────────────────────────────────────────────────────────

    const userId = req.user?.userId || req.user?._id || req.user?.id || req.body?.userId;
    const resolvedReferenceKey = await resolveAepsReferenceKey({
      userId,
      outletId: outlet_id,
      providedReferenceKey: referenceKey,
    });

    const payload = {
      txnid,
      outlet_id,
      ...(resolvedReferenceKey ? { referenceKey: resolvedReferenceKey } : {}),
      latitude,
      longitude,
      aadhaar,
      mobile,
      bankiin,
      amount,
      ts,
      dc,
      ci,
      hmac,
      mc,
      dpId,
      PidDatatype: PidDatatype || "X",
      Piddata,
      rdsId,
      rdsVer,
      sessionKey,
      mi,
      errInfo,
      errCode,
      fCount,
      fType,
      iCount,
      iType,
      pCount,
      pType,
      qScore,
      nmPoints,
      srno,
      sysid,
    };

    console.log("Cash Deposit Payload:", payload);

    const depositAmount = Math.round(Number(amount || 0) * 100) / 100;

    // 1. Pre-flight guard: Ensure retailer has sufficient wallet balance before hitting provider
    if (userId && depositAmount > 0) {
      await verifyWalletBalance(userId, depositAmount);
    }

    // Call external provider API
    const result = await cashDeposite(payload);

    console.log("Cash Deposit Response:", result);

    // 2. Determine provider success based on live gateway response structure
    // Live response: {"status":"SUCCESS","msg":"Transaction Successful","txnid":"AEPS1793101821315268","rrn":"1261027172023TVUJQ","name":"BANK OF MAHARASHTRA","mobile":"9981298922","amount":100}
    const isSuccess =
      result?.status === "SUCCESS" ||
      result?.msg === "Transaction Successful" ||
      Boolean(result?.txnid);

    // 3. Atomically debit retailer wallet & log AEPS transaction history
    if (isSuccess && userId && depositAmount > 0) {
      const aepsTxnId = String(result?.txnid || txnid || generate15CharTxnId("TXN"));
      const bankName = String(result?.name || bankiin || "Bank").trim();
      const aadharMasked = aadhaar ? `•••• •••• ${String(aadhaar).slice(-4)}` : "";

      // Calculate commission & charges from the retailer's active plan
      const pricing = await calculateTransactionPricing({
        userId,
        service: "AEPS",
        category: "Cash Deposit",
        amount: depositAmount,
      });

      try {
        const walletTxn = await processServiceWalletTransaction({
          userId,
          type: "debit",
          amount: Number(result?.amount || depositAmount),
          service: "AEPS",
          transactionId: aepsTxnId,
          commissionEarned: pricing.retailerCommission,
          charges: pricing.charges,
          distributorCommission: pricing.distributorCommission,
          distributorId: pricing.distributorId,
          commissionBreakdown: pricing.commissionBreakdown,
          payee: {
            bankName,
            aadharNumber: aadharMasked || undefined,
            accountHolderName: result?.name || undefined,
          },
          description: `AEPS Cash Deposit of ₹${depositAmount.toFixed(2)} to ${bankName}${aadharMasked ? ` (${aadharMasked})` : ""}`,
          status: "success",
        });

        // Send notification about commission earned (if any)
        if (pricing.retailerCommission > 0) {
          sendWalletTransferNotification({
            recipientId: userId,
            type: "WALLET_CREDIT",
            title: "Commission Earned",
            body: `You earned ₹${pricing.retailerCommission.toFixed(2)} commission for Cash Deposit service.`,
            data: {
              service: "AEPS",
              serviceName: "Cash Deposit",
              amount: String(pricing.retailerCommission),
              transactionId: aepsTxnId,
            },
          }).catch((err) => console.error("Failed to send commission notification:", err));
        }
      } catch (walletErr) {
        console.error("[AEPS] Wallet ledger debit error:", walletErr?.message || walletErr);
        if (!walletErr?.message?.includes("duplicate")) {
          throw walletErr;
        }
      }
    }

    return res.status(200).json(
      ApiResponse.success(
        {
          ...result,
          amount,
        },
        "Cash deposit completed successfully"
      )
    );
  } catch (error) {
    console.error("Cash Deposit Error:", error);

    return res
      .status(error.statusCode || error.response?.status || 500)
      .json(
        ApiResponse.error(
          error.response?.data?.message ||
          error.message ||
          "Failed to complete cash deposit",
          error.statusCode || error.response?.status || 500,
          error.response?.data?.errors || null
        )
      );
  }
};

/* ==============================
   Onboard Merchant Controller
============================== */
const onboardController = asyncHandler(async (req, res) => {
  const userId =
    req.user?.userId ||
    req.user?.id ||
    req.user?._id ||
    req.body?.userId;

  if (!userId) {
    return res.status(401).json(
      ApiResponse.error("User ID is required for merchant onboarding", null, null, 401)
    );
  }

  const result = await onboardMerchantService(userId);

  return res.status(200).json(
    ApiResponse.success(
      result,
      result?.alreadyOnboarded
        ? "Retailer is already onboarded"
        : "Merchant onboarded successfully",
      null,
      200
    )
  );
});

const outletRegisterController = asyncHandler(async (req, res) => {
  const { outlet_id, referenceKey } = req.body;
  const userId = req.user?.userId || req.user?._id || req.user?.id || req.body?.userId;

  if (!outlet_id) {
    return res.status(400).json(
      ApiResponse.error("outlet_id is required", null, null, 400)
    );
  }

  const effectiveRefKey = await resolveAepsReferenceKey({
    userId,
    outletId: outlet_id,
    providedReferenceKey: referenceKey,
  });

  if (!effectiveRefKey) {
    return res.status(400).json(
      ApiResponse.error("referenceKey is required", null, null, 400)
    );
  }

  const payload = {
    outlet_id: String(outlet_id),
    referenceKey: String(effectiveRefKey),
  };

  console.log("========== [outletRegister Payload] ==========", payload);
  const result = await outletRegister(payload);
  console.log("========== [outletRegister Result] ==========", result);

  const fields = extractProviderEkycFields(result);
  await persistAepsEkycState({
    userId,
    outletId: outlet_id,
    referenceKey: fields.referenceKey || effectiveRefKey,
    pidOptionWadh: fields.pidOptionWadh,
  });

  return res.status(200).json(
    ApiResponse.success(
      result,
      result?.msg || result?.message || "OTP Successfully sent",
      null,
      200
    )
  );
});

const outletRegisterVerifyController = asyncHandler(async (req, res) => {
  const { outlet_id, referenceKey, otp } = req.body;
  const userId = req.user?.userId || req.user?._id || req.user?.id || req.body?.userId;

  if (!outlet_id) {
    return res.status(400).json(
      ApiResponse.error("outlet_id is required", null, null, 400)
    );
  }

  const effectiveRefKey = await resolveAepsReferenceKey({
    userId,
    outletId: outlet_id,
    providedReferenceKey: referenceKey,
  });

  if (!effectiveRefKey) {
    return res.status(400).json(
      ApiResponse.error("referenceKey is required", null, null, 400)
    );
  }

  if (!otp) {
    return res.status(400).json(
      ApiResponse.error("otp is required", null, null, 400)
    );
  }

  const payload = {
    outlet_id: String(outlet_id),
    referenceKey: String(effectiveRefKey),
    otp: String(otp),
  };

  console.log("========== [outletRegisterVerify Payload] ==========", payload);
  const result = await outletRegisterVerify(payload);
  console.log("========== [outletRegisterVerify Result] ==========", result);

  const fields = extractProviderEkycFields(result);
  await persistAepsEkycState({
    userId,
    outletId: outlet_id,
    referenceKey: fields.referenceKey || effectiveRefKey,
    pidOptionWadh: fields.pidOptionWadh,
  });

  return res.status(200).json(
    ApiResponse.success(
      result,
      result?.msg || result?.message || "Outlet registration verified successfully",
      null,
      200
    )
  );
});

export {
  getRetailerKycDetailsController,
  doEkycController,
  doBioEkycController,
  verifyTfaController,
  loginStatusController,
  balanceEnquiryController,
  miniStatementController,
  cashWithdrawController,
  cashDepositController,
  sendOtpController,
  onboardController,
  outletRegisterController,
  outletRegisterVerifyController,
};

