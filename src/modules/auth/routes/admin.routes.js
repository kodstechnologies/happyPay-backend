import { Router } from "express";
import {
  loginAdmin,
  getPendingRetailers,
  approveRetailer,
  rejectRetailer,
  approveRetailerDocuments,
  rejectRetailerDocuments,
  approveRetailerDocument,
  rejectRetailerDocument,
  reviewRetailerDocument,
} from "../controllers/admin.controller.js";
import {
  getNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
} from "../../notifications/controller/notifications.controller.js";
import authMiddleware, { requireAdmin } from "../../../middlewares/auth.middleware.js";

const router = Router();

router.post("/login", loginAdmin);

router.get(
  "/retailers/pending",
  authMiddleware,
  requireAdmin,
  getPendingRetailers
);

router.patch(
  "/retailers/:retailerId/approve",
  authMiddleware,
  requireAdmin,
  approveRetailer
);

router.patch(
  "/retailers/:retailerId/reject",
  authMiddleware,
  requireAdmin,
  rejectRetailer
);


//=========================================
// Bulk: approve / reject ALL documents
//=========================================

router.patch(
  "/retailers/documents/approved/:retailerId",
  authMiddleware,
  requireAdmin,
  approveRetailerDocuments
);

router.patch(
  "/retailers/documents/rejected/:retailerId",
  authMiddleware,
  requireAdmin,
  rejectRetailerDocuments
);

//=========================================
// Per-document: approve / reject ONE document
// :documentField = panDocument | aadhaarDocument | selfie |
//                 shopInsidePhoto | shopOutsidePhoto |
//                 shopLocationPhoto | businessProofDocument
//=========================================

router.patch(
  "/retailers/:retailerId/documents/:documentField/approve",
  authMiddleware,
  requireAdmin,
  approveRetailerDocument
);

router.patch(
  "/retailers/:retailerId/documents/:documentField/reject",
  authMiddleware,
  requireAdmin,
  rejectRetailerDocument
);

//=========================================
// Unified: approve or reject ANY document via action & documentField
//=========================================
router.patch(
  "/retailers/:retailerId/documents/review",
  authMiddleware,
  requireAdmin,
  reviewRetailerDocument
);

router.patch(
  "/retailers/:retailerId/documents/:documentField/review",
  authMiddleware,
  requireAdmin,
  reviewRetailerDocument
);

// =========================================
// Notifications
// =========================================

router.get(
  "/notifications",
  authMiddleware,
  requireAdmin,
  getNotificationsController
);

router.patch(
  "/notifications/:notificationId/read",
  authMiddleware,
  requireAdmin,
  markNotificationAsReadController
);

router.patch(
  "/notifications/read-all",
  authMiddleware,
  requireAdmin,
  markAllNotificationsAsReadController
);

export default router;