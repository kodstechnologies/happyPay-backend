import Notification from "../model/notifications.model.js";

const createNotification = async (payload) => {
  return Notification.create(payload);
};

const findNotificationsByRecipient = async ({
  recipientId,
  page = 1,
  limit = 20,
  filter = {},
}) => {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({
      recipientId,
      ...filter,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Notification.countDocuments({
      recipientId,
      ...filter,
    }),
  ]);

  return {
    notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const findNotificationById = async ({
  notificationId,
  recipientId,
}) => {
  return Notification.findOne({
    _id: notificationId,
    recipientId,
  });
};

const markAsRead = async ({
  notificationId,
  recipientId,
}) => {
  return Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipientId,
    },
    {
      isRead: true,
      readAt: new Date(),
    },
    {
      new: true,
    }
  );
};

const markAllAsRead = async (recipientId) => {
  return Notification.updateMany(
    {
      recipientId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );
};

const updateFcmStatus = async ({
  notificationId,
  fcmSent,
  fcmFailureReason = null,
}) => {
  return Notification.findByIdAndUpdate(
    notificationId,
    {
      fcmSent,
      fcmFailureReason,
      sentAt: new Date(),
    },
    {
      new: true,
    }
  );
};

export {
  createNotification,
  findNotificationsByRecipient,
  findNotificationById,
  markAsRead,
  markAllAsRead,
  updateFcmStatus,
};