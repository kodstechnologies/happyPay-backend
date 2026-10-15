import { randomBytes } from "node:crypto";
import env from "../../../config/env.js";
import transporter from "../../../config/mail.js";
import ApiError from "../../../utils/ApiError.js";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt.js";
import { createAdmin, findAdminByEmail, findAdminByMobile, updateAdminLogin, savePasswordResetToken, findAdminByResetToken, updateAdminPassword } from "../repository/admin.repository.js";
import { hashPassword, hashResetToken, verifyPassword } from "../utils/password.js";
import createAdminAuditLog from "../utils/createAdminAuditLog.js";
import { findRetailerById, listRetailers, updateRetailerKyc } from "../repository/adminRetailer.repository.js";
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

const publicAdmin = (admin) => ({ id: admin._id, name: admin.name, email: admin.email, mobile: admin.mobile, role: admin.role, status: admin.status });

const registerAdmin = async ({ name, email, mobile, password, confirmPassword }, req) => {
  if (!name?.trim() || !email?.trim() || !mobile?.trim() || !password || !confirmPassword) throw ApiError.badRequest("Name, email, mobile, password and confirm password are required");
  if (password !== confirmPassword) throw ApiError.badRequest("Passwords do not match");
  if (password.length < 8) throw ApiError.badRequest("Password must be at least 8 characters");
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw ApiError.badRequest("Enter a valid email address");
  if (!/^\d{10}$/.test(mobile.trim())) throw ApiError.badRequest("Mobile number must contain 10 digits");
  if (await findAdminByEmail(email)) throw ApiError.conflict("An admin with this email already exists");
  if (await findAdminByMobile(mobile)) throw ApiError.conflict("An admin with this mobile number already exists");

  const admin = await createAdmin({ name: name.trim(), email: email.trim().toLowerCase(), mobile: mobile.trim(), passwordHash: await hashPassword(password) });
  await createAdminAuditLog({ action: "Admin Registered", entity: "Admin", entityId: admin._id, description: `Admin account created for ${admin.email}`, admin, req });
  return publicAdmin(admin);
};

const loginAdmin = async ({ email, password }, req) => {
  if (!email?.trim() || !password) throw ApiError.badRequest("Email and password are required");
  const admin = await findAdminByEmail(email.trim());
  console.log("Admin found:", !!admin, "Password hash exists:", !!admin?.password);
  
  if (!admin) throw ApiError.unauthorized("Invalid admin credentials (not found)");
  
  const isPasswordValid = await bcrypt.compare(password, admin.password);
  console.log("Is password valid:", isPasswordValid);
  
  if (!isPasswordValid) throw ApiError.unauthorized("Invalid admin credentials (wrong password)");
  if (admin.status !== "active") throw ApiError.forbidden("Admin account is inactive or suspended");

  const accessToken = generateAccessToken({ adminId: admin._id.toString(), email: admin.email, userType: "admin", role: admin.role });
  const refreshToken = generateRefreshToken({ adminId: admin._id.toString(), userType: "admin" });
  await updateAdminLogin(admin._id, refreshToken, refreshExpiry());
  await createAdminAuditLog({ action: "Admin Login", entity: "Admin", entityId: admin._id, description: `Admin ${admin.email} signed in`, admin, req });
  return { admin: publicAdmin(admin), accessToken, refreshToken };
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
  await updateAdminPassword(admin._id, await hashPassword(newPassword));
  return { message: "Admin password reset successfully" };
};

const getRetailers = async (filters = {}) => {
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
  return listRetailers({ ...filters, page, limit });
};

const getRetailer = async (id) => {
  const retailer = await findRetailerById(id);
  if (!retailer) throw ApiError.notFound("Retailer not found");
  return { ...retailer, id: retailer._id.toString() };
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

export {
  registerAdmin,
  loginAdmin,
  forgotAdminPassword,
  resetAdminPassword,
  getRetailers,
  getRetailer,
  updateRetailerKycStatus,
  listAdminAuditLogs,
};
