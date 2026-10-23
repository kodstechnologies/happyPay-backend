import { Router } from "express";

import {
  sendKycApprovedNotificationController,
  sendKycRejectedNotificationController,
  getNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
} from "../controller/notifications.controller.js";

import { verifyToken } from "../../../middlewares/auth.middleware.js";

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
