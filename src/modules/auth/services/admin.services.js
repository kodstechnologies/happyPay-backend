import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Role from "../model/role.model.js";

import { generateAccessToken } from "../../../utils/jwt.js";

import {
  findByEmail,
  findAdminForLogin,
  createAdmin,
} from "../repository/admin.repository.js";
import {
  findPendingRegisteredRetailers,
  findRetailerById,
  updateRetailerReview,
} from "../repository/user.repository.js";
import { createWallet } from "../../wallet/services/wallet.service.js";

const createAdminService = async ({
  firstName,
  lastName,
  email,
  mobile,
  password,
  roleSlug,
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  const existingAdmin = await findByEmail(normalizedEmail);

  if (existingAdmin) {
    throw new Error("Admin already exists");
  }

  const role = await Role.findOne({
    slug: roleSlug,
    isActive: true,
  });

  if (!role) {
    throw new Error(`Admin role '${roleSlug}' not found`);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await createAdmin({
    firstName: firstName.trim(),
    lastName: lastName?.trim(),
    email: normalizedEmail,
    mobile,
    password: hashedPassword,
    roles: [role._id],
    status: "active",
  });

  return admin;
};


const loginAdminService = async ({
  email,
  password,
}) => {
  if (!email?.trim() || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const admin = await findAdminForLogin({ email });

  if (!admin) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  if (admin.status !== "active") {
    const error = new Error("Admin account is not active");
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password);

  if (!isPasswordValid) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const accessToken = generateAccessToken({
    userId: admin._id.toString(),
    email: admin.email,
    userType: "admin",
  });

  return {
    accessToken,
    admin: {
      id: admin._id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      mobile: admin.mobile,
      status: admin.status,
    },
  };
};

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toDateOnly = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const buildRetailerReview = (user) => ({
  id: user._id,
  mobile: user.mobile,
  isMobileVerified: user.isMobileVerified,
  email: user.email,
  isEmailVerified: user.isEmailVerified,
  fullName: user.fullName,
  gender: user.gender,
  panNumber: user.panNumber,
  aadhaarNumber: user.aadhaarNumber,
  dateOfBirth: toDateOnly(user.dateOfBirth),
  fullAddress: user.shop?.address?.addressLine || null,
  city: user.shop?.address?.city || null,
  state: user.shop?.address?.state || null,
  pincode: user.shop?.address?.pincode || null,
  shopName: user.shop?.name || null,
  shopCategory: user.shop?.category || null,
  propertyType: user.shop?.propertyType || null,
  shopAddress: user.shop?.completeAddress || null,
  latitude: user.shop?.location?.latitude ?? null,
  longitude: user.shop?.location?.longitude ?? null,
  selfie: user.selfie || null,
  maritalStatus: user.maritalStatus || null,
  educationalQualification: user.educationalQualification || null,
  panDocument: user.panDocument || null,
  fatherName: user.fatherName || null,
  aadhaarDocument: user.aadhaarDocument || null,
  shopInsidePhoto: user.shopInsidePhoto || null,
  shopOutsidePhoto: user.shopOutsidePhoto || null,
  shopLocationPhoto: user.shopLocationPhoto || null,
  businessProof: user.businessProofType || null,
  businessProofDocument: user.businessProofDocument || null,
  banks: user.banks || [],
  primaryBank: user.banks?.find((b) => b.isPrimary) || user.banks?.[0] || null,
  outletId: user.outletId,
  adminApproved: user.adminApproved,
  reasonOfRejection: user.reasonOfRejection || null,
  documentReviews: user.documentReviews || null,
  registeredAt: user.updatedAt,
});

const assertRetailerId = (retailerId) => {
  if (!mongoose.Types.ObjectId.isValid(retailerId)) {
    throw fail(400, "Invalid retailer id");
  }
};

const getPendingRetailerReview = async (retailerId) => {
  assertRetailerId(retailerId);

  const retailer = await findRetailerById(retailerId);

  if (!retailer || !retailer.outletId) {
    throw fail(404, "Registered retailer not found");
  }

  if (retailer.adminApproved !== "pending") {
    throw fail(
      409,
      `Retailer is already ${retailer.adminApproved}`
    );
  }

  return retailer;
};

const getPendingRetailersService = async ({
  page = 1,
  limit = 10,
} = {}) => {
  const result = await findPendingRegisteredRetailers({
    page,
    limit,
  });

  return {
    data: result.retailers.map(buildRetailerReview),

    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  };
};

const approveRetailerService = async (retailerId) => {
  await getPendingRetailerReview(retailerId);

  const retailer = await updateRetailerReview(retailerId, {
    adminApproved: "approved",
    reasonOfRejection: null,
  });

  if (!retailer) {
    throw fail(409, "Retailer is no longer pending");
  }

  // Create wallet for the approved retailer
  await createWallet(retailerId);

  return buildRetailerReview(retailer);
};

const rejectRetailerService = async (retailerId, reasonOfRejection) => {
  const reason = String(reasonOfRejection || "").trim();

  if (!reason) {
    throw fail(400, "Reason of rejection is required");
  }

  await getPendingRetailerReview(retailerId);

  const retailer = await updateRetailerReview(retailerId, {
    adminApproved: "rejected",
    reasonOfRejection: reason,
  });

  if (!retailer) {
    throw fail(409, "Retailer is no longer pending");
  }

  return buildRetailerReview(retailer);
};

const DOC_FIELDS = [
  "panDocument",
  "aadhaarDocument",
  "selfie",
  "shopInsidePhoto",
  "shopOutsidePhoto",
  "shopLocationPhoto",
  "businessProofDocument",
];

/**
 * Approve selected documents for a retailer.
 * @param {string} retailerId
 * @param {string} adminId
 * @param {string[]} selectedFields - subset of DOC_FIELDS to approve (defaults to all if empty/omitted)
 */
const approveRetailerDocumentsService = async (retailerId, adminId, selectedFields = []) => {
  assertRetailerId(retailerId);

  // Determine which fields to approve — default to all if none specified
  const fieldsToApprove = selectedFields.length > 0 ? selectedFields : DOC_FIELDS;

  // Validate all requested fields are recognised
  const invalidFields = fieldsToApprove.filter((f) => !DOC_FIELDS.includes(f));
  if (invalidFields.length > 0) {
    throw fail(
      400,
      `Invalid document field(s): ${invalidFields.join(", ")}. Valid fields: ${DOC_FIELDS.join(", ")}`
    );
  }

  const retailer = await findRetailerById(retailerId);

  if (!retailer) {
    throw fail(404, "Retailer not found");
  }

  if (retailer.registrationStatus !== "COMPLETED") {
    throw fail(400, "Retailer has not completed registration yet");
  }

  const reviews = retailer.documentReviews || {};
  const now = new Date();

  // Validate all selected fields are currently PENDING
  for (const field of fieldsToApprove) {
    const doc = reviews[field] || {};
    if (doc.status !== "PENDING") {
      throw fail(
        409,
        `Document '${field}' is not in PENDING status (current: ${doc.status || "NOT_SUBMITTED"})`
      );
    }
  }

  // Mark selected documents as APPROVED
  for (const field of fieldsToApprove) {
    retailer.documentReviews[field].status = "APPROVED";
    retailer.documentReviews[field].reviewedBy = adminId;
    retailer.documentReviews[field].reviewedAt = now;
    retailer.documentReviews[field].rejectionReason = null;
  }

  // Sync adminApproved only when every document is now APPROVED
  const allApproved = DOC_FIELDS.every(
    (f) => (retailer.documentReviews[f]?.status || "NOT_SUBMITTED") === "APPROVED"
  );
  if (allApproved) {
    retailer.adminApproved = "approved";
    retailer.reasonOfRejection = null;
  }

  await retailer.save();
  return buildRetailerReview(retailer);
};

/**
 * Reject selected documents for a retailer.
 * @param {string} retailerId
 * @param {string} adminId
 * @param {string} reasonOfRejection
 * @param {string[]} selectedFields - subset of DOC_FIELDS to reject (defaults to all if empty/omitted)
 */
const rejectRetailerDocumentsService = async (
  retailerId,
  adminId,
  reasonOfRejection,
  selectedFields = []
) => {
  assertRetailerId(retailerId);

  const reason = String(reasonOfRejection || "").trim();
  if (!reason) {
    throw fail(400, "Reason of rejection is required");
  }

  // Determine which fields to reject — default to all if none specified
  const fieldsToReject = selectedFields.length > 0 ? selectedFields : DOC_FIELDS;

  // Validate all requested fields are recognised
  const invalidFields = fieldsToReject.filter((f) => !DOC_FIELDS.includes(f));
  if (invalidFields.length > 0) {
    throw fail(
      400,
      `Invalid document field(s): ${invalidFields.join(", ")}. Valid fields: ${DOC_FIELDS.join(", ")}`
    );
  }

  const retailer = await findRetailerById(retailerId);

  if (!retailer) {
    throw fail(404, "Retailer not found");
  }

  if (retailer.registrationStatus !== "COMPLETED") {
    throw fail(400, "Retailer has not completed registration yet");
  }

  const reviews = retailer.documentReviews || {};
  const now = new Date();

  // Validate all selected fields are currently PENDING
  for (const field of fieldsToReject) {
    const doc = reviews[field] || {};
    if (doc.status !== "PENDING") {
      throw fail(
        409,
        `Document '${field}' is not in PENDING status (current: ${doc.status || "NOT_SUBMITTED"})`
      );
    }
  }

  // Mark selected documents as REJECTED
  for (const field of fieldsToReject) {
    retailer.documentReviews[field].status = "REJECTED";
    retailer.documentReviews[field].reviewedBy = adminId;
    retailer.documentReviews[field].reviewedAt = now;
    retailer.documentReviews[field].rejectionReason = reason;
  }

  retailer.adminApproved = "rejected";
  retailer.reasonOfRejection = reason;

  await retailer.save();
  return buildRetailerReview(retailer);
};

/**
 * Approve a single specific document for a retailer.
 * The document must currently be in PENDING status.
 * If all documents become APPROVED after this call, adminApproved is synced to "approved".
 */
const approveRetailerDocumentService = async (retailerId, documentField, adminId) => {
  assertRetailerId(retailerId);

  if (!DOC_FIELDS.includes(documentField)) {
    throw fail(
      400,
      `Invalid document field '${documentField}'. Valid fields: ${DOC_FIELDS.join(", ")}`
    );
  }

  const retailer = await findRetailerById(retailerId);

  if (!retailer) {
    throw fail(404, "Retailer not found");
  }

  if (retailer.registrationStatus !== "COMPLETED") {
    throw fail(400, "Retailer has not completed registration yet");
  }

  const doc = retailer.documentReviews?.[documentField] || {};
  if (doc.status !== "PENDING") {
    throw fail(
      409,
      `Document '${documentField}' is not in PENDING status (current: ${doc.status || "NOT_SUBMITTED"})`
    );
  }

  const now = new Date();
  retailer.documentReviews[documentField].status = "APPROVED";
  retailer.documentReviews[documentField].reviewedBy = adminId;
  retailer.documentReviews[documentField].reviewedAt = now;
  retailer.documentReviews[documentField].rejectionReason = null;

  // Sync adminApproved if all documents are now APPROVED
  const allApproved = DOC_FIELDS.every(
    (f) => (retailer.documentReviews[f]?.status || "NOT_SUBMITTED") === "APPROVED"
  );
  if (allApproved) {
    retailer.adminApproved = "approved";
    retailer.reasonOfRejection = null;
  }

  await retailer.save();
  return buildRetailerReview(retailer);
};

/**
 * Reject a single specific document for a retailer.
 * The document must currently be in PENDING status.
 * Also syncs adminApproved to "rejected".
 */
const rejectRetailerDocumentService = async (retailerId, documentField, adminId, reasonOfRejection) => {
  assertRetailerId(retailerId);

  if (!DOC_FIELDS.includes(documentField)) {
    throw fail(
      400,
      `Invalid document field '${documentField}'. Valid fields: ${DOC_FIELDS.join(", ")}`
    );
  }

  const reason = String(reasonOfRejection || "").trim();
  if (!reason) {
    throw fail(400, "Reason of rejection is required");
  }

  const retailer = await findRetailerById(retailerId);

  if (!retailer) {
    throw fail(404, "Retailer not found");
  }

  if (retailer.registrationStatus !== "COMPLETED") {
    throw fail(400, "Retailer has not completed registration yet");
  }

  const doc = retailer.documentReviews?.[documentField] || {};
  if (doc.status !== "PENDING") {
    throw fail(
      409,
      `Document '${documentField}' is not in PENDING status (current: ${doc.status || "NOT_SUBMITTED"})`
    );
  }

  const now = new Date();
  retailer.documentReviews[documentField].status = "REJECTED";
  retailer.documentReviews[documentField].reviewedBy = adminId;
  retailer.documentReviews[documentField].reviewedAt = now;
  retailer.documentReviews[documentField].rejectionReason = reason;

  // Sync adminApproved whenever any document is rejected
  retailer.adminApproved = "rejected";
  retailer.reasonOfRejection = reason;

  await retailer.save();
  return buildRetailerReview(retailer);
};

export {
  createAdminService,
  loginAdminService,
  getPendingRetailersService,
  approveRetailerService,
  rejectRetailerService,
  approveRetailerDocumentsService,
  rejectRetailerDocumentsService,
  approveRetailerDocumentService,
  rejectRetailerDocumentService,
};