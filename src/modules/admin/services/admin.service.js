import { randomBytes } from "node:crypto";
import env from "../../../config/env.js";
import transporter from "../../../config/mail.js";
import ApiError from "../../../utils/ApiError.js";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt.js";
import {
  createAdmin,
  findAdminById,
  findAdminByEmail,
  findAdminByEmailWithDevices,
  findAdminByMobile,
  updateAdminLogin,
  removeAdminRefreshToken,
  savePasswordResetToken,
  findAdminByResetToken,
  updateAdminPassword,
} from "../repository/admin.repository.js";
import { hashPassword, hashResetToken, verifyPassword } from "../utils/password.js";
import createAdminAuditLog from "../utils/createAdminAuditLog.js";
import { findRetailerById, listRetailers, updateRetailerKyc, updateRetailerAccountStatus, findRetailersByDistributor } from "../repository/adminRetailer.repository.js";
import Wallet from "../../wallet/model/wallet.model.js";
import Admin from "../../auth/model/Admin.model.js";
import Transaction from "../../transaction/model/transaction.model.js";
import { getRetailerTransactions } from "../../transaction/service/transaction.service.js";
import {
  parsePagination,
  buildPaginationMetadata,
  buildTransactionFilter,
} from "../../../utils/queryHelpers.js";
import User from "../../auth/model/user.model.js";
import { sendPushNotification } from "../../../utils/notification.js";
import { sendKycApprovedNotification, sendKycRejectedNotification } from "../../notifications/services/notification.services.js";
import bcrypt from "bcrypt";
import findAdminAuditLogs from "../repository/adminAudit.repository.js";

const refreshExpiry = () => {
  const expiresIn = env.JWT_REFRESH_EXPIRES_IN || "30d";
  const match = /^([0-9]+)([smhd])$/.exec(expiresIn);
  if (!match) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return new Date(Date.now() + Number(match[1]) * multipliers[match[2]]);
};

const publicAdmin = (admin) => {
  const name =
    [admin.firstName, admin.lastName].filter(Boolean).join(" ") ||
    admin.name ||
    "Super Admin";
  return {
    id: admin._id ? admin._id.toString() : admin.id,
    name,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    mobile: admin.mobile,
    role: admin.role || (Array.isArray(admin.roles) && admin.roles.length ? "super-admin" : "Administrator"),
    status: admin.status || "active",
  };
};

const registerAdmin = async ({ name, email, mobile, password, confirmPassword }, req) => {
  if (!name?.trim() || !email?.trim() || !mobile?.trim() || !password || !confirmPassword) throw ApiError.badRequest("Name, email, mobile, password and confirm password are required");
  if (password !== confirmPassword) throw ApiError.badRequest("Passwords do not match");
  if (password.length < 8) throw ApiError.badRequest("Password must be at least 8 characters");
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw ApiError.badRequest("Enter a valid email address");
  if (!/^\d{10}$/.test(mobile.trim())) throw ApiError.badRequest("Mobile number must contain 10 digits");
  if (await findAdminByEmail(email)) throw ApiError.conflict("An admin with this email already exists");
  if (await findAdminByMobile(mobile)) throw ApiError.conflict("An admin with this mobile number already exists");

  const hashedPassword = await bcrypt.hash(password, 12);
  const nameParts = name.trim().split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || "";

  const admin = await createAdmin({
    firstName,
    lastName,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    mobile: mobile.trim(),
    password: hashedPassword,
    status: "active",
  });
  await createAdminAuditLog({ action: "Admin Registered", entity: "Admin", entityId: admin._id, description: `Admin account created for ${admin.email}`, admin, req });
  return publicAdmin(admin);
};

const loginAdmin = async ({ email, password, fcmToken, deviceId, platform, deviceName }, req) => {
  if (!email?.trim() || !password) throw ApiError.badRequest("Email and password are required");
  const admin = await findAdminByEmailWithDevices(email.trim());

  if (!admin) throw ApiError.unauthorized("Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) throw ApiError.unauthorized("Invalid email or password");
  // if (admin.status !== "active") throw ApiError.forbidden("Admin account is inactive or suspended");

  const adminRole = admin.role || (Array.isArray(admin.roles) && admin.roles.length ? "super-admin" : "Administrator");

  // Include userId, adminId, and id for universal middleware/controller compatibility
  const accessToken = generateAccessToken({
    userId: admin._id.toString(),
    adminId: admin._id.toString(),
    id: admin._id.toString(),
    email: admin.email,
    userType: "admin",
    role: adminRole,
  });

  const refreshToken = generateRefreshToken({
    userId: admin._id.toString(),
    adminId: admin._id.toString(),
    id: admin._id.toString(),
    userType: "admin",
  });

  const effectiveDeviceId = deviceId || req?.headers?.["x-device-id"] || "web-admin-portal";
  await updateAdminLogin(admin._id, refreshToken, refreshExpiry(), effectiveDeviceId);

  // Save/update device info if FCM token provided
  if (fcmToken && effectiveDeviceId) {
    try {
      const existingDeviceIndex = admin.devices?.findIndex(
        (d) => d.deviceId === effectiveDeviceId
      );

      if (existingDeviceIndex >= 0) {
        // Update existing device
        admin.devices[existingDeviceIndex].fcmToken = fcmToken;
        admin.devices[existingDeviceIndex].platform = platform || "web";
        admin.devices[existingDeviceIndex].deviceName = deviceName || "Web browser";
        admin.devices[existingDeviceIndex].lastUsedAt = new Date();
        admin.devices[existingDeviceIndex].isActive = true;
      } else {
        // Add new device
        if (!admin.devices) admin.devices = [];
        admin.devices.push({
          deviceId: effectiveDeviceId,
          fcmToken,
          platform: platform || "web",
          deviceName: deviceName || "Web browser",
          lastUsedAt: new Date(),
          isActive: true,
        });
      }
      await admin.save();
    } catch (deviceError) {
      console.warn("Admin device info save failed:", deviceError?.message);
    }
  }

  await createAdminAuditLog({ action: "Admin Login", entity: "Admin", entityId: admin._id, description: `Admin ${admin.email} signed in`, admin, req });
  return { admin: publicAdmin(admin), accessToken, refreshToken };
};

const logoutAdmin = async (adminId, token, req) => {
  if (adminId && token) {
    await removeAdminRefreshToken(adminId, token);
  }
  const admin = adminId ? await findAdminById(adminId) : null;
  if (admin) {
    await createAdminAuditLog({
      action: "Admin Logout",
      entity: "Admin",
      entityId: admin._id,
      description: `Admin ${admin.email} logged out`,
      admin,
      req,
    });
  }
  return { message: "Admin logged out successfully" };
};

const getAdminProfile = async (adminId) => {
  if (!adminId) throw ApiError.unauthorized("Admin ID is required");
  const admin = await findAdminById(adminId);
  if (!admin) throw ApiError.notFound("Admin not found");
  return publicAdmin(admin);
};

const forgotAdminPassword = async ({ email, mobile }) => {
  if ((!email?.trim() && !mobile?.trim()) || (email?.trim() && mobile?.trim())) throw ApiError.badRequest("Provide either email or mobile");
  const admin = email?.trim() ? await findAdminByEmail(email) : await findAdminByMobile(mobile);

  if (admin) {
    const token = randomBytes(32).toString("hex");
    await savePasswordResetToken(admin._id, hashResetToken(token), new Date(Date.now() + 15 * 60 * 1000));
    const resetUrl = `${env.ADMIN_RESET_URL}?token=${token}`;
    const smtpConfigured = env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD;

    if (smtpConfigured) {
      await transporter.sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to: admin.email,
        subject: "Reset your HappyPay admin password",
        text: `Reset your password using this link. It expires in 15 minutes: ${resetUrl}`,
      });
    } else if (env.NODE_ENV !== "production") {
      console.log(`[admin-password-reset] Test reset URL: ${resetUrl}`);
      return {
        message: "Development mode: use the reset link below to continue.",
        resetUrl,
      };
    } else {
      throw ApiError.internal("Password reset email service is not configured");
    }
  }

  return { message: "If an admin account matches those details, reset instructions have been sent." };
};

const resetAdminPassword = async ({ token, newPassword, confirmPassword }) => {
  if (!token || !newPassword || !confirmPassword) throw ApiError.badRequest("Reset token, new password and confirm password are required");
  if (newPassword !== confirmPassword) throw ApiError.badRequest("Passwords do not match");
  if (newPassword.length < 8) throw ApiError.badRequest("Password must be at least 8 characters");

  const admin = await findAdminByResetToken(hashResetToken(token));
  if (!admin) throw ApiError.badRequest("Reset token is invalid or expired");
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await updateAdminPassword(admin._id, hashedPassword);
  return { message: "Admin password reset successfully" };
};


const getRetailers = async (filters = {}) => {
  const { page, limit } = parsePagination(filters);
  return listRetailers({ ...filters, page, limit });
};

const setRetailerAccountStatus = async (id, status, reason = "") => {
  const validStatuses = ["approved", "blocked", "rejected", "active", "suspended", "pending"];
  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest("Invalid status provided");
  }

  const retailer = await findRetailerById(id);
  if (!retailer) throw ApiError.notFound("Retailer not found");

  const updateData = {};
  if (["approved", "rejected"].includes(status)) {
    updateData.adminApproved = status;
    updateData.kycStatus = status;
    if (status === "approved") {
      updateData.status = "active";
      updateData.reasonOfRejection = null;
    } else if (status === "rejected") {
      updateData.status = "rejected";
      updateData.reasonOfRejection = reason || "Application rejected by admin";
      updateData.kycRejectionReason = reason || "Application rejected by admin";
    }
  } else {
    updateData.status = status;
  }

  const updated = await updateRetailerAccountStatus(id, updateData);
  return {
    id: updated._id.toString(),
    status: updated.status,
    adminApproved: updated.adminApproved,
    message: `Retailer status updated to ${status} successfully`,
  };
};

const getRetailer = async (id) => {
  const retailer = await findRetailerById(id);
  if (!retailer) throw ApiError.notFound("Retailer not found");
  const hasDistributorRole =
    retailer.roles?.some(
      (r) =>
        r?.slug === "distributor" ||
        r?.code === "distributor" ||
        r?.name?.toLowerCase() === "distributor"
    ) || retailer.role === "distributor";
  const roleSlug = hasDistributorRole
    ? "distributor"
    : retailer.roles?.[0]?.slug || retailer.role || "retailer";
  return {
    ...retailer,
    id: retailer._id.toString(),
    role: roleSlug,
    kycStatus: retailer.adminApproved || retailer.kycStatus || "pending",
  };
};

const updateRetailerKycStatus = async (id, status, reason = "") => {
  if (!["approved", "rejected"].includes(status)) {
    throw ApiError.badRequest("Invalid KYC status. Must be 'approved' or 'rejected'.");
  }
  if (status === "rejected" && !reason) {
    throw ApiError.badRequest("Reason is required when rejecting KYC.");
  }

  const retailer = await User.findById(id);
  if (!retailer) throw ApiError.notFound("Retailer not found");

  const kycData = {
    kycStatus: status,
    kycRejectionReason: status === "rejected" ? reason : "",
  };

  const updatedRetailer = await updateRetailerKyc(id, kycData);

  try {
    if (status === "approved") {
      await sendKycApprovedNotification({ retailerId: id });
    } else if (status === "rejected") {
      await sendKycRejectedNotification({ retailerId: id, rejectionReason: reason });
    }
  } catch (notifError) {
    console.error("KYC notification error in admin service:", notifError?.message);
  }

  return { id: updatedRetailer._id.toString(), kycStatus: updatedRetailer.kycStatus, kycRejectionReason: updatedRetailer.kycRejectionReason };
};

const listAdminAuditLogs = async (filters = {}) => {
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);

  return findAdminAuditLogs({
    ...filters,
    page,
    limit,
  });
};

// ---------------------------------------------------------------------------
// Admin: retailer transaction history
// ---------------------------------------------------------------------------

/**
 * Returns paginated, filtered transactions for a specific retailer.
 *
 * Delegates entirely to the shared `getRetailerTransactions` service so there
 * is no logic duplication.  Validates the retailer exists first so admins get
 * a clear 404 rather than an empty list for an unknown ID.
 *
 * Supported query options (all optional):
 *   service    — AEPS | DMT | UPI | CMS | PAYOUT | BBPS | RAZORPAY | MANUAL | COMMISSION
 *   status     — pending | success | failed | reversed
 *   type       — credit | debit
 *   startDate  — ISO date string (YYYY-MM-DD, inclusive)
 *   endDate    — ISO date string (YYYY-MM-DD, inclusive)
 *   search     — free-text (matches transactionId, description, payee fields, etc.)
 *   page       — 1-based page number (default 1)
 *   limit      — page size, max 100 (default 10)
 *
 * @param {string} retailerId
 * @param {Object} options - query-string parameters from the controller
 * @returns {{ transactions: Object[], pagination: Object }}
 */
const getAdminRetailerTransactions = async (retailerId, options = {}) => {
  const retailer = await findRetailerById(retailerId);
  if (!retailer) throw ApiError.notFound("Retailer not found");

  // Reuse the existing transaction service — single source of truth for all
  // pagination, filter-building, and wallet-resolution logic.
  return getRetailerTransactions(retailerId, options);
};

// ---------------------------------------------------------------------------
// Admin: distributor sub-retailer list
// ---------------------------------------------------------------------------

/**
 * Returns a paginated list of retailers under a distributor, enriched with
 * wallet transaction statistics (total count + volume of successful transactions).
 *
 * DB round-trips = 3, regardless of result-set size:
 *   1. Paginated User query (with optional search + status filters)
 *   2. Bulk Wallet lookup for all returned user IDs
 *   3. Single Transaction aggregation across all found wallet IDs
 *
 * Supported query options (all optional):
 *   search       — fullName | email | mobile (case-insensitive, regex-safe)
 *   status       — active | blocked | suspended
 *   adminApproved — pending | approved | rejected
 *   page         — 1-based (default 1)
 *   limit        — page size, max 100 (default 10)
 *
 * @param {string} distributorId
 * @param {Object} options - query-string parameters from the controller
 * @returns {{ items: Object[], pagination: Object }}
 */
const getAdminDistributorSubRetailers = async (distributorId, options = {}) => {
  const distributor = await findRetailerById(distributorId);
  if (!distributor) throw ApiError.notFound("Retailer not found");

  const { page, limit, skip } = parsePagination(options);

  // 1. Paginated sub-retailer rows
  const { items: users, total } = await findRetailersByDistributor(distributorId, {
    skip,
    limit,
    search: options.search,
    status: options.status,
    adminApproved: options.adminApproved,
  });

  if (!users.length) {
    return { items: [], pagination: buildPaginationMetadata(0, page, limit) };
  }

  // 2. Bulk wallet lookup — one query for all returned user IDs
  const userIds = users.map((u) => u._id);
  const wallets = await Wallet.find({ user: { $in: userIds } })
    .select("_id user")
    .lean();

  /** Map: userId (string) → walletId (ObjectId) */
  const walletByUser = new Map(wallets.map((w) => [w.user.toString(), w._id]));
  const walletIds = wallets.map((w) => w._id);

  // 3. Single aggregation — successful-transaction count + volume per wallet
  const txStats = walletIds.length
    ? await Transaction.aggregate([
      { $match: { wallet: { $in: walletIds }, status: "success" } },
      {
        $group: {
          _id: "$wallet",
          totalTransactions: { $sum: 1 },
          totalVolume: { $sum: "$amount" },
        },
      },
    ])
    : [];

  /** Map: walletId (string) → { totalTransactions, totalVolume } */
  const statsByWallet = new Map(
    txStats.map((s) => [s._id.toString(), s])
  );

  // Compose final items — mask account numbers, attach stats
  const items = users.map((user) => {
    const walletId = walletByUser.get(user._id.toString());
    const stats = walletId ? statsByWallet.get(walletId.toString()) : null;
    const primaryBank =
      user.banks?.find((b) => b.isPrimary) ?? user.banks?.[0] ?? null;

    return {
      id: user._id.toString(),
      fullName: user.fullName ?? null,
      email: user.email ?? null,
      mobile: user.mobile ?? null,
      panNumber: user.panNumber ?? null,
      status: user.status,
      adminApproved: user.adminApproved,
      registrationStatus: user.registrationStatus,
      shopName: user.shop?.name ?? null,
      shopAddress:
        user.shop?.completeAddress ??
        (user.shop?.address?.addressLine
          ? `${user.shop.address.addressLine}, ${user.shop.address.city ?? ""}, ${user.shop.address.state ?? ""}`
          : null),
      primaryBank: primaryBank
        ? {
          name: primaryBank.name ?? null,
          ifscCode: primaryBank.ifscCode ?? null,
          // Mask all but last 4 digits for security
          accountNumber: primaryBank.accountNumber
            ? `XXXXXXXX${String(primaryBank.accountNumber).slice(-4)}`
            : null,
        }
        : null,
      createdAt: user.createdAt,
      totalTransactions: stats?.totalTransactions ?? 0,
      totalVolume: stats?.totalVolume ?? 0,
    };
  });

  return { items, pagination: buildPaginationMetadata(total, page, limit) };
};

// ---------------------------------------------------------------------------
// Admin: list all transactions across all retailers
// ---------------------------------------------------------------------------

/**
 * Returns paginated, filtered transactions across the entire platform for admin.
 *
 * Supported query options (all optional):
 *   service    — AEPS | DMT | UPI | CMS | PAYOUT | BBPS | RAZORPAY | MANUAL | COMMISSION
 *   status     — pending | success | failed | reversed
 *   type       — credit | debit
 *   startDate  — ISO date string (YYYY-MM-DD, inclusive)
 *   endDate    — ISO date string (YYYY-MM-DD, inclusive)
 *   search     — free-text (matches transactionId, description, payee fields, etc.)
 *   page       — 1-based page number (default 1)
 *   limit      — page size, max 100 (default 10)
 *
 * @param {Object} options - query-string parameters from the controller
 * @returns {{ transactions: Object[], pagination: Object }}
 */
const listAllTransactionsAdmin = async (options = {}) => {
  const { page, limit, skip } = parsePagination(options);
  const filter = buildTransactionFilter(null, options);

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .select("-__v")
      .populate({
        path: "wallet",
        select: "user",
        populate: {
          path: "user",
          select: "fullName mobile email",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  return {
    transactions,
    pagination: buildPaginationMetadata(total, page, limit),
  };
};

export {
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
  forgotAdminPassword,
  resetAdminPassword,
  getRetailers,
  getRetailer,
  updateRetailerKycStatus,
  listAdminAuditLogs,
  getAdminRetailerTransactions,
  getAdminDistributorSubRetailers,
  setRetailerAccountStatus,
  listAllTransactionsAdmin,
};

