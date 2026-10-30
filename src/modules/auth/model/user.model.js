import mongoose from "mongoose";
import bcrypt from "bcrypt";
import deviceSchema from "./device.model.js";
import refreshTokenSchema from "./token.model.js";
import Role from "./role.model.js";

const documentReviewSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "NOT_SUBMITTED",
        "PENDING",
        "APPROVED",
        "REJECTED",
      ],
      default: "NOT_SUBMITTED",
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // =========================
    // Account Details
    // =========================
    registrationStatus: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      default: "NOT_STARTED",
    },

    currentRegistrationStep: {
      type: String,
      enum: [
        "ACCOUNT",
        "SHOP_DETAILS",
        "ABOUT",
        "AADHAAR_DETAILS",
        "BANK_DETAILS",
        "SUBMITTED",
      ],
      default: "ACCOUNT",
    },

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
      unique: true,
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
    ditributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    distributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // =========================
    // Bank Details (Array for multiple banks)
    // =========================
    banks: [
      {
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
<<<<<<< Updated upstream

        bank_code:{
          type:String,
          trim:true
=======
        bank_id: {
          type: String,
          trim: true
        },
        bank_code: {
          type: String,
          trim: true
>>>>>>> Stashed changes
        },
        branchName: {
          type: String,
          trim: true,
        },

        isPrimary: {
          type: Boolean,
          default: false,
        },

        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    AepsEkyc: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AepsEkyc",
      default: null,
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
    // Document Reviews
    // =========================
    documentReviews: {
      panDocument: {
        type: documentReviewSchema,
        default: () => ({}),
      },

      aadhaarDocument: {
        type: documentReviewSchema,
        default: () => ({}),
      },

      selfie: {
        type: documentReviewSchema,
        default: () => ({}),
      },

      shopInsidePhoto: {
        type: documentReviewSchema,
        default: () => ({}),
      },

      shopOutsidePhoto: {
        type: documentReviewSchema,
        default: () => ({}),
      },

      shopLocationPhoto: {
        type: documentReviewSchema,
        default: () => ({}),
      },

      businessProofDocument: {
        type: documentReviewSchema,
        default: () => ({}),
      },
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
        "pending",
        "approved",
        "rejected",
        "suspended",
        "blocked",
      ],
      default: "active",
    },
    MPIN: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },


  },


  {
    timestamps: true,
  }
);


userSchema.methods.assignRole = async function (roleSlug, roleName = null) {
  if (!roleSlug) return null;

  const RoleModel = mongoose.models.Role || Role;
  const slug = String(roleSlug).toLowerCase().trim();
  const name =
    roleName || slug.charAt(0).toUpperCase() + slug.slice(1);

  let role = await RoleModel.findOne({ slug });
  if (!role) {
    role = await RoleModel.create({
      name,
      slug,
      isActive: true,
    });
  }

  if (!Array.isArray(this.roles)) {
    this.roles = [];
  }

  const roleIdStr = role._id.toString();
  const alreadyHasRole = this.roles.some((existing) => {
    if (!existing) return false;
    const existingId = existing._id ? existing._id.toString() : existing.toString();
    return existingId === roleIdStr;
  });

  if (!alreadyHasRole) {
    this.roles.push(role._id);
  }

  return role;
};


userSchema.methods.hasRole = function (roleSlug) {
  if (!roleSlug || !Array.isArray(this.roles)) return false;
  const target = String(roleSlug).toLowerCase().trim();
  return this.roles.some((r) => {
    if (!r) return false;
    if (typeof r === "string") return r.toLowerCase() === target;
    if (r.slug) return r.slug.toLowerCase() === target;
    return false;
  });
};

userSchema.methods.compareMpin = async function (candidateMpin) {
  if (!this.MPIN) return false;
  const cleanMpin = String(candidateMpin).trim();
  const isBcrypt =
    this.MPIN.startsWith("$2a$") ||
    this.MPIN.startsWith("$2b$") ||
    this.MPIN.startsWith("$2y$");
  return isBcrypt
    ? await bcrypt.compare(cleanMpin, this.MPIN)
    : String(this.MPIN).trim() === cleanMpin;
};

const User = mongoose.model("User", userSchema);

export default User;