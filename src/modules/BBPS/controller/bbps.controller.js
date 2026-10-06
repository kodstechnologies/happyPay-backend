import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getBillerCategoriesService,
  getAllBillersService,
  getBillersByCategoryIdService,
  getBillersByCategoryNameService,
  fetchBillService,
  payBillService,
} from "../service/bbps.service.js";

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
  const { catid } = req.body;
  if (!catid) {
    return res.status(400).json(
      ApiResponse.error(
        "Category ID (catid) is required"
      )
    );
  }
  const result = await getBillersByCategoryIdService({ catid });

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
  if(!catname){
    return res.status(400).json(
      ApiResponse.error(
        "Category name is required"
      )
    );
  }
  const result = await getBillersByCategoryNameService({ catname });

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
  const {REFMOBILENO,CUSTNO,AMTCUSTNO,orderid,opcode,service_id} = req.body;
  if(!REFMOBILENO || !CUSTNO || !AMTCUSTNO || !orderid || !opcode || !service_id){
    return res.status(400).json(
      ApiResponse.error(
        "Missing required parameters"
      )
    );
  }
  const result = await fetchBillService({REFMOBILENO,CUSTNO,AMTCUSTNO,orderid,opcode,service_id});

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
   const {REFMOBILENO,CUSTNO,AMT,orderid,opcode,service_id} = req.body;
  if(!REFMOBILENO || !CUSTNO || !AMT|| !orderid || !opcode || !service_id){
    return res.status(400).json(
      ApiResponse.error(
        "Missing required parameters"
      )
    );
  }
  const result = await payBillService({REFMOBILENO,CUSTNO,AMT,orderid,opcode,service_id});

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
