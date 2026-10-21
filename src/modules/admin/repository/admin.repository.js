import Admin from "../../auth/model/Admin.model.js";

const findAdminById = (adminId) => Admin.findById(adminId);
const findAdminByEmail = (email) => Admin.findOne({ email: email.toLowerCase().trim() }).select("+password");
const findAdminByMobile = (mobile) => Admin.findOne({ mobile: mobile.trim() }).select("+password");
const createAdmin = (data) => Admin.create(data);
const updateAdminLogin = (adminId, refreshToken, expiresAt, deviceId = "web-admin-portal") => Admin.findByIdAndUpdate(adminId, { lastLoginAt: new Date(), $push: { refreshTokens: { token: refreshToken, deviceId, expiresAt } } }, { new: true });
const removeAdminRefreshToken = (adminId, token) => Admin.findByIdAndUpdate(adminId, { $pull: { refreshTokens: { token } } }, { new: true });
const savePasswordResetToken = (adminId, tokenHash, expiresAt) => Admin.findByIdAndUpdate(adminId, { resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: expiresAt }, { new: true });
const findAdminByResetToken = (tokenHash) => Admin.findOne({ resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: { $gt: new Date() } }).select("+password +resetPasswordTokenHash +resetPasswordExpiresAt");
const updateAdminPassword = (adminId, password) => Admin.findByIdAndUpdate(adminId, { password, $unset: { resetPasswordTokenHash: 1, resetPasswordExpiresAt: 1 }, $set: { updatedAt: new Date() } }, { new: true });

export { findAdminById, findAdminByEmail, findAdminByMobile, createAdmin, updateAdminLogin, removeAdminRefreshToken, savePasswordResetToken, findAdminByResetToken, updateAdminPassword };

