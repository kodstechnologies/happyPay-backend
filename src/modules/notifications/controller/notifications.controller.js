import ApiResponse from "../../../utils/ApiResponse.js";

import { sendKycApprovedNotification, sendKycRejectedNotification } from "../services/notification.services.js";
import {
  findNotificationsByRecipient,
  markAsRead,
  markAllAsRead,
} from "../repository/notifications.repository.js";

const sendKycApprovedNotificationController =
  async (req, res) => {
    try {
      const { retailerId } = req.body;

      if (!retailerId) {
        return res.status(400).json(
          ApiResponse.error(
            "retailerId is required"
          )
        );
      }

      const result =
        await sendKycApprovedNotification({
          retailerId,
        });

      return res
        .status(result.statusCode)
        .json(
          result.success
            ? ApiResponse.success(
              result.data,
              result.message
            )
            : ApiResponse.error(
              result.message
            )
        );
    } catch (error) {
      console.error(
        "KYC notification controller error:",
        error
      );

      return res.status(500).json(
        ApiResponse.error(
          "Failed to send KYC notification"
        )
      );
    }
  };
const sendKycRejectedNotificationController =
  async (req, res) => {
    try {
      const {
        retailerId,
        rejectionReason,
      } = req.body;

      if (!retailerId) {
        return res.status(400).json(
          ApiResponse.error(
            "retailerId is required"
          )
        );
      }

      if (!rejectionReason?.trim()) {
        return res.status(400).json(
          ApiResponse.error(
            "rejectionReason is required"
          )
        );
      }

      const result =
        await sendKycRejectedNotification({
          retailerId,
          rejectionReason:
            rejectionReason.trim(),
        });

      return res
        .status(result.statusCode)
        .json(
          result.success
            ? ApiResponse.success(
              result.data,
              result.message
            )
            : ApiResponse.error(
              result.message
            )
        );
    } catch (error) {
      console.error(
        "KYC rejection notification error:",
        error
      );

      return res.status(500).json(
        ApiResponse.error(
          "Failed to send KYC rejection notification"
        )
      );
    }
  };

const getNotificationsController = async (req, res) => {
  try {
    const recipientId = req.user?.adminId || req.user?.userId || req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const unread = req.query.unread === "true";

    if (!recipientId) {
      return res.status(400).json(
        ApiResponse.error("User ID not found in request")
      );
    }

    const filter = { recipientId };
    if (unread) {
      filter.isRead = false;
    }

    const notifications = await findNotificationsByRecipient({
      recipientId,
      page,
      limit,
      filter,
    });

    return res.status(200).json(
      ApiResponse.success(notifications, "Notifications fetched successfully")
    );
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json(
      ApiResponse.error("Failed to fetch notifications")
    );
  }
};

const markNotificationAsReadController = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const recipientId = req.user?.adminId || req.user?.userId || req.user?.id;

    if (!notificationId) {
      return res.status(400).json(
        ApiResponse.error("Notification ID is required")
      );
    }

    if (!recipientId) {
      return res.status(400).json(
        ApiResponse.error("User ID not found in request")
      );
    }

    const notification = await markAsRead({
      notificationId,
      recipientId,
    });

    if (!notification) {
      return res.status(404).json(
        ApiResponse.error("Notification not found")
      );
    }

    return res.status(200).json(
      ApiResponse.success(notification, "Notification marked as read")
    );
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return res.status(500).json(
      ApiResponse.error("Failed to mark notification as read")
    );
  }
};

const markAllNotificationsAsReadController = async (req, res) => {
  try {
    const recipientId = req.user?.adminId || req.user?.userId || req.user?.id;

    if (!recipientId) {
      return res.status(400).json(
        ApiResponse.error("User ID not found in request")
      );
    }

    const result = await markAllAsRead(recipientId);

    return res.status(200).json(
      ApiResponse.success(
        { modifiedCount: result.modifiedCount },
        result.modifiedCount > 0
          ? "All notifications marked as read"
          : "No unread notifications to mark"
      )
    );
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    return res.status(500).json(
      ApiResponse.error("Failed to mark all notifications as read")
    );
  }
};

export {
  sendKycApprovedNotificationController,
  sendKycRejectedNotificationController,
  getNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
};