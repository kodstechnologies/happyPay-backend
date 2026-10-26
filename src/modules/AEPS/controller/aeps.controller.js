import ApiResponse from "../../../utils/ApiResponse.js";
import {
  getRetailerKycDetails,
  recordEkycOutlet,
  checkLoginStatus,
  isKycRequired,
  onboardMerchantService,
} from "../services/aeps.service.js";
import { doEkyc, doBioEkyc, verifyTfa, balanceEnquiry, miniStatement, cashWithdraw, cashDeposite, sendOtp } from "../../external/services/provider.service.js";
import { updateEKYCStatus } from "../../auth/repository/user.repository.js";
import User from "../../auth/model/user.model.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import generate15CharTxnId from "../../../utils/generateTxnId.js";
import sanitizePayload from "../../../utils/sanitizePayload.js";

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
  try {
    const { outlet_id, userId } = req.body;

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

    // Determine eKYC status and action from provider response
    const rawAction = result?.data?.action
    const providerAction = rawAction ? String(rawAction).trim().toUpperCase() : "";
    const kycRequired = isKycRequired(result);

    const isNoActionRequired =
      providerAction === "NO-ACTION-REQUIRED"


    const isActionRequired =
      !isNoActionRequired &&
      (providerAction === "ACTION-REQUIRED" ||
        providerAction === "ACTION_REQUIRED" ||
        providerAction === "ACTION REQUIRED" ||
        kycRequired);

    if (isNoActionRequired) {
      // Extract referenceKey and pidOptionWadh from the provider response
      const referenceKey = result?.data?.referenceKey || result?.referenceKey;
      const pidOptionWadh = result?.data?.pidOptionWadh || result?.pidOptionWadh;
      let saved = null;

      if (referenceKey && userId) {
        saved = await recordEkycOutlet({
          userId: userId,
          outletId: outlet_id,
          referenceKey: referenceKey,
          pidOptionWadh: pidOptionWadh,
        });
      }

      if (userId) {
        await updateEKYCStatus(userId, "COMPLETED");
      }

      return res.status(200).json(
        ApiResponse.success(
          {
            provider: result,
            status: "NO-ACTION-REQUIRED",
            statusCode: 200,
            message: "NO-ACTION-REQUIRED",
            referenceKey: referenceKey,
            pidOptionWadh: pidOptionWadh,
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
      // Extract referenceKey and pidOptionWadh from the provider response
      const referenceKey = result?.data?.referenceKey || result?.referenceKey;
      const pidOptionWadh = result?.data?.pidOptionWadh || result?.pidOptionWadh;

      if (!referenceKey) {
        return res.status(400).json(
          ApiResponse.error("referenceKey not found in provider response", null, null, 400)
        );
      }

      const saved = await recordEkycOutlet({
        userId: userId,
        outletId: outlet_id,
        referenceKey: referenceKey,
        pidOptionWadh: pidOptionWadh,
      });

      if (userId) {
        await updateEKYCStatus(userId, "ACTION_REQUIRED");
      }

      return res.status(200).json(
        ApiResponse.success(
          {
            provider: result,
            status: "ACTION-REQUIRED",
            statusCode: 200,
            message: "ACTION-REQUIRED",
            referenceKey: referenceKey,
            pidOptionWadh: pidOptionWadh,
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

    if (providerStatus === "FAILED" || providerStatus === "REJECTED") {
      const rejectionReason = result?.msg || result?.message || "eKYC verification failed";
      if (userId) {
        await updateEKYCStatus(userId, "FAILED", rejectionReason);
      }

      return res.status(400).json(
        ApiResponse.error(
          rejectionReason,
          {
            provider: result,
            status: "FAILED",
            statusCode: 400,
            message: rejectionReason,
            kycRequired: false,
            eKYCStatus: "FAILED",
          },
          null,
          400
        )
      );
    }

    if (providerStatus === "COMPLETED" || providerStatus === "SUCCESS") {
      if (userId) {
        await updateEKYCStatus(userId, "COMPLETED");
      }

      return res.status(200).json(
        ApiResponse.success(
          {
            provider: result,
            status: "COMPLETED",
            statusCode: 200,
            message: result?.msg || result?.message || "eKYC completed successfully",
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
    const referenceKey = result?.data?.referenceKey || result?.referenceKey;
    const pidOptionWadh = result?.data?.pidOptionWadh || result?.pidOptionWadh;
    let saved = null;

    if (referenceKey && userId) {
      saved = await recordEkycOutlet({
        userId: userId,
        outletId: outlet_id,
        referenceKey: referenceKey,
        pidOptionWadh: pidOptionWadh,
      });
    }

    return res.status(200).json(
      ApiResponse.success(
        {
          provider: result,
          status: "SUCCESS",
          statusCode: 200,
          message: "eKYC status checked successfully",
          referenceKey,
          pidOptionWadh,
          ekyc: saved,
          kycRequired: false,
          eKYCStatus: "PENDING",
        },
        "eKYC status checked successfully",
        null,
        200
      )
    );
  } catch (error) {
    console.log("Error checking eKYC status:", error.message);

    // Handle provider errors
    if (error.providerError) {
      return res.status(error.statusCode || 400).json(
        ApiResponse.error(
          error.message,
          error.providerData,
          null,
          error.statusCode || 400
        )
      );
    }

    return res
      .status(error.statusCode || 500)
      .json(
        ApiResponse.error(
          error.message || "Failed to check eKYC status",
          null,
          null,
          error.statusCode || 500
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
  const userId = req.body.userId || req.user?.userId;

  if (!userId) {
    return res.status(401).json(
      ApiResponse.error("User ID is required to perform biometric eKYC")
    );
  }

  const payload = withBiometricDefaults(
    pickFields(req.body, biometricFields)
  );
  console.log("========== DO BIO EKYC PAYLOAD ==========");
  console.log("payload:", payload);
  console.log("=======================================");
  const result = await doBioEkyc(payload);
  console.log("====================================result", result);

  // Extract referenceKey and pidOptionWadh from the provider response
  const referenceKey = result?.data?.referenceKey || result?.referenceKey || payload.referenceKey;
  const pidOptionWadh = result?.data?.pidOptionWadh || result?.pidOptionWadh;

  if (!referenceKey) {
    return res.status(400).json(
      ApiResponse.error("referenceKey not found in provider response or request")
    );
  }

  const saved = await recordEkycOutlet({
    userId,
    outletId: payload.outlet_id,
    referenceKey,
    pidOptionWadh,
    eKYCStatus: "COMPLETED",
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

    // Step 5: Verify TFA only when actcode is LOGINREQUIRED
    const result = await verifyTfa(payload);

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
      bankiin,
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

    // Prepare payload for provider API
    const payload = {
      outlet_id,
      referenceKey,
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
      bankiin,
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

    // Prepare payload for provider API
    const payload = {
      outlet_id,
      referenceKey,
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

    console.log("Mini Statement Payload:", payload);

    // Call provider API
    const result = await miniStatement(payload);

    console.log("Mini Statement Response:", result);

    return res.status(200).json(
      ApiResponse.success(
        result,
        "Mini statement fetched successfully"
      )
    );
  } catch (error) {
    console.error("Mini Statement Error:", error);

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
      bankiin,
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

    const txnid = generate15CharTxnId("TXN")
    // Prepare payload for provider API
    const payload = {
      outlet_id,
      referenceKey,
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
      bankiin,
      amount,
    } = req.body;

    // Prepare payload for provider API
    const payload = {
      outlet_id,
      referenceKey,
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
      bankiin,
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

    const payload = {
      txnid,
      outlet_id,
      referenceKey,
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

    // Call external provider API
    const result = await cashDeposite(payload);

    console.log("Cash Deposit Response:", result);

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
};
