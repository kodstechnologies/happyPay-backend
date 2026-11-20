import mongoose from "mongoose";
import "./serviceConfig.model.js";


const pricingSlabSchema = new mongoose.Schema(
  {
    minAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    maxAmount: {
      type: Number,
      default: null,
      min: 0,
    },

    // Optional fixed amount for this slab
    chargeAmount: {
      type: Number,
      min: 0,
    },

    // Optional distribution amounts
    adminAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    distributorAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    retailerAmount: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["COMMISSION", "CHARGE"],
      required: true,
    },

    calculationType: {
      type: String,
      enum: ["FIXED", "PERCENTAGE"],
      required: true,
    },

    slabs: {
      type: [pricingSlabSchema],
      default: [],
    },
  },
  { _id: true }
);

const planCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
    },
    pricing: {
      type: [pricingSchema],
      default: [],
    },
  },
  { _id: true }
);

const planServiceSchema = new mongoose.Schema(
  {
    serviceId: {
      type: String,
      required: true,
    },
    categories: {
      type: [planCategorySchema],
      default: [],
    },
    pricing: {
      type: [pricingSchema],
      default: [],
    },
  },
  { _id: true }
);

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    validityPeriod: {
      type: Number,
      required: true,
      min: 1,
    },

    validityUnit: {
      type: String,
      enum: ["DAYS", "MONTHS", "YEARS"],
      default: "MONTHS",
      required: true,
    },

    subscriptionAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    services: {
      type: [planServiceSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "INACTIVE",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────

// Most common query: findOnePlan({ isDefault: true, status: "ACTIVE" })
// — used by subscribeToDefaultPlan and auto-assignment flows.
planSchema.index({ isDefault: 1, status: 1 });

// Paginated listing: getPlans({ status }) sorted by createdAt desc
planSchema.index({ status: 1, createdAt: -1 });

// Name lookups (exact match + prefix-anchored regex search)
planSchema.index({ name: 1 });

// Nested serviceId lookup — supports future aggregation queries that
// filter plans by contained service without loading the full document.
planSchema.index({ "services.serviceId": 1 });

export default mongoose.model("Plan", planSchema);
