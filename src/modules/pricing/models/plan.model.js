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
    value: {
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
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
  
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceConfig",
      required: true,
    },
    categories: {
      type: [planCategorySchema],
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

    effectiveFrom: {
      type: Date,
      default: null,
    },

    effectiveTo: {
      type: Date,
      default: null,
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