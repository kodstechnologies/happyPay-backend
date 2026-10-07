import Joi from "joi";
import mongoose from "mongoose";

const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

const getRetailerKycParamsSchema = Joi.object({
  retailerId: Joi.string()
    .trim()
    .custom(objectIdValidator, "MongoDB ObjectId validation")
    .required()
    .messages({
      "any.required": "Retailer ID is required",
      "string.empty": "Retailer ID is required",
      "any.invalid": "Invalid Retailer ID format",
    }),
});

const doEkycSchema = Joi.object({
  outlet_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Outlet ID (outlet_id) is required",
      "string.empty": "Outlet ID (outlet_id) is required",
    }),

  referenceKey: Joi.string().trim().optional().allow(""),

  latitude: Joi.alternatives()
    .try(Joi.number().min(-90).max(90), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Latitude is required",
    }),

  longitude: Joi.alternatives()
    .try(Joi.number().min(-180).max(180), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Longitude is required",
    }),

  Piddata: Joi.string().trim().optional().allow(""),
  PidDatatype: Joi.string().trim().optional().allow(""),
  ci: Joi.string().trim().optional().allow(""),
  dc: Joi.string().trim().optional().allow(""),
  dpId: Joi.string().trim().optional().allow(""),
  errCode: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  errInfo: Joi.string().trim().optional().allow(""),
  fCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  fType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  hmac: Joi.string().trim().optional().allow(""),
  iCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  iType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  mc: Joi.string().trim().optional().allow(""),
  mi: Joi.string().trim().optional().allow(""),
  nmPoints: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  pCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  pType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  qScore: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  rdsId: Joi.string().trim().optional().allow(""),
  rdsVer: Joi.string().trim().optional().allow(""),
  sessionKey: Joi.string().trim().optional().allow(""),
  srno: Joi.string().trim().optional().allow(""),
  sysid: Joi.string().trim().optional().allow(""),
}).unknown(true);

export { getRetailerKycParamsSchema, doEkycSchema };
