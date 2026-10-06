import ApiResponse from "../../../utils/ApiResponse.js";
import { getRetailerKycDetails } from "../services/aeps.service.js";
import { doEkyc } from "../../external/services/provider.service.js";

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
    const {
      outlet_id,
      referenceKey,
      latitude,
      longitude,
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
      srno,
      qScore,
      nmPoints,
      sysid,
    } = req.body;

    const payload = {
      outlet_id,
      referenceKey,
      latitude,
      longitude,
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
      srno,
      qScore,
      nmPoints,
      sysid,
    };

    console.log("Calling doEkyc with payload:", payload);

    const result = await doEkyc(payload);

    return res.status(200).json(
      ApiResponse.success(result, "eKYC completed successfully")
    );
  } catch (error) {
    console.log("Error performing eKYC:", error.message);

    return res
      .status(error.statusCode || 500)
      .json(
        ApiResponse.error(
          error.message || "Failed to perform eKYC"
        )
      );
  }
};
export { getRetailerKycDetailsController, doEkycController };
