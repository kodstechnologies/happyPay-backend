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
import { sync } from "../../DataSyncWithDb/sync.js";
import {
  verifyWalletBalance,
  processServiceWalletTransaction,
} from "../../wallet/services/wallet.service.js";

const getAuthFields = (user) => {
  const outletid = user?.outletId || user?.outletid || "747932";
  const referenceKey = user?.referenceKey || "luKtUZUiAYzae0+RaqmBH4RCvgN6M+eEBJiMOu48dt1R1XQaph4Tec6zP+YrxfMK";

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
  const { catname } = req.body;

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
  const userId = req.user?.userId || req.user?._id || req.body?.userId;
  const rawAmount = req.body?.amount ?? req.body?.AMT ?? 0;
  const billAmount = Math.round(Number(rawAmount) * 100) / 100;

  // 1. Pre-flight guard: Ensure retailer has sufficient wallet balance before hitting provider
  if (userId && billAmount > 0) {
    await verifyWalletBalance(userId, billAmount);
  }

  const payload = {
    ...req.body,
    ...getAuthFields(req.user),
  };
  const result = await payBillService(payload);

  // 2. Determine provider success based on live gateway response structure
  // Live response: { status: "SUCCESS", data: { STATUSCODE: "0", STATUSMSG: "Success", REFNO: "...", TRNID: ... } }
  const isSuccess =
    result?.status === "SUCCESS" &&
    (String(result?.data?.STATUSCODE) === "0" ||
      result?.data?.TRNSTATUS === 1 ||
      String(result?.data?.STATUSMSG).toLowerCase() === "success" ||
      result?.data?.STATUSCODE === undefined);

  // 3. Atomically debit wallet and record ledger entry upon success
  if (isSuccess && userId && billAmount > 0) {
    const trnId = String(
      result?.data?.REFNO ||
      result?.data?.TRNID ||
      req.body.referenceid ||
      req.body.orderid ||
      `BBPS_${Date.now()}`
    );

    const operatorName = String(req.body.opcode || req.body.operator || req.body.biller_name || "BBPS Biller").trim();
    const consumerNo = String(req.body.CUSTNO || req.body.canumber || "").trim();
    const customerName = String(req.body.customerName || req.body.FIELD2 || "").trim();

    try {
      await processServiceWalletTransaction({
        userId,
        type: "debit",
        amount: billAmount,
        service: "BBPS",
        transactionId: trnId,
        payee: {
          bankName: operatorName,
          accountNumber: consumerNo,
          accountHolderName: customerName || undefined,
        },
        description: `BBPS bill payment of ₹${billAmount.toFixed(2)} for ${operatorName}${consumerNo ? ` (Consumer No: ${consumerNo})` : ""}`,
        status: "success",
      });
    } catch (walletErr) {
      console.error("[BBPS] Wallet ledger debit error:", walletErr?.message || walletErr);
      if (!walletErr?.message?.includes("duplicate")) {
        throw walletErr;
      }
    }
  }

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Bill payment processed successfully"
    )
  );
});

/**
 * Controller to sync BBPS categories and billers into database
 */
const syncBbpsDataController = asyncHandler(async (req, res) => {
  const result = await sync();

  return res.status(200).json(
    ApiResponse.success(
      result,
      "BBPS categories and billers synchronized successfully"
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
  syncBbpsDataController,
};
