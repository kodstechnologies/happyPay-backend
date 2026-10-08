import mongoose from "mongoose";
import deviceSchema from "./device.model.js";
import refreshTokenSchema from "./token.model.js";

const userSchema = new mongoose.Schema(
  {
    // =========================
    // Account Details
    // =========================
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    panDocument: {
      type: String,
      trim: true,
    },

    mobile: {
      type: String,
      trim: true,
    },

    isMobileVerified: {
      type: Boolean,
      default: false,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // =========================
    // Shop Details
    // =========================
    shop: {
      name: {
        type: String,
        trim: true,
      },

      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },

      propertyType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PropertyType",
      },

      address: {
        addressLine: {
          type: String,
          trim: true,
        },

        city: {
          type: String,
          trim: true,
        },

        state: {
          type: String,
          trim: true,
        },

        pincode: {
          type: String,
          trim: true,
        },
      },

      completeAddress: {
        type: String,
        trim: true,
      },

      location: {
        latitude: {
          type: Number,
        },

        longitude: {
          type: Number,
        },
      },
    },

    // =========================
    // Retailer Details
    // =========================
    fullName: {
      type: String,
      trim: true,
    },

    fatherName: {
      type: String,
      trim: true,
    },

    gender: {
      type: String,
      trim: true,
    },

    maritalStatus: {
      type: String,
      trim: true,
    },

    educationalQualification: {
      type: String,
      trim: true,
    },

    selfie: {
      type: String,
      trim: true,
    },

    // =========================
    // Aadhaar Details
    // =========================
    aadhaarNumber: {
      type: String,
      trim: true,
    },

    aadhaarDocument: {
      type: String,
      trim: true,
    },

    aadhaarMobileLinked: {
      type: Boolean,
    },

    aadhaarVerificationMethod: {
      type: String,
      enum: ["otp", "biometric", "offline_xml"],
    },

    aadhaarConsent: {
      type: Boolean,
      default: false,
    },

    aadhaarVerified: {
      type: Boolean,
      default: false,
    },

    dateOfBirth: {
      type: Date,
    },

    // =========================
    // Shop Photos
    // =========================
    shopInsidePhoto: {
      type: String,
      trim: true,
    },

    shopOutsidePhoto: {
      type: String,
      trim: true,
    },

    shopLocationPhoto: {
      type: String,
      trim: true,
    },

    // =========================
    // Business Proof
    // =========================
    businessProofType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProofType",
    },

    businessProofDocument: {
      type: String,
      trim: true,
    },

    // =========================
    // Bank Details
    // =========================
    bank: {
      name: {
        type: String,
        trim: true,
      },

      ifscCode: {
        type: String,
        trim: true,
        uppercase: true,
      },

      accountNumber: {
        type: String,
        trim: true,
      },

      confirmAccountNumber: {
        type: String,
        trim: true,
      },

      branchName: {
        type: String,
        trim: true,
      },
    },

    // =========================
    // KYC
    // =========================
    kycStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    kycRejectionReason: {
      type: String,
      trim: true,
    },

    // =========================
    // Merchant Onboarding
    // =========================
    outletId: {
      type: String,
      trim: true,
    },

    adminApproved: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    reasonOfRejection: {
      type: String,
      trim: true,
      default: null,
    },

    // =========================
    // RBAC
    // =========================
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],

    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],

    // =========================
    // Authentication
    // =========================
    refreshTokens: [refreshTokenSchema],

    devices: [deviceSchema],

    // =========================
    // Account Status
    // =========================
    status: {
      type: String,
      enum: [
     
        "active",
   
        "suspended",
        "blocked",
      ],
      default: "active",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;