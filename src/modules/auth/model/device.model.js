import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },

    fcmToken: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },

    platform: {
      type: String,
      enum: ["android", "ios", "web"],
      required: true,
    },

    deviceName: {
      type: String,
      trim: true,
    },

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

export default deviceSchema;