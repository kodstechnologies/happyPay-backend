import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  addBeneficiaryService,
  verifyBeneficiaryService,
  getBeneficiariesService,
  deleteBeneficiaryService,
  deleteBeneficiaryVerifyOtpService,
  generateTransactionOtpService,
  doTransactionService,
  getTransactionStatusService,
} from "../service/dmt.service.js";

/**
 * Controller to add a new beneficiary
 */
const addBeneficiaryController = asyncHandler(async (req, res) => {
  const { bankId,outletid,name,ifsc,accountNumber,beneficiaryMobile,remitterMobile } = req.body;
  if (!beneficiaryMobile || !name || !accountNumber || !ifsc || !outletid || !bankId || !remitterMobile) {
    return res.status(400).json(
      ApiResponse.error(
        "Missing required parameters"
      )
    );
  }
  const result = await addBeneficiaryService({ bankId,outletid,name,ifsc,accountNumber,beneficiaryMobile,remitterMobile } );

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary added successfully"
    )
  );
});

/**
 * Controller to verify beneficiary account
 */
const verifyBeneficiaryController = asyncHandler(async (req, res) => {
  const { outletid,referenceKey,beneficiaryId,otp,remitterMobile } = req.body;
  if (!outletid || !referenceKey || !beneficiaryId || !otp || !remitterMobile) {
    return res.status(400).json(
      ApiResponse.error(
        "Missing required parameters"
      )
    );
  }
  const result = await verifyBeneficiaryService({ outletid,referenceKey,beneficiaryId,otp,remitterMobile });

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary verified successfully"
    )
  );
});

/**
 * Controller to fetch beneficiaries
 */
const getBeneficiariesController = asyncHandler(async (req, res) => {
  const {mobile,outletid} = req.body
  if (!mobile || !outletid) {
    return res.status(400).json(
      ApiResponse.error(
        "Missing required parameters"
      )
    );
  }
  const result = await getBeneficiariesService({ mobile,outletid });

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiaries fetched successfully"
    )
  );
});

/**
 * Controller to initiate beneficiary deletion (sends OTP)
 */
const deleteBeneficiaryController = asyncHandler(async (req, res) => {
  const {remitterMobile,outletid,beneficiaryId} = req.body;
  if (!remitterMobile || !beneficiaryId || !outletid) {
    return res.status(400).json(
      ApiResponse.error(
        "Missing required parameters"
      )
    );
  }
  const result = await deleteBeneficiaryService({remitterMobile,outletid,beneficiaryId});

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary deletion OTP sent successfully"
    )
  );
});

/**
 * Controller to verify delete OTP and remove beneficiary
 */
const deleteBeneficiaryVerifyOtpController = asyncHandler(async (req, res) => {
  const {remitterMobile,outletid,beneficiaryId,otp,referenceKey,} = req.body;
  if (!remitterMobile || !beneficiaryId || !outletid || !otp || !referenceKey) {
    return res.status(400).json(
      ApiResponse.error(
        "Missing required parameters"
      )
    );
  }
  const result = await deleteBeneficiaryVerifyOtpService({remitterMobile,outletid,beneficiaryId,otp,referenceKey});

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary deleted successfully"
    )
  );
});

/**
 * Controller to generate pre-transaction OTP
 */
const generateTransactionOtpController = asyncHandler(async (req, res) => {
  const result = await generateTransactionOtpService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Transaction OTP generated successfully"
    )
  );
});

/**
 * Controller to execute DMT transaction
 */
const doTransactionController = asyncHandler(async (req, res) => {
  const result = await doTransactionService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "DMT transaction processed successfully"
    )
  );
});

/**
 * Controller to check DMT transaction status
 */
const getTransactionStatusController = asyncHandler(async (req, res) => {
  const payload = Object.keys(req.body).length > 0 ? req.body : req.query;
  const result = await getTransactionStatusService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Transaction status fetched successfully"
    )
  );
});

export {
  addBeneficiaryController,
  verifyBeneficiaryController,
  getBeneficiariesController,
  deleteBeneficiaryController,
  deleteBeneficiaryVerifyOtpController,
  generateTransactionOtpController,
  doTransactionController,
  getTransactionStatusController,
};
