import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getRetailerKycDetails } from "../services/aeps.service.js";
import { doEkyc } from "../../external/services/provider.service.js";

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

  return res.status(200).json(
    ApiResponse.success(
      result,
      "eKYC completed successfully"
    )
  );
});

export { getRetailerKycDetailsController, doEkycController };
