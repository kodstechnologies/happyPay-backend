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
import { logAdminAction } from "./auditLog.services.js";

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
  ipAddress = null,
  userAgent = null,
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

  // Log admin login action
  await logAdminAction({
    adminId: admin._id,
    userName: `${admin.firstName} ${admin.lastName || ""}`.trim(),
    role: "Admin",
    action: "Admin Login",
    entity: "Auth",
    description: "Successful login from admin panel",
    ipAddress,
    userAgent,
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
  retailerId: user.retailerId || null,
  distributorId: user.distributorId || null,
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
  outletId: user.AepsEkyc?.outletId || null,
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

  if (!retailer || !retailer.AepsEkyc) {
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

const approveRetailerService = async (retailerId, adminId = null, adminName = null, adminRole = null) => {
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

  // Log audit action
  await logAdminAction({
    adminId: adminId,
    userName: adminName || "Admin",
    role: adminRole || "Admin",
    action: "KYC Approved",
    entity: "Retailer",
    entityId: retailerId,
    description: `Approved KYC for retailer ${retailer.fullName || retailerId}`,
  });

  return buildRetailerReview(retailer);
};

const rejectRetailerService = async (retailerId, reasonOfRejection, adminId = null, adminName = null, adminRole = null) => {
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

  // Log audit action
  await logAdminAction({
    adminId,
    userName: adminName || "Admin",
    role: adminRole || "Admin",
    action: "KYC Rejected",
    entity: "Retailer",
    entityId: retailerId,
    description: `Rejected KYC for retailer ${retailer.fullName || retailerId}. Reason: ${reason}`,
  });

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

  if (!retailer.documentReviews) {
    retailer.documentReviews = {};
  }

  const now = new Date();
  const validAdminId = (adminId && mongoose.Types.ObjectId.isValid(adminId)) ? adminId : null;

  // Mark selected documents as APPROVED
  for (const field of fieldsToApprove) {
    if (!retailer.documentReviews[field]) retailer.documentReviews[field] = {};
    retailer.documentReviews[field].status = "APPROVED";
    retailer.documentReviews[field].reviewedBy = validAdminId;
    retailer.documentReviews[field].reviewedAt = now;
    retailer.documentReviews[field].rejectionReason = null;
  }

  // Sync adminApproved only when all actually uploaded documents are now APPROVED
  const uploadedFields = DOC_FIELDS.filter((f) => Boolean(retailer[f]));
  const allApproved =
    uploadedFields.length > 0 &&
    uploadedFields.every(
      (f) => (retailer.documentReviews[f]?.status || "NOT_SUBMITTED") === "APPROVED"
    );
  if (allApproved) {
    retailer.adminApproved = "approved";
    retailer.kycStatus = "approved";
    retailer.reasonOfRejection = null;
  }

  retailer.markModified("documentReviews");
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

  if (!retailer.documentReviews) {
    retailer.documentReviews = {};
  }

  const now = new Date();
  const validAdminId = (adminId && mongoose.Types.ObjectId.isValid(adminId)) ? adminId : null;

  // Mark selected documents as REJECTED
  for (const field of fieldsToReject) {
    if (!retailer.documentReviews[field]) retailer.documentReviews[field] = {};
    retailer.documentReviews[field].status = "REJECTED";
    retailer.documentReviews[field].reviewedBy = validAdminId;
    retailer.documentReviews[field].reviewedAt = now;
    retailer.documentReviews[field].rejectionReason = reason;
  }

  retailer.adminApproved = "rejected";
  retailer.kycStatus = "rejected";
  retailer.reasonOfRejection = reason;

  retailer.markModified("documentReviews");
  await retailer.save();
  return buildRetailerReview(retailer);
};

/**
 * Unified document review service.
 * Performs either "approve" or "reject" action based on the document type and action parameter.
 * Automatically synchronizes the retailer's overall adminApproved status and updates review audits.
 *
 * @param {Object} params
 * @param {string} params.retailerId - MongoDB ObjectId string of the retailer
 * @param {string} params.documentField - Name of the document field (e.g. "panDocument")
 * @param {string} params.action - "approve" | "approved" | "reject" | "rejected"
 * @param {string} [params.reason] - Rejection reason (required if action is reject)
 * @param {string} [params.adminId] - Admin user performing the review
 */
const reviewRetailerDocumentService = async ({
  retailerId,
  documentField,
  action,
  reason = "",
  adminId,
}) => {
  assertRetailerId(retailerId);

  if (!DOC_FIELDS.includes(documentField)) {
    throw fail(
      400,
      `Invalid document field '${documentField}'. Valid fields: ${DOC_FIELDS.join(", ")}`
    );
  }

  const normalizedAction = String(action || "").toLowerCase().trim();
  const isApprove = normalizedAction === "approve" || normalizedAction === "approved";
  const isReject = normalizedAction === "reject" || normalizedAction === "rejected";

  if (!isApprove && !isReject) {
    throw fail(400, "Invalid action. Must be 'approve' or 'reject'.");
  }

  const trimmedReason = String(reason || "").trim();
  if (isReject && !trimmedReason) {
    throw fail(400, "Reason of rejection is required when rejecting a document");
  }

  const retailer = await findRetailerById(retailerId);

  if (!retailer) {
    throw fail(404, "Retailer not found");
  }

  if (!retailer.documentReviews) {
    retailer.documentReviews = {};
  }
  if (!retailer.documentReviews[documentField]) {
    retailer.documentReviews[documentField] = { status: "PENDING" };
  }

  const now = new Date();
  const validAdminId = (adminId && mongoose.Types.ObjectId.isValid(adminId)) ? adminId : null;
  retailer.documentReviews[documentField].reviewedBy = validAdminId;
  retailer.documentReviews[documentField].reviewedAt = now;

  if (isApprove) {
    retailer.documentReviews[documentField].status = "APPROVED";
    retailer.documentReviews[documentField].rejectionReason = null;

    // Sync adminApproved if all actually uploaded documents are now APPROVED
    const uploadedFields = DOC_FIELDS.filter((f) => Boolean(retailer[f]));
    const allApproved =
      uploadedFields.length > 0 &&
      uploadedFields.every(
        (f) => (retailer.documentReviews[f]?.status || "NOT_SUBMITTED") === "APPROVED"
      );

    if (allApproved) {
      retailer.adminApproved = "approved";
      retailer.kycStatus = "approved";
      retailer.reasonOfRejection = null;
    }
  } else {
    retailer.documentReviews[documentField].status = "REJECTED";
    retailer.documentReviews[documentField].rejectionReason = trimmedReason;

    // Sync adminApproved whenever any document is rejected
    retailer.adminApproved = "rejected";
    retailer.kycStatus = "rejected";
    retailer.reasonOfRejection = trimmedReason;
  }

  retailer.markModified("documentReviews");
  await retailer.save();
  return buildRetailerReview(retailer);
};

/**
 * Approve a single specific document for a retailer (delegates to reviewRetailerDocumentService).
 */
const approveRetailerDocumentService = async (retailerId, documentField, adminId) => {
  return reviewRetailerDocumentService({
    retailerId,
    documentField,
    action: "approve",
    adminId,
  });
};

/**
 * Reject a single specific document for a retailer (delegates to reviewRetailerDocumentService).
 */
const rejectRetailerDocumentService = async (retailerId, documentField, adminId, reasonOfRejection) => {
  return reviewRetailerDocumentService({
    retailerId,
    documentField,
    action: "reject",
    reason: reasonOfRejection,
    adminId,
  });
};

// ============================================================
// BANK APPROVAL SERVICES
// ============================================================

/**
 * Get all pending banks across all retailers for admin review
 */
const getPendingBanksService = async ({ page = 1, limit = 10 } = {}) => {
  const User = (await import("../model/user.model.js")).default;

  const skip = (page - 1) * limit;

  const retailers = await User.find({
    "pendingBanks.approvalStatus": "pending",
  })
    .select("mobile fullName email _id pendingBanks")
    .skip(skip)
    .limit(limit)
    .sort({ "pendingBanks.submittedAt": -1 });

  const total = await User.countDocuments({
    "pendingBanks.approvalStatus": "pending",
  });

  const pendingBanks = [];
  retailers.forEach((retailer) => {
    if (retailer.pendingBanks) {
      retailer.pendingBanks.forEach((bank, index) => {
        if (bank.approvalStatus === "pending") {
          pendingBanks.push({
            bankId: bank._id,
            retailerId: retailer._id,
            retailerMobile: retailer.mobile,
            retailerEmail: retailer.email,
            retailerName: retailer.fullName,
            bankIndex: index,
            name: bank.name,
            bank_code: bank.bank_code,
            ifscCode: bank.ifscCode,
            accountNumber: bank.accountNumber,
            branchName: bank.branchName,
            isPrimary: bank.isPrimary,
            submittedAt: bank.submittedAt,
          });
        }
      });
    }
  });

  return {
    data: pendingBanks,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get ALL bank approval requests across all retailers (every status:
 * pending, rejected, and approved). Pending/rejected requests are read from
 * `pendingBanks`; approved banks are read from the active `banks` array (they
 * have graduated out of the approval pipeline). Each item carries its
 * `approvalStatus` so the admin list can show the status.
 *
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {("pending"|"rejected"|"approved"|"all")} [params.status="all"]
 * @param {string} [params.search] - matches retailer name/mobile/email or bank name
 */
const getAllBankRequestsService = async ({ page = 1, limit = 10, status = "all", search = "" } = {}) => {
  const User = (await import("../model/user.model.js")).default;

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const normalizedStatus = String(status || "all").toLowerCase().trim();
  const allowedStatuses = ["all", "pending", "rejected", "approved"];
  if (!allowedStatuses.includes(normalizedStatus)) {
    throw fail(400, `Invalid status filter. Allowed values: ${allowedStatuses.join(", ")}`);
  }

  const includePending = normalizedStatus === "all" || normalizedStatus === "pending";
  const includeRejected = normalizedStatus === "all" || normalizedStatus === "rejected";
  const includeApproved = normalizedStatus === "all" || normalizedStatus === "approved";

  const term = String(search || "").trim().toLowerCase();

  // DB-level pre-filter: narrow to users whose retailer fields OR a bank name
  // matches the search term. Per-item matching is re-checked in JS below.
  const buildMatch = (baseFilter, bankNamePath) => {
    if (!term) return baseFilter;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    const orClauses = [
      { fullName: regex },
      { mobile: regex },
      { email: regex },
    ];
    if (bankNamePath) orClauses.push({ [bankNamePath]: regex });
    return { ...baseFilter, $or: orClauses };
  };

  const retailerMatchesTerm = (r) => {
    if (!term) return true;
    return (
      String(r.fullName || r.name || "").toLowerCase().includes(term) ||
      String(r.mobile || "").includes(term) ||
      String(r.email || "").toLowerCase().includes(term)
    );
  };

  const bankNameMatchesTerm = (bankName) => {
    if (!term) return true;
    return String(bankName || "").toLowerCase().includes(term);
  };

  const requests = [];

  // 1) Pending + Rejected requests (still in the approval pipeline)
  const pipelineStatuses = [];
  if (includePending) pipelineStatuses.push("pending");
  if (includeRejected) pipelineStatuses.push("rejected");

  if (pipelineStatuses.length > 0) {
    const retailers = await User.find(
      buildMatch({ "pendingBanks.approvalStatus": { $in: pipelineStatuses } }, "pendingBanks.name")
    )
      .select("mobile fullName email name _id pendingBanks")
      .lean();

    retailers.forEach((r) => {
      if (!r.pendingBanks) return;
      const retailerHits = retailerMatchesTerm(r);
      r.pendingBanks.forEach((bank) => {
        if (!pipelineStatuses.includes(bank.approvalStatus)) return;
        if (!retailerHits && !bankNameMatchesTerm(bank.name)) return;
        requests.push({
          retailerId: r._id,
          retailerName: r.fullName || r.name || "",
          retailerMobile: r.mobile || "",
          retailerEmail: r.email || "",
          bankId: bank._id,
          source: "pendingBanks",
          name: bank.name,
          bank_code: bank.bank_code || null,
          bankMasterId: bank.bankMasterId || null,
          ifscCode: bank.ifscCode,
          accountNumber: bank.accountNumber,
          branchName: bank.branchName || "",
          isPrimary: Boolean(bank.isPrimary),
          approvalStatus: bank.approvalStatus,
          rejectionReason: bank.rejectionReason || null,
          submittedAt: bank.submittedAt || null,
          reviewedAt: bank.reviewedAt || null,
          reviewedBy: bank.reviewedBy || null,
        });
      });
    });
  }

  // 2) Approved requests (banks that were approved and are now active)
  if (includeApproved) {
    const retailers = await User.find(
      buildMatch({ "banks.0": { $exists: true } }, "banks.name")
    )
      .select("mobile fullName email name _id banks")
      .lean();

    retailers.forEach((r) => {
      if (!r.banks) return;
      const retailerHits = retailerMatchesTerm(r);
      r.banks.forEach((bank) => {
        if (!retailerHits && !bankNameMatchesTerm(bank.name)) return;
        requests.push({
          retailerId: r._id,
          retailerName: r.fullName || r.name || "",
          retailerMobile: r.mobile || "",
          retailerEmail: r.email || "",
          bankId: bank._id,
          source: "banks",
          name: bank.name,
          bank_code: bank.bank_code || null,
          bankMasterId: bank.bankMasterId || null,
          ifscCode: bank.ifscCode,
          accountNumber: bank.accountNumber,
          branchName: bank.branchName || "",
          isPrimary: Boolean(bank.isPrimary),
          isActive: bank.isActive !== false,
          approvalStatus: "approved",
          rejectionReason: null,
          submittedAt: null,
          reviewedAt: null,
          reviewedBy: null,
        });
      });
    });
  }

  // Sort: pending first, then rejected, then approved; newest submittedAt within a status.
  const statusOrder = { pending: 0, rejected: 1, approved: 2 };
  requests.sort((a, b) => {
    const byStatus = (statusOrder[a.approvalStatus] ?? 3) - (statusOrder[b.approvalStatus] ?? 3);
    if (byStatus !== 0) return byStatus;
    const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bTime - aTime;
  });

  const total = requests.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const skip = (pageNum - 1) * limitNum;
  const paged = requests.slice(skip, skip + limitNum);

  return {
    data: paged,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  };
};

/**
 * Approve a pending bank account
 */
const approveBankService = async (retailerId, pendingBankId, adminId, adminName = null, adminRole = null) => {
  assertRetailerId(retailerId);

  const User = (await import("../model/user.model.js")).default;
  const retailer = await User.findById(retailerId);

  if (!retailer) {
    throw fail(404, "Retailer not found");
  }

  if (!retailer.pendingBanks || retailer.pendingBanks.length === 0) {
    throw fail(404, "No pending banks found for this retailer");
  }

  const pendingBankIndex = retailer.pendingBanks.findIndex(
    (b) => b._id && b._id.toString() === pendingBankId
  );

  if (pendingBankIndex === -1) {
    throw fail(404, "Pending bank not found");
  }

  const pendingBank = retailer.pendingBanks[pendingBankIndex];

  if (pendingBank.approvalStatus !== "pending") {
    throw fail(409, "Bank is not in pending status");
  }

  // Create approved bank object
  const approvedBank = {
    name: pendingBank.name,
    bank_code: pendingBank.bank_code,
    bankMasterId: pendingBank.bankMasterId || null,
    ifscCode: pendingBank.ifscCode,
    accountNumber: pendingBank.accountNumber,
    confirmAccountNumber: pendingBank.confirmAccountNumber,
    branchName: pendingBank.branchName,
    isPrimary: pendingBank.isPrimary,
    isActive: true,
  };

  // Handle primary bank logic
  if (approvedBank.isPrimary && retailer.banks && retailer.banks.length > 0) {
    retailer.banks.forEach((b) => {
      b.isPrimary = false;
    });
  }

  // Add to active banks
  if (!retailer.banks) retailer.banks = [];
  retailer.banks.push(approvedBank);

  // Remove from pending banks
  retailer.pendingBanks.splice(pendingBankIndex, 1);
  retailer.markModified("banks");
  retailer.markModified("pendingBanks");

  await retailer.save();

  // Log audit action
  await logAdminAction({
    adminId,
    userName: adminName || "Admin",
    role: adminRole || "Admin",
    action: "Bank Approved",
    entity: "Bank",
    entityId: pendingBankId,
    description: `Approved bank account ${pendingBank.name} for retailer ${retailer.fullName || retailerId}`,
  });

  // Send notification to retailer (non-blocking)
  const { sendBankApprovedNotification } = await import("../../notifications/services/notification.services.js");
  sendBankApprovedNotification({
    retailerId,
    bankName: pendingBank.name,
  }).catch((err) => console.error("Failed to send bank approval notification:", err));

  // Return updated retailer profile
  const buildRetailerReview = (user) => ({
    id: user._id,
    retailerId: user.retailerId || null,
    distributorId: user.distributorId || null,
    mobile: user.mobile,
    fullName: user.fullName,
    banks: user.banks || [],
    pendingBanks: user.pendingBanks || [],
  });

  return buildRetailerReview(retailer);
};

/**
 * Reject a pending bank account
 */
const rejectBankService = async (retailerId, pendingBankId, adminId, rejectionReason, adminName = null, adminRole = null) => {
  assertRetailerId(retailerId);

  const reason = String(rejectionReason || "").trim();
  if (!reason) {
    throw fail(400, "Rejection reason is required");
  }

  const User = (await import("../model/user.model.js")).default;
  const retailer = await User.findById(retailerId);

  if (!retailer) {
    throw fail(404, "Retailer not found");
  }

  if (!retailer.pendingBanks || retailer.pendingBanks.length === 0) {
    throw fail(404, "No pending banks found for this retailer");
  }

  const pendingBankIndex = retailer.pendingBanks.findIndex(
    (b) => b._id && b._id.toString() === pendingBankId
  );

  if (pendingBankIndex === -1) {
    throw fail(404, "Pending bank not found");
  }

  const pendingBank = retailer.pendingBanks[pendingBankIndex];

  if (pendingBank.approvalStatus !== "pending") {
    throw fail(409, "Bank is not in pending status");
  }

  // Update pending bank with rejection details
  retailer.pendingBanks[pendingBankIndex].approvalStatus = "rejected";
  retailer.pendingBanks[pendingBankIndex].rejectionReason = reason;
  retailer.pendingBanks[pendingBankIndex].reviewedAt = new Date();
  retailer.pendingBanks[pendingBankIndex].reviewedBy = adminId;

  retailer.markModified("pendingBanks");
  await retailer.save();

  // Log audit action
  await logAdminAction({
    adminId,
    userName: adminName || "Admin",
    role: adminRole || "Admin",
    action: "Bank Rejected",
    entity: "Bank",
    entityId: pendingBankId,
    description: `Rejected bank account ${pendingBank.name} for retailer ${retailer.fullName || retailerId}. Reason: ${reason}`,
  });

  // Send notification to retailer (non-blocking)
  const { sendBankRejectedNotification } = await import("../../notifications/services/notification.services.js");
  sendBankRejectedNotification({
    retailerId,
    bankName: pendingBank.name,
    rejectionReason: reason,
  }).catch((err) => console.error("Failed to send bank rejection notification:", err));

  const buildRetailerReview = (user) => ({
    id: user._id,
    retailerId: user.retailerId || null,
    distributorId: user.distributorId || null,
    mobile: user.mobile,
    fullName: user.fullName,
    banks: user.banks || [],
    pendingBanks: user.pendingBanks || [],
  });

  return buildRetailerReview(retailer);
};

/**
 * Allow retailer to resubmit a rejected bank
 */
const resubmitBankService = async (retailerId, pendingBankId, newBankDetails) => {
  assertRetailerId(retailerId);

  const User = (await import("../model/user.model.js")).default;
  const retailer = await User.findById(retailerId);

  if (!retailer) {
    throw fail(404, "Retailer not found");
  }

  if (!retailer.pendingBanks || retailer.pendingBanks.length === 0) {
    throw fail(404, "No pending banks found for this retailer");
  }

  const pendingBankIndex = retailer.pendingBanks.findIndex(
    (b) => b._id && b._id.toString() === pendingBankId
  );

  if (pendingBankIndex === -1) {
    throw fail(404, "Pending bank not found");
  }

  const pendingBank = retailer.pendingBanks[pendingBankIndex];

  if (pendingBank.approvalStatus !== "rejected") {
    throw fail(409, "Only rejected banks can be resubmitted");
  }

  // Update bank details and reset to pending
  retailer.pendingBanks[pendingBankIndex] = {
    ...retailer.pendingBanks[pendingBankIndex],
    name: (newBankDetails.bankName || pendingBank.name).trim(),
    bank_code: newBankDetails.bank_code !== undefined
      ? String(newBankDetails.bank_code).trim()
      : pendingBank.bank_code,
    bankMasterId: newBankDetails.bankMasterId !== undefined
      ? (newBankDetails.bankMasterId ? String(newBankDetails.bankMasterId).trim() : null)
      : (pendingBank.bankMasterId || null),
    ifscCode: (newBankDetails.ifscCode || pendingBank.ifscCode).trim().toUpperCase(),
    accountNumber: (newBankDetails.accountNumber || pendingBank.accountNumber).trim(),
    confirmAccountNumber: (newBankDetails.accountNumber || pendingBank.accountNumber).trim(),
    branchName: (newBankDetails.branchName || pendingBank.branchName).trim(),
    approvalStatus: "pending",
    rejectionReason: null,
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
  };

  retailer.markModified("pendingBanks");
  await retailer.save();

  const buildRetailerReview = (user) => ({
    id: user._id,
    retailerId: user.retailerId || null,
    distributorId: user.distributorId || null,
    mobile: user.mobile,
    fullName: user.fullName,
    banks: user.banks || [],
    pendingBanks: user.pendingBanks || [],
  });

  return buildRetailerReview(retailer);
};

/**
 * Convert a retailer to distributor by adding distributor role
 */
const convertToDistributorService = async (retailerId, adminId = null, adminName = null, adminRole = null) => {
  assertRetailerId(retailerId);

  const User = (await import("../model/user.model.js")).default;
  const retailer = await User.findById(retailerId);

  if (!retailer) {
    throw fail(404, "Retailer not found");
  }

  // Assign distributor role using the model method
  await retailer.assignRole("distributor");

  // Generate a distributor ID if the user doesn't have one yet
  if (!retailer.distributorId) {
    const { generateDistributorId } = await import("../../../utils/generateTxnId.js");
    retailer.distributorId = generateDistributorId(retailer._id);
  }

  retailer.markModified("roles");
  await retailer.save();

  // Log audit action
  await logAdminAction({
    adminId,
    userName: adminName || "Admin",
    role: adminRole || "Admin",
    action: "Converted to Distributor",
    entity: "Retailer",
    entityId: retailerId,
    description: `Converted retailer ${retailer.fullName || retailerId} to distributor`,
  });

  // Send notification to retailer (non-blocking)
  const { sendConvertedToDistributorNotification } = await import("../../notifications/services/notification.services.js");
  sendConvertedToDistributorNotification({
    retailerId,
  }).catch((err) => console.error("Failed to send converted to distributor notification:", err));

  const buildRetailerReview = (user) => ({
    id: user._id,
    retailerId: user.retailerId || null,
    distributorId: user.distributorId || null,
    mobile: user.mobile,
    fullName: user.fullName,
    banks: user.banks || [],
    pendingBanks: user.pendingBanks || [],
    roles: user.roles || [],
  });

  return buildRetailerReview(retailer);
};

export {
  createAdminService,
  loginAdminService,
  getPendingRetailersService,
  approveRetailerService,
  rejectRetailerService,
  approveRetailerDocumentsService,
  convertToDistributorService,
  rejectRetailerDocumentsService,
  approveRetailerDocumentService,
  rejectRetailerDocumentService,
  reviewRetailerDocumentService,
  approveBankService,
  rejectBankService,
  resubmitBankService,
  getPendingBanksService,
  getAllBankRequestsService
};