import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getRetailerDashboardData } from "../services/dashboard.service.js";

/**
 * Controller to fetch retailer dashboard metrics:
 * - Retailer profile & ID
 * - Live wallet balance
 * - Today's commission earnings
 * - Latest 5 transactions
 *
 * GET /api/v1/dashboard/retailer
 */
export const getRetailerDashboard = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?._id;
  const result = await getRetailerDashboardData(userId);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Retailer dashboard data fetched successfully"
    )
  );
});

export default {
  getRetailerDashboard,
};
