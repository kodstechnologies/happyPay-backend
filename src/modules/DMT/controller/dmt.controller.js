import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getRemitterDetailsService,
  registerRemitterService,
  verifyRemitterOtpService,
  performRemitterEkycService,
  fetchBeneficiariesService,
  verifyBeneficiaryAccountService,
  addBeneficiaryService,
  deleteBeneficiaryService,
  verifyDeleteBeneficiaryOtpService,
  generateTransactionOtpService,
  executeTransactionService,
  checkTransactionStatusService,
} from "../service/dmt.service.js";

export const getRemitterDetailsController = asyncHandler(async (req, res) => {
  const payload = { ...req.query, ...req.params, ...req.body };
  const result = await getRemitterDetailsService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Remitter details fetched successfully"
    )
  );
});

export const registerRemitterController = asyncHandler(async (req, res) => {
  
  const result = await registerRemitterService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Remitter registration initiated. OTP sent to registered mobile number"
    )
  );
});

export const verifyRemitterOtpController = asyncHandler(async (req, res) => {
  const result = await verifyRemitterOtpService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Remitter OTP verified and registered successfully"
    )
  );
});

export const performRemitterEkycController = asyncHandler(async (req, res) => {
  const result = await performRemitterEkycService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Remitter eKYC processed successfully"
    )
  );
});

// =============================================================
// Beneficiary Controllers
// =============================================================

export const fetchBeneficiariesController = asyncHandler(async (req, res) => {
  const payload = { ...req.query, ...req.params, ...req.body };
  const result = await fetchBeneficiariesService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiaries fetched successfully"
    )
  );
});

export const verifyBeneficiaryAccountController = asyncHandler(async (req, res) => {
  const result = await verifyBeneficiaryAccountService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary bank account verified successfully"
    )
  );
});

export const addBeneficiaryController = asyncHandler(async (req, res) => {
  const result = await addBeneficiaryService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary added successfully"
    )
  );
});

export const deleteBeneficiaryController = asyncHandler(async (req, res) => {
  const result = await deleteBeneficiaryService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary deletion OTP sent successfully"
    )
  );
});

export const verifyDeleteBeneficiaryOtpController = asyncHandler(async (req, res) => {
  const result = await verifyDeleteBeneficiaryOtpService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Beneficiary deleted successfully"
    )
  );
});

// =============================================================
// Transaction Controllers
// =============================================================

export const generateTransactionOtpController = asyncHandler(async (req, res) => {
  const result = await generateTransactionOtpService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Transaction OTP generated successfully"
    )
  );
});

export const executeTransactionController = asyncHandler(async (req, res) => {
  const result = await executeTransactionService(req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "DMT transaction processed successfully"
    )
  );
});

export const checkTransactionStatusController = asyncHandler(async (req, res) => {
  const payload = { ...req.query, ...req.params, ...req.body };
  const result = await checkTransactionStatusService(payload);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Transaction status fetched successfully"
    )
  );
});
