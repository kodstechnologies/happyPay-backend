import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getRetailerTransactions } from "../service/transaction.service.js";


export const getRetailerTransactionsController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId
  const result = await getRetailerTransactions(userId, req.query);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Transactions fetched successfully"
    )
  );
});

export default {
  getRetailerTransactionsController,
};
