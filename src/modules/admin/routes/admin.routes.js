import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import requireAdmin from "../../../middlewares/admin.middleware.js";
import {
  register,
  login,
  logout,
  getProfile,
  forgotPassword,
  resetPassword,
  list,
  detail,
  updateKyc,
  getAuditLogs,
  getRetailerTransactionsAdmin,
  getDistributorSubRetailersAdmin,
  updateAccountStatus,
  getAllTransactionsAdmin,
  updateDeviceToken,
} from "../controllers/admin.controller.js";

const router = Router();

// Auth routes (unprotected or self-protected)
router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/logout", authMiddleware, requireAdmin, logout);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);

// Device token update for FCM push notifications (protected)
router.patch("/device-token", authMiddleware, requireAdmin, updateDeviceToken);

// Profile route (protected)
router.get("/profile", authMiddleware, requireAdmin, getProfile);


// Retailer routes (protected)
router.get("/retailers", authMiddleware, requireAdmin, list);
router.get("/retailers/:id", authMiddleware, requireAdmin, detail);
router.put("/retailers/:id/kyc", authMiddleware, requireAdmin, updateKyc);
router.patch("/retailers/:id/status", authMiddleware, requireAdmin, updateAccountStatus);

// Audit logs routes (protected)
router.get("/audit-logs", authMiddleware, requireAdmin, getAuditLogs);

// Retailer transaction history (protected)
// GET /api/admin/retailers/:id/transactions
// Query: service, status, type, startDate, endDate, search, page, limit
router.get("/retailers/:id/transactions", authMiddleware, requireAdmin, getRetailerTransactionsAdmin);

// Distributor sub-retailer list (protected)
// GET /api/admin/retailers/:id/sub-retailers
// Query: search, status, adminApproved, page, limit
router.get("/retailers/:id/sub-retailers", authMiddleware, requireAdmin, getDistributorSubRetailersAdmin);

// All transactions across platform (protected)
// GET /api/admin/transactions
// Query: service, status, type, startDate, endDate, search, page, limit
router.get("/transactions", authMiddleware, requireAdmin, getAllTransactionsAdmin);

export default router;
