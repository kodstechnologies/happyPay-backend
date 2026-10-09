import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { initiateCmsPaymentService } from "../services/cms.service.js";

/**
 * Controller to initiate CMS payment
 */
const initiateCmsPaymentController = asyncHandler(async (req, res) => {

  const result = await initiateCmsPaymentService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "CMS payment processed successfully"
    )
  );
});

export { initiateCmsPaymentController };
