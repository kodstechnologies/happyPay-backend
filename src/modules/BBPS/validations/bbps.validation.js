import Joi from "joi";

const getBillersByCategoryIdSchema = Joi.object({
  cat_id: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .required()
    .messages({
      "any.required": "Category ID (cat_id) is required",
      "string.empty": "Category ID (cat_id) is required",
    }),
}).unknown(true);

const getBillersByCategoryNameSchema = Joi.object({
  category: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      "any.required": "Category name is required",
      "string.empty": "Category name is required",
    }),
}).unknown(true);

const fetchBillSchema = Joi.object({
  biller_id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  consumer_number: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
}).min(1).unknown(true).messages({
  "object.min": "At least one bill parameter is required to fetch bill details",
});

const payBillSchema = Joi.object({
  amount: Joi.alternatives()
    .try(Joi.number().positive(), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Bill payment amount is required",
      "number.positive": "Bill payment amount must be greater than zero",
    }),
}).unknown(true);

export {
  getBillersByCategoryIdSchema,
  getBillersByCategoryNameSchema,
  fetchBillSchema,
  payBillSchema,
};
