import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

import {
  getRetailerKycDetails,
  recordEkycOutlet,
  checkLoginStatus,
} from "../services/aeps.service.js";
import { doEkyc, doBioEkyc, verifyTfa } from "../../external/services/provider.service.js";

/* ==============================
   Get Retailer KYC Details Controller
============================== */
const getRetailerKycDetailsController = asyncHandler(async (req, res) => {
  const { retailerId } = req.params;

  const kycDetails = await getRetailerKycDetails(retailerId);

  return res.status(200).json(
    ApiResponse.success(
      kycDetails,
      "Retailer KYC details fetched successfully"
    )
  );
});

/* ==============================
   Do Biometric eKYC Controller
============================== */
const doEkycController = asyncHandler(async (req, res) => {

  const result = await doEkyc(req.body);
  const saved = await recordEkycOutlet({
      userId: req.user?.userId,
      outletId: req.body.outlet_id,
    });
  return res.status(200).json(
    ApiResponse.success(
      { provider: result, ekyc: saved },
      "eKYC completed successfully"
    )
  );
});

// const doEkycController = async (req, res) => {
//   try {
//     const {
//       outlet_id,
//       referenceKey,
//       latitude,
//       longitude,
//       dc,
//       ci,
//       hmac,
//       mc,
//       dpId,
//       PidDatatype,
//       Piddata,
//       rdsId,
//       rdsVer,
//       sessionKey,
//       mi,
//       errInfo,
//       errCode,
//       fCount,
//       fType,
//       iCount,
//       iType,
//       pCount,
//       pType,
//       srno,
//       qScore,
//       nmPoints,
//       sysid,
//       ts
//     } = req.body;

//     const payload = {
//       outlet_id,
//       referenceKey,
//       latitude,
//       longitude,
//       dc,
//       ci,
//       hmac,
//       mc,
//       dpId,
//       PidDatatype,
//       Piddata,
//       rdsId,
//       rdsVer,
//       sessionKey,
//       mi,
//       errInfo,
//       errCode,
//       fCount,
//       fType,
//       iCount,
//       iType,
//       pCount,
//       pType,
//       srno,
//       qScore,
//       nmPoints,
//       sysid,
//       ts
//     };

//     const result = await doEkyc(payload);
//     const saved = await recordEkycOutlet({
//       userId: req.user?.userId,
//       outletId: outlet_id,
//     });

//     return res.status(200).json(
//       ApiResponse.success(
//         {
//           provider: result,
//           ekyc: saved,
//           kycRequired: isKycRequired(result),
//         },
//         "eKYC completed successfully"
//       )
//     );
//   } catch (error) {
//     console.log("Error performing eKYC:", error.message);

//     return res
//       .status(error.statusCode || 500)
//       .json(
//         ApiResponse.error(
//           error.message || "Failed to perform eKYC"
//         )
//       );
//   }
// };
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
    
    // Check for provider errors
    if (result?.status === 'ERROR' || result?.status === 'FAILED') {
      const errorMessage = result?.msg || result?.message || "Provider error occurred";
      const errorData = {
        status: result?.status,
        message: errorMessage,
        ip: result?.ip,
        details: result
      };

      return res.status(400).json(
        ApiResponse.error(
          errorMessage,
          errorData,
          null,
          400
        )
      );
    }
    
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
    return res
      .status(error.statusCode || error.response?.status || 500)
      .json(
        ApiResponse.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to perform biometric eKYC"
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
