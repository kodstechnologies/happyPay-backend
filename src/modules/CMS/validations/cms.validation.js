import Joi from "joi";

const initiateCmsPaymentSchema = Joi.object({
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
}).unknown(true);

export { initiateCmsPaymentSchema };
