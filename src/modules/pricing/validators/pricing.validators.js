import Joi from "joi";
import mongoose from "mongoose";
import ApiError from "../../../utils/ApiError.js";

// Middleware to parse JSON string fields from form-data
export const parseFormDataFields = (req, res, next) => {
  const jsonFields = ['services'];

  jsonFields.forEach(field => {
    if (req.body[field] && typeof req.body[field] === 'string') {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Invalid JSON format for field: ${field}`,
          errors: [`${field} must be a valid JSON string`],
        });
      }
    }
  });

  next();
};

const objectId = (label) =>
  Joi.string()
    .trim()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("objectId.invalid", { label });
      }
      return value;
    })
    .messages({
      "any.required": `${label} is required`,
      "string.empty": `${label} is required`,
      "objectId.invalid": `Invalid ${label}`,
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
  value: Joi.number()
    .min(0)
    .optional()
    .messages({
      "number.min": "Value must be greater than or equal to 0",
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
  slabs: Joi.array()
    .items(pricingSlabSchema)
    .default([])
    .optional(),
});

const planCategorySchema = Joi.object({
  categoryId: objectId("Category ID"),
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
  services: Joi.array()
    .items(planServiceSchema)
    .default([])
    .optional(),
  status: Joi.string()
    .valid("ACTIVE", "INACTIVE")
    .default("INACTIVE")
    .optional()
    .messages({
      "any.only": "Status must be either ACTIVE or INACTIVE",
    }),
  effectiveFrom: Joi.date()
    .optional()
    .allow(null)
    .messages({
      "date.base": "Effective from must be a valid date",
    }),
  effectiveTo: Joi.date()
    .optional()
    .allow(null)
    .messages({
      "date.base": "Effective to must be a valid date",
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
  services: Joi.array()
    .items(planServiceSchema)
    .optional(),
  status: Joi.string()
    .valid("ACTIVE", "INACTIVE")
    .optional()
    .messages({
      "any.only": "Status must be either ACTIVE or INACTIVE",
    }),
  effectiveFrom: Joi.date()
    .optional()
    .allow(null)
    .messages({
      "date.base": "Effective from must be a valid date",
    }),
  effectiveTo: Joi.date()
    .optional()
    .allow(null)
    .messages({
      "date.base": "Effective to must be a valid date",
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
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
            typeof slab.value !== "number" ||
            !Number.isFinite(slab.value) ||
            slab.value < 0
          ) {
            throw ApiError.badRequest(
              `${path}: value must be a non-negative number`
            );
          }
        }
      }
    };

    for (const service of services) {
      if (
        !service.serviceId ||
        !mongoose.Types.ObjectId.isValid(service.serviceId)
      ) {
        throw ApiError.badRequest("Invalid serviceId");
      }

      if (serviceIds.has(service.serviceId.toString())) {
        throw ApiError.badRequest(
          "Duplicate serviceId in the request"
        );
      }

      serviceIds.add(service.serviceId.toString());

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

        const categoryIds = new Set();

        for (const category of service.categories) {
          if (
            !category.categoryId ||
            !mongoose.Types.ObjectId.isValid(category.categoryId)
          ) {
            throw ApiError.badRequest("Invalid categoryId");
          }

          if (categoryIds.has(category.categoryId.toString())) {
            throw ApiError.badRequest(
              "Duplicate categoryId within a service"
            );
          }

          categoryIds.add(category.categoryId.toString());

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