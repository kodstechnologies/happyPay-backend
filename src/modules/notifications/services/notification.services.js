import { firebaseMessaging } from "../../../config/firebase.js";

import User from "../../auth/model/user.model.js";

import {
  createNotification,
  updateFcmStatus,
} from "../repository/notifications.repository.js";

const sendKycApprovedNotification = async ({
  retailerId,
}) => {
  // 1. Find retailer
  const retailer = await User.findById(retailerId)
    .select("devices");

  if (!retailer) {
    return {
      success: false,
      statusCode: 404,
      message: "Retailer not found",
    };
  }

  // 2. Create notification in DB
  const notification = await createNotification({
    recipientId: retailerId,

    recipientType: "retailer",

    type: "KYC_APPROVED",

    title: "KYC Verified",

    body: "Your KYC has been verified successfully.",

    data: {
      type: "KYC_APPROVED",
      screen: "KYC",
    },
  });

  // 3. Get active FCM devices with valid tokens
  const devices =
    retailer.devices?.filter(
      (device) =>
        device.isActive &&
        device.fcmToken &&
        device.fcmToken !== "dummy"
    ) || [];

  if (devices.length === 0 || !firebaseMessaging) {
    return {
      success: true,
      statusCode: 200,
      message: !firebaseMessaging
        ? "KYC approved and notification saved, but Firebase messaging is not configured."
        : "KYC approved and notification saved, but no active FCM device found.",
      data: notification,
    };
  }

  let fcmSent = false;
  let failureReason = null;

  // 4. Send notification to all active devices
  for (const device of devices) {
    try {
      const message = {
        token: device.fcmToken,

        notification: {
          title: "KYC Verified",
          body:
            "Your KYC has been verified successfully.",
        },

        data: {
          type: "KYC_APPROVED",
          screen: "KYC",
        },
      };

      await firebaseMessaging.send(message);

      fcmSent = true;
    } catch (error) {
      console.error(
        "KYC FCM notification error:",
        error.message
      );

      failureReason = error.message;
    }
  }

  // 5. Update notification delivery status
  await updateFcmStatus({
    notificationId: notification._id,
    fcmSent,
    fcmFailureReason: failureReason,
  });

  return {
    success: true,
    statusCode: 200,
    message: fcmSent
      ? "KYC approved notification sent successfully."
      : "KYC approved but notification delivery failed.",
    data: notification,
  };
};
const sendKycRejectedNotification = async ({
  retailerId,
  rejectionReason,
}) => {
  // 1. Find retailer
  const retailer = await User.findById(retailerId)
    .select("devices");

  if (!retailer) {
    return {
      success: false,
      statusCode: 404,
      message: "Retailer not found",
    };
  }

  // 2. Create notification in DB
  const notification = await createNotification({
    recipientId: retailerId,

    recipientType: "retailer",

    type: "KYC_REJECTED",

    title: "KYC Rejected",

    body: rejectionReason
      ? `Your KYC has been rejected. Reason: ${rejectionReason}`
      : "Your KYC has been rejected. Please check the reason and resubmit.",

    data: {
      type: "KYC_REJECTED",
      screen: "KYC",
      rejectionReason: rejectionReason || "",
    },
  });

  // 3. Get active devices with valid tokens
  const devices =
    retailer.devices?.filter(
      (device) =>
        device.isActive &&
        device.fcmToken &&
        device.fcmToken !== "dummy"
    ) || [];

  if (devices.length === 0 || !firebaseMessaging) {
    return {
      success: true,
      statusCode: 200,
      message: !firebaseMessaging
        ? "KYC rejection saved, but Firebase messaging is not configured."
        : "KYC rejection saved but no active FCM device found.",
      data: notification,
    };
  }

  let fcmSent = false;
  let failureReason = null;

  // 4. Send push notification
  for (const device of devices) {
    try {
      await firebaseMessaging.send({
        token: device.fcmToken,

        notification: {
          title: "KYC Rejected",

          body: rejectionReason
            ? `Your KYC has been rejected. Reason: ${rejectionReason}`
            : "Your KYC has been rejected. Please check the reason and resubmit.",
        },

        data: {
          type: "KYC_REJECTED",
          screen: "KYC",
          rejectionReason:
            rejectionReason || "",
        },
      });

      fcmSent = true;
    } catch (error) {
      console.error(
        "KYC rejection FCM error:",
        error.message
      );

      failureReason = error.message;
    }
  }

  // 5. Update delivery status
  await updateFcmStatus({
    notificationId: notification._id,
    fcmSent,
    fcmFailureReason: failureReason,
  });

  return {
    success: true,
    statusCode: 200,
    message: fcmSent
      ? "KYC rejection notification sent successfully."
      : "KYC rejected but notification delivery failed.",
    data: notification,
  };
};
export { sendKycApprovedNotification, sendKycRejectedNotification };