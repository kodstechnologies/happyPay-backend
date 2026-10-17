import Joi from "joi";

const initiateUpiCashpointSchema = Joi.object({
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

  merchantLoginId: Joi.alternatives()
    .try(
      Joi.string().trim().min(1),
      Joi.number()
    )
    .optional()
    .allow("", null),

  amount: Joi.alternatives()
    .try(
      Joi.number().positive(),
      Joi.string().trim().pattern(/^\d+(\.\d{1,2})?$/)
    )
    .required()
    .messages({
      "any.required": "Amount is required",
      "number.positive": "Amount must be greater than zero",
      "string.pattern.base": "Please enter a valid monetary amount",
    }),

}).unknown(true);

export { initiateUpiCashpointSchema };

