import ApiResponse from "../../../utils/ApiResponse.js";
import {
  getRetailerKycDetails,
  recordEkycOutlet,
  checkLoginStatus,
  isKycRequired,
} from "../services/aeps.service.js";
import { doEkyc, doBioEkyc, verifyTfa } from "../../external/services/provider.service.js";
import { updateEKYCStatus } from "../../auth/repository/user.repository.js";

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
    const { outlet_id } = req.body;

    if (!outlet_id) {
      return res.status(400).json(
        ApiResponse.error("outlet_id is required", null, null, 400)
      );
    }

    const payload = {
      outlet_id,
    };

    const result = await doEkyc(payload);
    console.log("-------------result",result)
    
    // Extract referenceKey and pidOptionWadh from the provider response
    const referenceKey = result?.data?.referenceKey || result?.referenceKey;
    const pidOptionWadh = result?.data?.pidOptionWadh || result?.pidOptionWadh;

    if (!referenceKey) {
      return res.status(400).json(
        ApiResponse.error("referenceKey not found in provider response", null, null, 400)
      );
    }

    const saved = await recordEkycOutlet({
      userId: req.user?.userId,
      outletId: outlet_id,
      referenceKey: referenceKey,
      pidOptionWadh: pidOptionWadh,
    });

    // Determine eKYC status from provider response
    const providerAction = result?.data?.action || result?.action;
    const providerStatus = result?.data?.status || result?.status;
    const kycRequired = isKycRequired(result);

    let eKYCStatus = "PENDING";
    let eKYCRejectionReason = null;

    if (providerAction === "ACTION-REQUIRED" || kycRequired) {
      eKYCStatus = "ACTION_REQUIRED";
    } else if (providerStatus === "COMPLETED" || providerStatus === "SUCCESS") {
      eKYCStatus = "COMPLETED";
    } else if (providerStatus === "FAILED" || providerStatus === "REJECTED") {
      eKYCStatus = "FAILED";
      eKYCRejectionReason = result?.msg || result?.message || "eKYC verification failed";
    }

    // Update user's eKYC status
    await updateEKYCStatus(req.user?.userId, eKYCStatus, eKYCRejectionReason);

    return res.status(200).json(
      ApiResponse.success(
        {
          provider: result,
          ekyc: saved,
          kycRequired: kycRequired,
          eKYCStatus: eKYCStatus,
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

const doBioEkycController = async (req, res) => {
  try {
    const payload = withBiometricDefaults(
      pickFields(req.body, biometricFields)
    );
    console.log("========== DO BIO EKYC PAYLOAD ==========");
    console.log("payload:", payload);
    console.log("=======================================");
    const result = await doBioEkyc(payload);
    
    // Extract referenceKey and pidOptionWadh from the provider response
    const referenceKey = result?.data?.referenceKey || result?.referenceKey || payload.referenceKey;
    const pidOptionWadh = result?.data?.pidOptionWadh || result?.pidOptionWadh;

    if (!referenceKey) {
      return res.status(400).json(
        ApiResponse.error("referenceKey not found in provider response or request")
      );
    }

    const saved = await recordEkycOutlet({
      userId: req.user?.userId,
      outletId: payload.outlet_id,
      referenceKey: referenceKey,
      pidOptionWadh: pidOptionWadh,
    });

    return res.status(200).json(
      ApiResponse.success(
        { provider: result, ekyc: saved },
        "Biometric eKYC completed successfully"
      )
    );
  } catch (error) {
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
      .status(error.statusCode || error.response?.status || 500)
      .json(
        ApiResponse.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to perform biometric eKYC",
          null,
          null,
          error.statusCode || error.response?.status || 500
        )
      );
  }
};

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
