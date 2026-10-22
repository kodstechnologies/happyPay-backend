import { firebaseMessaging } from "../../../config/firebase.js";

import User from "../../auth/model/user.model.js";
import Role from "../../auth/model/role.model.js";
import Admin from "../../auth/model/Admin.model.js";

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

const sendRegistrationSuccessNotification = async ({
  retailerId,
  retailerName,
}) => {
  // 1. Find retailer
  const retailer = await User.findById(retailerId)
    .select("devices name");

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
    type: "REGISTRATION_SUCCESS",
    title: "Registration Successful",
    body: `Congratulations ${retailerName || retailer.name}! Your registration with Happy Pay is complete.`,
    data: {
      type: "REGISTRATION_SUCCESS",
      screen: "DASHBOARD",
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
        ? "Registration saved, but Firebase messaging is not configured."
        : "Registration saved but no active FCM device found.",
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
          title: "Registration Successful",
          body: `Congratulations ${retailerName || retailer.name}! Your registration with Happy Pay is complete.`,
        },
        data: {
          type: "REGISTRATION_SUCCESS",
          screen: "DASHBOARD",
        },
      });

      fcmSent = true;
    } catch (error) {
      console.error(
        "Registration success FCM error:",
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
      ? "Registration success notification sent successfully."
      : "Registration saved but notification delivery failed.",
    data: notification,
  };
};

const sendNewRetailerRegistrationNotification = async ({
  retailerId,
  retailerName,
  retailerMobile,
}) => {
  // 1. Find all active admins from the Admin collection
  const admins = await Admin.find({ status: "active" }).select("devices email firstName lastName");

  if (admins.length === 0) {
    return {
      success: false,
      statusCode: 404,
      message: "No active admin users found",
    };
  }

  // 2. Create notification in DB for each admin
  const notifications = [];
  for (const admin of admins) {
    const notification = await createNotification({
      recipientId: admin._id,
      recipientType: "admin",
      type: "NEW_RETAILER_REGISTRATION",
      title: "New Retailer Registration",
      body: `${retailerName} (${retailerMobile}) has completed registration. KYC review pending.`,
      data: {
        type: "NEW_RETAILER_REGISTRATION",
        screen: "ADMIN_RETAILERS",
        retailerId: retailerId,
        retailerName: retailerName,
        retailerMobile: retailerMobile,
      },
    });
    notifications.push(notification);
  }

  // 3. Collect all active FCM devices from all admins
  const allDevices = [];
  for (const admin of admins) {
    const devices =
      admin.devices?.filter(
        (device) =>
          device.isActive &&
          device.fcmToken &&
          device.fcmToken !== "dummy"
      ) || [];
    allDevices.push(...devices);
  }

  if (allDevices.length === 0 || !firebaseMessaging) {
    return {
      success: true,
      statusCode: 200,
      message: !firebaseMessaging
        ? "Registration saved, but Firebase messaging is not configured."
        : "Registration saved but no active admin FCM device found.",
      data: notifications,
    };
  }

  let fcmSent = false;
  let failureReason = null;

  // 4. Send push notification to all admin devices
  for (const device of allDevices) {
    try {
      await firebaseMessaging.send({
        token: device.fcmToken,
        notification: {
          title: "New Retailer Registration",
          body: `${retailerName} (${retailerMobile}) has completed registration. KYC review pending.`,
        },
        data: {
          type: "NEW_RETAILER_REGISTRATION",
          screen: "ADMIN_RETAILERS",
          retailerId: retailerId,
          retailerName: retailerName,
          retailerMobile: retailerMobile,
        },
      });

      fcmSent = true;
    } catch (error) {
      console.error(
        "Admin notification FCM error:",
        error.message
      );
      failureReason = error.message;
    }
  }

  // 5. Update delivery status for all notifications
  for (const notification of notifications) {
    await updateFcmStatus({
      notificationId: notification._id,
      fcmSent,
      fcmFailureReason: failureReason,
    });
  }

  return {
    success: true,
    statusCode: 200,
    message: fcmSent
      ? "Admin notification sent successfully."
      : "Registration saved but notification delivery failed.",
    data: notifications,
  };
};

export { sendKycApprovedNotification, sendKycRejectedNotification, sendRegistrationSuccessNotification, sendNewRetailerRegistrationNotification };