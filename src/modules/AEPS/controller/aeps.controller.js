import ApiResponse from "../../../utils/ApiResponse.js";
import {
  getRetailerKycDetails,
  recordEkycOutlet,
  checkLoginStatus,
  isKycRequired,
} from "../services/aeps.service.js";
import { doEkyc, doBioEkyc, verifyTfa } from "../../external/services/provider.service.js";
import { updateEKYCStatus } from "../../auth/repository/user.repository.js";
import asyncHandler from "../../../utils/asyncHandler.js";

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
    const rawAction = result?.data?.action || result?.action;
    const providerAction = rawAction ? String(rawAction).trim().toUpperCase() : "";
    const rawStatus = result?.data?.status || result?.status;
    const providerStatus = rawStatus ? String(rawStatus).trim().toUpperCase() : "";
    const kycRequired = isKycRequired(result);

    const isNoActionRequired =
      providerAction === "NO-ACTION-REQUIRED" ||
      providerAction === "NO_ACTION_REQUIRED" ||
      providerAction === "NO ACTION REQUIRED";

    const isActionRequired =
      !isNoActionRequired &&
      (providerAction === "ACTION-REQUIRED" ||
        providerAction === "ACTION_REQUIRED" ||
        providerAction === "ACTION REQUIRED" ||
        kycRequired);

    if (isNoActionRequired) {
      if (userId) {
        await updateEKYCStatus(userId, "NO ACTION REQUIRED");
      }

      return res.status(200).json(
        ApiResponse.success(
          {
            provider: result,
            status: "NO-ACTION-REQUIRED",
            statusCode: 200,
            message: "NO-ACTION-REQUIRED",
            kycRequired: false,
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
  fType: "0",
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
    userId: req.body.userId,
    outletId: payload.outlet_id,
    referenceKey: referenceKey,
    pidOptionWadh: pidOptionWadh,
  });

  // Update the user's eKYC status to COMPLETED
  await updateEKYCStatus(req.body.userId, "COMPLETED");

  return res.status(200).json(
    ApiResponse.success(
      { provider: result, ekyc: saved },
      "Biometric eKYC completed successfully"
    )
  );
});

const verifyTfaController = async (req, res) => {
  try {
    const payload = pickFields(req.body, [
      ...biometricFields,
      "aadhaar",
      "ts",
    ]);
    const result = await verifyTfa(payload);

    return res.status(200).json(
      ApiResponse.success(result, "TFA verified successfully")
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
      outletId: req.body?.outlet_id,
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

export {
  getRetailerKycDetailsController,
  doEkycController,
  doBioEkycController,
  verifyTfaController,
  loginStatusController,
};
