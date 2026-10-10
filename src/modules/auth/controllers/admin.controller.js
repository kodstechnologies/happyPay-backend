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
    req.body.reasonOfRejection
  );

  return res
    .status(200)
    .json(ApiResponse.success(data, `Document '${documentField}' rejected successfully`));
});
