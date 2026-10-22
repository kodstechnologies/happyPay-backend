import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    recipientType: {
      type: String,
      enum: ["retailer", "admin"],
      required: true,
      default: "retailer",
    },

    type: {
      type: String,
      enum: [
        "TRANSACTION_SUCCESS",
        "TRANSACTION_FAILED",

        "WALLET_CREDIT",
        "WALLET_DEBIT",

        "COMMISSION_CREDIT",

        "KYC_APPROVED",
        "KYC_REJECTED",

        "CMS_PICKUP",
        "SETTLEMENT",

        "ANNOUNCEMENT",
        "SERVICE_ALERT",
        "MAINTENANCE",

        "REGISTRATION_SUCCESS",
        "NEW_RETAILER_REGISTRATION",
      ],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    fcmSent: {
      type: Boolean,
      default: false,
    },

    fcmFailureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

export default Notification;