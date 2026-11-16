import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    userName: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      required: true,
      trim: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Admin Login",
        "Admin Logout",
        "Admin Registered",
        "KYC Approved",
        "KYC Rejected",
        "Retailer Suspended",
        "Retailer Activated",
        "Retailer Blocked",
        "Retailer Unblocked",
        "Limit Changed",
        "Commission Changed",
        "Bank Approved",
        "Bank Rejected",
        "Converted to Distributor",
        "Notification Sent",
        "Banner Created",
        "Banner Updated",
        "Banner Deleted",
        "Other",
      ],
    },

    entity: {
      type: String,
      required: true,
      trim: true,
    },

    entityId: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    ipAddress: {
      type: String,
      trim: true,
    },

    userAgent: {
      type: String,
      trim: true,
    },

    createdBy: {
      name: {
        type: String,
        trim: true,
      },
      role: {
        type: String,
        trim: true,
      },
    },

    updatedBy: {
      name: {
        type: String,
        trim: true,
      },
      role: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
