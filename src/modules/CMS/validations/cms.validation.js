import Joi from "joi";

const initiateCmsPaymentSchema = Joi.object({
  latitude: Joi.alternatives()
    .try(
      Joi.number().min(-90).max(90),
      Joi.string().trim().min(1)
    )
    .required()
    .messages({
      "any.required": "Latitude is required",
      "string.empty": "Latitude cannot be empty",
    }),

  longitude: Joi.alternatives()
    .try(
      Joi.number().min(-180).max(180),
      Joi.string().trim().min(1)
    )
    .required()
    .messages({
      "any.required": "Longitude is required",
      "string.empty": "Longitude cannot be empty",
    }),

  amount: Joi.alternatives()
    .try(
      Joi.number().positive(),
      Joi.string().trim().pattern(/^\d+(\.\d{1,2})?$/)
    )
    .required()
    .messages({
      "any.required": "CMS payment amount is required",
      "number.positive": "CMS payment amount must be greater than zero",
      "string.pattern.base": "Please enter a valid monetary amount",
    }),

  agency_id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  biller_id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  consumer_id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  mobile: Joi.string().trim().pattern(/^[6-9]\d{9}$/).optional(),
  txnid: Joi.string().trim().optional(),
}).unknown(true);

export { initiateCmsPaymentSchema };
