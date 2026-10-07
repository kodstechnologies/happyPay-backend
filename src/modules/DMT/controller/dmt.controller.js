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
 
  const result = await addBeneficiaryService(req.body);

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
 
  const result = await verifyBeneficiaryService(req.body);

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

  const result = await getBeneficiariesService(req.body);

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

  const result = await deleteBeneficiaryService(req.body);

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
 
  const result = await deleteBeneficiaryVerifyOtpService(req.body);

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
 
  const result = await getTransactionStatusService(req.body);

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
