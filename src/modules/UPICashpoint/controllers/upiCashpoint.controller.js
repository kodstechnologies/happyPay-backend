import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { initiateUpiCashpointService } from "../services/upiCashpoint.service.js";

/**
 * Controller to initiate UPI Cashpoint payment
 */
const initiateUpiCashpointController = asyncHandler(async (req, res) => {
 
  const result = await initiateUpiCashpointService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "UPI Cashpoint transaction initiated successfully"
    )
  );
});

export { initiateUpiCashpointController };
