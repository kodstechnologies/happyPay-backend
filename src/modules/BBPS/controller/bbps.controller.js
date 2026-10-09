import ApiResponse from "../../../utils/ApiResponse.js";
import ApiError from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getBillerCategoriesService,
  getAllBillersService,
  getBillersByCategoryIdService,
  getBillersByCategoryNameService,
  fetchBillService,
  payBillService,
} from "../service/bbps.service.js";

const getAuthFields = (user) => {
  const outletid = user?.outletId || user?.outletid;
  const referenceKey = user?.referenceKey;
  
  if (!outletid) throw ApiError.unauthorized("Outlet ID is missing from user session.");
  if (!referenceKey) throw ApiError.unauthorized("Reference Key is missing from user session.");
  
  return { outletid, referenceKey };
};

/**
 * Controller to get all biller categories
 */
const getBillerCategoriesController = asyncHandler(async (req, res) => {
  const result = await getBillerCategoriesService();

  return res.status(200).json(
    ApiResponse.success(
      result,
      "BBPS biller categories fetched successfully"
    )
  );
});

/**
 * Controller to get all billers
 */
const getAllBillersController = asyncHandler(async (req, res) => {
  const result = await getAllBillersService();

  return res.status(200).json(
    ApiResponse.success(
      result,
      "BBPS billers fetched successfully"
    )
  );
});

/**
 * Controller to get billers by category ID
 */
const getBillersByCategoryIdController = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    ...getAuthFields(req.user)
  };
  const result = await getBillersByCategoryIdService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "BBPS billers fetched successfully by category ID"
    )
  );
});

/**
 * Controller to get billers by category name
 */
const getBillersByCategoryNameController = asyncHandler(async (req, res) => {
  const {catname} = req.body;
  const payload = { 
    catname,
    ...getAuthFields(req.user)
  };
  
  const result = await getBillersByCategoryNameService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "BBPS billers fetched successfully by category name"
    )
  );
});

/**
 * Controller to fetch/view bill details
 */
const fetchBillController = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    ...getAuthFields(req.user)
  };
  const result = await fetchBillService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Bill details fetched successfully"
    )
  );
});

/**
 * Controller to pay bill
 */
const payBillController = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    ...getAuthFields(req.user)
  };
  const result = await payBillService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Bill payment processed successfully"
    )
  );
});

export {
  getBillerCategoriesController,
  getAllBillersController,
  getBillersByCategoryIdController,
  getBillersByCategoryNameController,
  fetchBillController,
  payBillController,
};
