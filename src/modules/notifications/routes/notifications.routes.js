import { Router } from "express";

import {
  sendKycApprovedNotificationController,
  sendKycRejectedNotificationController,
  getNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  sendCustomNotificationController,
} from "../controller/notifications.controller.js";

import { verifyToken } from "../../../middlewares/auth.middleware.js";
import upload from "../../../middlewares/upload.middleware.js";
import { uploadToS3 } from "../../../utils/s3/uploadToS3.js";

const router = Router();

router.post(
  "/kyc-approved",
  verifyToken,
  sendKycApprovedNotificationController
);
router.post(
  "/kyc-rejected",
  verifyToken,
  sendKycRejectedNotificationController
);

router.post(
  "/custom",
  verifyToken,
  upload.single("image"),
  uploadToS3("notifications", { image: "imageUrl" }),
  sendCustomNotificationController
);

router.get(
  "/",
  verifyToken,
  getNotificationsController
);

router.patch(
  "/:notificationId/read",
  verifyToken,
  markNotificationAsReadController
);

router.patch(
  "/read-all",
  verifyToken,
  markAllNotificationsAsReadController
);

export default router;