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

    services: {
      type: [planServiceSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "INACTIVE",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Plan", planSchema);