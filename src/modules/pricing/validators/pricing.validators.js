import Joi from "joi";
import ApiError from "../../../utils/ApiError.js";

// Middleware to parse JSON string fields from form-data
export const parseFormDataFields = (req, res, next) => {
  // Parse validity period fields
  if (req.body.validityPeriod && typeof req.body.validityPeriod === 'string') {
    req.body.validityPeriod = parseInt(req.body.validityPeriod, 10);
  }

  next();
};

const objectId = (label) =>
  Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": `${label} is required`,
      "string.empty": `${label} is required`,
    });

const pricingSlabSchema = Joi.object({
  minAmount: Joi.number()
    .min(0)
    .required()
    .messages({
      "any.required": "Minimum amount is required",
      "number.min": "Minimum amount must be greater than or equal to 0",
    }),
  maxAmount: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      "number.min": "Maximum amount must be greater than or equal to 0",
    }),
  chargeAmount: Joi.number()
    .min(0)
    .optional()
    .messages({
      "number.min": "Charge amount must be greater than or equal to 0",
    }),
  adminAmount: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      "number.min": "Admin amount must be greater than or equal to 0",
    }),
  distributorAmount: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      "number.min": "Distributor amount must be greater than or equal to 0",
    }),
  retailerAmount: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      "number.min": "Retailer amount must be greater than or equal to 0",
    }),
});

const pricingSchema = Joi.object({
  type: Joi.string()
    .valid("COMMISSION", "CHARGE")
    .required()
    .messages({
      "any.required": "Pricing type is required",
      "string.empty": "Pricing type is required",
      "any.only": "Pricing type must be either COMMISSION or CHARGE",
    }),
  calculationType: Joi.string()
    .valid("FIXED", "PERCENTAGE")
    .required()
    .messages({
      "any.required": "Calculation type is required",
      "string.empty": "Calculation type is required",
      "any.only": "Calculation type must be either FIXED or PERCENTAGE",
    }),
  slabs: Joi.array()
    .items(pricingSlabSchema)
    .default([])
    .optional(),
});

const planCategorySchema = Joi.object({
  categoryName: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Category name is required",
      "string.empty": "Category name is required",
    }),
  pricing: Joi.array()
    .items(pricingSchema)
    .default([])
    .optional(),
});

const planServiceSchema = Joi.object({
  serviceId: objectId("Service ID"),
  categories: Joi.array()
    .items(planCategorySchema)
    .default([])
    .optional(),
  pricing: Joi.array()
    .items(pricingSchema)
    .default([])
    .optional(),
});

export const createPlanSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      "any.required": "Plan name is required",
      "string.empty": "Plan name is required",
      "string.min": "Plan name must be at least 1 character",
      "string.max": "Plan name must not exceed 100 characters",
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("")
    .messages({
      "string.max": "Description must not exceed 500 characters",
    }),
  image: Joi.string()
    .trim()
    .uri()
    .optional()
    .allow("")
    .messages({
      "string.uri": "Image must be a valid URL",
    }),
  validityPeriod: Joi.number()
    .min(1)
    .required()
    .messages({
      "number.min": "Validity period must be at least 1",
      "any.required": "Validity period is required",
    }),
  validityUnit: Joi.string()
    .valid("DAYS", "MONTHS", "YEARS")
    .default("MONTHS")
    .required()
    .messages({
      "any.required": "Validity unit is required",
      "any.only": "Validity unit must be DAYS, MONTHS, or YEARS",
    }),
  status: Joi.string()
    .valid("ACTIVE", "INACTIVE")
    .default("INACTIVE")
    .optional()
    .messages({
      "any.only": "Status must be either ACTIVE or INACTIVE",
    }),
});

export const updatePlanSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      "string.min": "Plan name must be at least 1 character",
      "string.max": "Plan name must not exceed 100 characters",
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("")
    .messages({
      "string.max": "Description must not exceed 500 characters",
    }),
  image: Joi.string()
    .trim()
    .uri()
    .optional()
    .allow("")
    .messages({
      "string.uri": "Image must be a valid URL",
    }),
  validityPeriod: Joi.number()
    .min(1)
    .optional()
    .messages({
      "number.min": "Validity period must be at least 1",
    }),
  validityUnit: Joi.string()
    .valid("DAYS", "MONTHS", "YEARS")
    .optional()
    .messages({
      "any.only": "Validity unit must be DAYS, MONTHS, or YEARS",
    }),
  status: Joi.string()
    .valid("ACTIVE", "INACTIVE")
    .optional()
    .messages({
      "any.only": "Status must be either ACTIVE or INACTIVE",
    }),
}).min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

export const validateCreatePlan = (req, res, next) => {
  const { error, value } = createPlanSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map((item) => item.message),
    });
  }

  req.body = value;
  next();
};

export const validateUpdatePlan = (req, res, next) => {
  const { error, value } = updatePlanSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map((item) => item.message),
    });
  }

  req.body = value;
  next();
};


export const validateConfigurePlanServices = (req, res, next) => {
  try {
    const { id } = req.params;
    const { services } = req.body;

    if (!id) {
      throw ApiError.badRequest("Invalid plan ID");
    }

    if (!Array.isArray(services) || services.length === 0) {
      throw ApiError.badRequest(
        "Services must be a non-empty array"
      );
    }

    const serviceIds = new Set();

    const validatePricing = (pricing, path) => {
      if (!Array.isArray(pricing)) {
        throw ApiError.badRequest(`${path} must be an array`);
      }

      for (const item of pricing) {
        if (!["COMMISSION", "CHARGE"].includes(item.type)) {
          throw ApiError.badRequest(
            `${path}: type must be COMMISSION or CHARGE`
          );
        }

        if (!["FIXED", "PERCENTAGE"].includes(item.calculationType)) {
          throw ApiError.badRequest(
            `${path}: calculationType must be FIXED or PERCENTAGE`
          );
        }

        if (!Array.isArray(item.slabs)) {
          throw ApiError.badRequest(
            `${path}: slabs must be an array`
          );
        }

        for (const slab of item.slabs) {
          if (
            typeof slab.minAmount !== "number" ||
            !Number.isFinite(slab.minAmount) ||
            slab.minAmount < 0
          ) {
            throw ApiError.badRequest(
              `${path}: minAmount must be a non-negative number`
            );
          }

          if (
            slab.maxAmount !== undefined &&
            slab.maxAmount !== null &&
            (
              typeof slab.maxAmount !== "number" ||
              !Number.isFinite(slab.maxAmount) ||
              slab.maxAmount < slab.minAmount
            )
          ) {
            throw ApiError.badRequest(
              `${path}: maxAmount must be null or at least minAmount`
            );
          }

          if (
            slab.chargeAmount !== undefined &&
            (
              typeof slab.chargeAmount !== "number" ||
              !Number.isFinite(slab.chargeAmount) ||
              slab.chargeAmount < 0
            )
          ) {
            throw ApiError.badRequest(
              `${path}: chargeAmount must be a non-negative number`
            );
          }

          if (
            slab.adminAmount !== undefined &&
            slab.adminAmount !== null &&
            (
              typeof slab.adminAmount !== "number" ||
              !Number.isFinite(slab.adminAmount) ||
              slab.adminAmount < 0
            )
          ) {
            throw ApiError.badRequest(
              `${path}: adminAmount must be null or a non-negative number`
            );
          }

          if (
            slab.distributorAmount !== undefined &&
            slab.distributorAmount !== null &&
            (
              typeof slab.distributorAmount !== "number" ||
              !Number.isFinite(slab.distributorAmount) ||
              slab.distributorAmount < 0
            )
          ) {
            throw ApiError.badRequest(
              `${path}: distributorAmount must be null or a non-negative number`
            );
          }

          if (
            slab.retailerAmount !== undefined &&
            slab.retailerAmount !== null &&
            (
              typeof slab.retailerAmount !== "number" ||
              !Number.isFinite(slab.retailerAmount) ||
              slab.retailerAmount < 0
            )
          ) {
            throw ApiError.badRequest(
              `${path}: retailerAmount must be null or a non-negative number`
            );
          }
        }
      }
    };

    for (const service of services) {
      if (!service.serviceId) {
        throw ApiError.badRequest("Invalid serviceId");
      }

      if (serviceIds.has(service.serviceId)) {
        throw ApiError.badRequest(
          "Duplicate serviceId in the request"
        );
      }

      serviceIds.add(service.serviceId);

      // Service-level pricing is optional.
      if (service.pricing !== undefined) {
        validatePricing(
          service.pricing,
          "Service pricing"
        );
      }

      // Categories are optional.
      if (service.categories !== undefined) {
        if (!Array.isArray(service.categories)) {
          throw ApiError.badRequest(
            "Categories must be an array"
          );
        }

        const categoryNames = new Set();

        for (const category of service.categories) {
          if (!category.categoryName) {
            throw ApiError.badRequest("Invalid categoryName");
          }

          if (categoryNames.has(category.categoryName)) {
            throw ApiError.badRequest(
              "Duplicate categoryName within a service"
            );
          }

          categoryNames.add(category.categoryName);

          if (category.pricing !== undefined) {
            validatePricing(
              category.pricing,
              "Category pricing"
            );
          }
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};