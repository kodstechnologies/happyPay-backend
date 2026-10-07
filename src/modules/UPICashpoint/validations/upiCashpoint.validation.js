import Joi from "joi";

const initiateUpiCashpointSchema = Joi.object({
  amount: Joi.alternatives()
    .try(
      Joi.number().positive(),
      Joi.string().trim().pattern(/^\d+(\.\d{1,2})?$/)
    )
    .required()
    .messages({
      "any.required": "Cash amount is required",
      "number.positive": "Cash amount must be greater than zero",
      "string.pattern.base": "Please enter a valid monetary amount",
    }),

  outlet_id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  mobile: Joi.string().trim().pattern(/^[6-9]\d{9}$/).optional(),
  client_ref_id: Joi.string().trim().optional(),
}).unknown(true);

export { initiateUpiCashpointSchema };
