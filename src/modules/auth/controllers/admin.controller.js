import { asyncHandler } from '../../../utils/asyncHandler.js';
import {
  createAdminService,
  loginAdminService,
  getPendingRetailersService,
  approveRetailerService,
  rejectRetailerService,
  approveRetailerDocumentsService,
  rejectRetailerDocumentsService,
  approveRetailerDocumentService,
  rejectRetailerDocumentService,
  reviewRetailerDocumentService,
  getPendingBanksService,
  approveBankService,
  rejectBankService,
  resubmitBankService,
} from "../services/admin.services.js";
import ApiResponse from "../../../utils/ApiResponse.js";

export const createAdminController = asyncHandler(async (req, res) => {
  const admin = await createAdminService(req.body);

  return res.status(201).json({
    success: true,
    message: "Admin created successfully",
    data: {
      id: admin._id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      mobile: admin.mobile,
      roles: admin.roles,
      status: admin.status,
    },
  });
});

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, mobile, password } = req.body;

  const data = await loginAdminService({
    email,
    mobile,
    password,
  });

  return res
    .status(200)
    .json(ApiResponse.success(data, "Login successful"));
});

export const getPendingRetailers = asyncHandler(async (req, res) => {
  const page = Math.max(
    Number(req.query.page) || 1,
    1
  );

  const limit = Math.min(
    Math.max(Number(req.query.limit) || 10, 1),
    100
  );

  const result = await getPendingRetailersService({
    page,
    limit,
  });

  return res
    .status(200)
    .json(
      ApiResponse.success(
        result.data,
        "Pending retailers fetched successfully",
        result.meta
      )
    );
});

export const approveRetailer = asyncHandler(async (req, res) => {
  const data = await approveRetailerService(req.params.retailerId);

  return res
    .status(200)
    .json(ApiResponse.success(data, "Retailer approved successfully"));
});

export const rejectRetailer = asyncHandler(async (req, res) => {
  const data = await rejectRetailerService(
    req.params.retailerId,
    req.body.reasonOfRejection
  );

  return res
    .status(200)
    .json(ApiResponse.success(data, "Retailer rejected successfully"));
});

export const approveRetailerDocuments = asyncHandler(async (req, res) => {
  const adminId = req.user?.userId;
  // documentFields: optional array of field names to approve; approves all if omitted
  const documentFields = Array.isArray(req.body.documentFields) ? req.body.documentFields : [];
  const data = await approveRetailerDocumentsService(req.params.retailerId, adminId, documentFields);

  const message = documentFields.length > 0
    ? `Documents approved successfully: ${documentFields.join(", ")}`
    : "All retailer documents approved successfully";

  return res
    .status(200)
    .json(ApiResponse.success(data, message));
});

export const rejectRetailerDocuments = asyncHandler(async (req, res) => {
  const adminId = req.user?.userId;
  // documentFields: optional array of field names to reject; rejects all if omitted
  const documentFields = Array.isArray(req.body.documentFields)
    ? req.body.documentFields
    : (req.body.documentFields ? [req.body.documentFields] : []);

  const data = await rejectRetailerDocumentsService(
    req.params.retailerId,
    adminId,
    req.body.reasonOfRejection,
    documentFields
  );

  const message = documentFields.length > 0
    ? `Documents rejected successfully: ${documentFields.join(", ")}`
    : "All retailer documents rejected successfully";

  return res
    .status(200)
    .json(ApiResponse.success(data, message));
});

export const approveRetailerDocument = asyncHandler(async (req, res) => {
  const adminId = req.user?.userId;
  const { retailerId, documentField } = req.params;
  const data = await approveRetailerDocumentService(retailerId, documentField, adminId);

  return res
    .status(200)
    .json(ApiResponse.success(data, `Document '${documentField}' approved successfully`));
});

export const rejectRetailerDocument = asyncHandler(async (req, res) => {
  const adminId = req.user?.userId;
  const { retailerId, documentField } = req.params;
  const data = await rejectRetailerDocumentService(
    retailerId,
    documentField,
    adminId,
    req.body.reasonOfRejection || req.body.reason
  );

  return res
    .status(200)
    .json(ApiResponse.success(data, `Document '${documentField}' rejected successfully`));
});

/**
 * Unified document review controller.
 * Handles approve and reject for any document field.
 * Accepts: documentField (or in params), action ("approve" | "reject"), reason (optional for approve, required for reject).
 */
export const reviewRetailerDocument = asyncHandler(async (req, res) => {
  const adminId = req.user?.userId;
  const { retailerId } = req.params;
  const documentField = req.params.documentField || req.body.documentField || req.body.documentType;
  const action = req.body.action || req.body.status;
  const reason = req.body.reason || req.body.reasonOfRejection;

  const data = await reviewRetailerDocumentService({
    retailerId,
    documentField,
    action,
    reason,
    adminId,
  });

  const isApprove = String(action || "").toLowerCase().startsWith("app");
  return res
    .status(200)
    .json(
      ApiResponse.success(
        data,
        `Document '${documentField}' ${isApprove ? "approved" : "rejected"} successfully`
      )
    );
});

// ============================================================
// BANK APPROVAL CONTROLLERS
// ============================================================

export const getPendingBanks = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

  const result = await getPendingBanksService({ page, limit });

  return res
    .status(200)
    .json(
      ApiResponse.success(
        result.data,
        "Pending banks fetched successfully",
        result.meta
      )
    );
});

export const approveBank = asyncHandler(async (req, res) => {
  const adminId = req.user?.userId;
  const { retailerId, pendingBankId } = req.params;

  const data = await approveBankService(retailerId, pendingBankId, adminId);

  return res
    .status(200)
    .json(ApiResponse.success(data, "Bank account approved successfully"));
});

export const rejectBank = asyncHandler(async (req, res) => {
  const adminId = req.user?.userId;
  const { retailerId, pendingBankId } = req.params;
  const { reasonOfRejection } = req.body;

  const data = await rejectBankService(retailerId, pendingBankId, adminId, reasonOfRejection);

  return res
    .status(200)
    .json(ApiResponse.success(data, "Bank account rejected successfully"));
});

export const resubmitBank = asyncHandler(async (req, res) => {
  const { retailerId, pendingBankId } = req.params;
  const newBankDetails = req.body;

  const data = await resubmitBankService(retailerId, pendingBankId, newBankDetails);

  return res
    .status(200)
    .json(ApiResponse.success(data, "Bank account resubmitted successfully"));
});

