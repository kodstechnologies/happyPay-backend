import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  queryRemitterService,
  loginRemitterService,
  registerRemitterService,
  registerRemitterVerifyService,
  remitterEkycService,
  addBeneficiaryService,
  verifyBeneficiaryService,
  getBeneficiariesService,
  deleteBeneficiaryService,
  deleteBeneficiaryVerifyOtpService,
  generateTransactionOtpService,
  doTransactionService,
  getTransactionStatusService,
} from "../service/dmt.service.js";

// -------------------------------------------------------------
// Remitter Controllers
// -------------------------------------------------------------

/**
 * Controller to query or login remitter by mobile number
 */
const queryRemitterController = asyncHandler(async (req, res) => {
  const payload = {
    ...req.query,
    ...req.params,
    ...req.body,
  };

  const result = await queryRemitterService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Remitter details fetched successfully"
    )
  );
});

const loginRemitterController = queryRemitterController;

/**
 * Controller to register a new remitter
 */
const registerRemitterController = asyncHandler(async (req, res) => {
  const result = await registerRemitterService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Remitter registration initiated. OTP sent to mobile"
    )
  );
});

/**
 * Controller to verify remitter registration OTP
 */
const registerRemitterVerifyController = asyncHandler(async (req, res) => {
  const result = await registerRemitterVerifyService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Remitter verified and registered successfully"
    )
  );
});

/**
 * Controller to perform remitter eKYC / Biometric verification
 */
const remitterEkycController = asyncHandler(async (req, res) => {
  const result = await remitterEkycService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Remitter eKYC processed successfully"
    )
  );
});

// -------------------------------------------------------------
// Beneficiary Controllers
// -------------------------------------------------------------

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
 * Controller to verify beneficiary account (penny drop)
 */
const verifyBeneficiaryController = asyncHandler(async (req, res) => {
  const result = await verifyBeneficiaryService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary account verified successfully"
    )
  );
});

/**
 * Controller to fetch beneficiaries
 */
const getBeneficiariesController = asyncHandler(async (req, res) => {
  const payload = {
    ...req.query,
    ...req.params,
    ...req.body,
  };

  const result = await getBeneficiariesService(payload);

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

// -------------------------------------------------------------
// Transaction Controllers
// -------------------------------------------------------------

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
  const payload = {
    ...req.query,
    ...req.params,
    ...req.body,
  };

  const result = await getTransactionStatusService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Transaction status fetched successfully"
    )
  );
});

export {
  queryRemitterController,
  loginRemitterController,
  registerRemitterController,
  registerRemitterVerifyController,
  remitterEkycController,
  addBeneficiaryController,
  verifyBeneficiaryController,
  getBeneficiariesController,
  deleteBeneficiaryController,
  deleteBeneficiaryVerifyOtpController,
  generateTransactionOtpController,
  doTransactionController,
  getTransactionStatusController,
};
