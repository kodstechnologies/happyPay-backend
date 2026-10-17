import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";
import { initiateCmsPaymentService } from "../services/cms.service.js";

/**
 * Controller to initiate CMS payment
 */
const initiateCmsPaymentController = asyncHandler(async (req, res) => {
  const txnid = req.body.txnid || generate15CharTxnId("TXN");
  const mobile = req.body.mobile || req.user?.mobile;

  const payload = {
    ...req.body,
    txnid,
    ...(mobile ? { mobile } : {}),
  };

  const result = await initiateCmsPaymentService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "CMS payment processed successfully"
    )
  );
});

export { initiateCmsPaymentController };
