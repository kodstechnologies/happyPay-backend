import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";
import {
  initiateCmsPaymentService,
  handleCmsCallbackService,
} from "../services/cms.service.js";

/**
 * Controller to initiate CMS payment session
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

/**
 * Controller for CMS Server-to-Server Webhook Callbacks from Provider
 * Handles:
 * - CMS_BALANCE_INQUIRY: returns status 200 if retailer has sufficient balance, 400 otherwise
 * - CMS_BALANCE_DEBIT: debits retailer wallet and returns status 200 on success, 400 otherwise
 */
const cmsCallbackController = asyncHandler(async (req, res) => {
  const { httpStatus, response } = await handleCmsCallbackService(
    req.body,
    req.query
  );

  return res.status(httpStatus).json(response);
});

export { initiateCmsPaymentController, cmsCallbackController };
