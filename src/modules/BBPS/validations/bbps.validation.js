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
  canumber: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  CUSTNO: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  REFMOBILENO: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  AMT: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  orderid: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  opcode: Joi.string().trim().optional(),
  service_id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
}).min(1).unknown(true).messages({
  "object.min": "At least one bill parameter is required to fetch bill details",
});

const payBillSchema = Joi.object({
  amount: Joi.alternatives()
    .try(Joi.number().positive(), Joi.string().trim())
    .optional(),
  AMT: Joi.alternatives()
    .try(Joi.number().positive(), Joi.string().trim())
    .optional(),
  CUSTNO: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  REFMOBILENO: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  orderid: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  opcode: Joi.string().trim().optional(),
  service_id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
}).min(1).unknown(true).messages({
  "object.min": "At least one parameter is required for bill payment",
});

export {
  getBillersByCategoryIdSchema,
  getBillersByCategoryNameSchema,
  fetchBillSchema,
  payBillSchema,
};
