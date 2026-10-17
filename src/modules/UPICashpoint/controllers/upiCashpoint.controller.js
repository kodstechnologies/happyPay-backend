import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";
import { initiateUpiCashpointService } from "../services/upiCashpoint.service.js";

/**
 * Controller to initiate UPI Cashpoint payment
 */
const initiateUpiCashpointController = asyncHandler(async (req, res) => {
  const txnid = req.body.txnid || generate15CharTxnId("TXN");
  const merchantLoginId =
    req.body.merchantLoginId ||
    req.user?.outletid ||
    req.user?.outletId ||
    req.user?.mobile ||
    req.user?.userId ||
    "HAPPY_PAY_MERCHANT";

  const payload = {
    ...req.body,
    txnid,
    merchantLoginId: String(merchantLoginId).trim(),
  };

  const result = await initiateUpiCashpointService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "UPI Cashpoint transaction initiated successfully"
    )
  );
});

export { initiateUpiCashpointController };

