import Joi from "joi";

const getBillersByCategoryIdSchema = Joi.object({
  cat_id: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .required()
    .messages({
      "any.required": "Category ID (cat_id) is required",
      "string.empty": "Category ID (cat_id) cannot be empty",
    }),
}).unknown(true);

const getBillersByCategoryNameSchema = Joi.object({
  catname: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      "any.required": "Category Name (catname) is required",
      "string.empty": "Category Name (catname) cannot be empty",
    }),
}).unknown(true);

const fetchBillSchema = Joi.object({
  CUSTNO: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .messages({
      "any.required": "Consumer Number / Policy Number (CUSTNO) is required",
      "string.empty": "Consumer Number / Policy Number (CUSTNO) cannot be empty",
    }),
  canumber: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .optional(),
  consumer_number: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .optional(),

  opcode: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      "any.required": "Operator code (opcode) is required",
      "string.empty": "Operator code (opcode) cannot be empty",
    }),

  service_id: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .required()
    .messages({
      "any.required": "Service ID (service_id) is required",
      "string.empty": "Service ID (service_id) cannot be empty",
    }),

  orderid: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .required()
    .messages({
      "any.required": "Order ID (orderid) is required",
      "string.empty": "Order ID (orderid) cannot be empty",
    }),

  REFMOBILENO: Joi.alternatives()
    .try(
      Joi.string().trim().pattern(/^[6-9]\d{9}$/),
      Joi.string().trim().min(10).max(10),
      Joi.number()
    )
    .required()
    .messages({
      "any.required": "Customer Mobile Number (REFMOBILENO) is required",
      "string.empty": "Customer Mobile Number (REFMOBILENO) cannot be empty",
      "string.pattern.base": "Customer Mobile Number (REFMOBILENO) must be a valid 10-digit mobile number",
    }),

  AMT: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Bill Amount (AMT) is required",
      "string.empty": "Bill Amount (AMT) cannot be empty",
    }),

  amount: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  biller_id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),

  FIELD1: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .optional()
    .messages({
      "string.empty": "Secondary Field (FIELD1 / DOB) cannot be empty",
    }),

  FIELD2: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .optional()
    .messages({
      "string.empty": "Email ID (FIELD2) cannot be empty",
    }),
  email: Joi.string().trim().email().optional().messages({
    "string.email": "Email ID must be a valid email address",
    "string.empty": "Email ID cannot be empty",
  }),
  email_id: Joi.string().trim().optional(),
})
  .or("CUSTNO", "canumber", "consumer_number")
  .unknown(true)
  .messages({
    "object.missing": "Consumer Number / Policy Number (CUSTNO) is required",
  });

const payBillSchema = Joi.object({
  CUSTNO: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .messages({
      "any.required": "Consumer Number / Policy Number (CUSTNO) is required",
      "string.empty": "Consumer Number / Policy Number (CUSTNO) cannot be empty",
    }),
  canumber: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .optional(),
  consumer_number: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .optional(),

  opcode: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      "any.required": "Operator code (opcode) is required",
      "string.empty": "Operator code (opcode) cannot be empty",
    }),

  service_id: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .required()
    .messages({
      "any.required": "Service ID (service_id) is required",
      "string.empty": "Service ID (service_id) cannot be empty",
    }),

  orderid: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .required()
    .messages({
      "any.required": "Order ID (orderid) is required",
      "string.empty": "Order ID (orderid) cannot be empty",
    }),

  REFMOBILENO: Joi.alternatives()
    .try(
      Joi.string().trim().pattern(/^[6-9]\d{9}$/),
      Joi.string().trim().min(10).max(10),
      Joi.number()
    )
    .required()
    .messages({
      "any.required": "Customer Mobile Number (REFMOBILENO) is required",
      "string.empty": "Customer Mobile Number (REFMOBILENO) cannot be empty",
      "string.pattern.base": "Customer Mobile Number (REFMOBILENO) must be a valid 10-digit mobile number",
    }),

  amount: Joi.alternatives()
    .try(Joi.number().positive(), Joi.string().trim().min(1))
    .required()
    .messages({
      "any.required": "Payment Amount (amount) is required",
      "number.base": "Payment Amount must be a valid number",
      "number.positive": "Payment Amount must be greater than zero",
      "string.empty": "Payment Amount cannot be empty",
    }),

  AMT: Joi.alternatives()
    .try(Joi.number().positive(), Joi.string().trim().min(1))
    .optional()
    .messages({
      "string.empty": "Bill Amount (AMT) cannot be empty",
    }),

  billnumber: Joi.alternatives().try(Joi.string().trim().allow(""), Joi.number()).optional(),
  billdate: Joi.string().trim().allow("").optional(),
  duedate: Joi.string().trim().allow("").optional(),
  referenceid: Joi.alternatives().try(Joi.string().trim().allow(""), Joi.number()).optional(),
  latitude: Joi.string().trim().allow("").optional(),
  longitude: Joi.string().trim().allow("").optional(),

  FIELD1: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .optional()
    .messages({
      "string.empty": "Secondary Field (FIELD1 / DOB) cannot be empty",
    }),

  FIELD2: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .optional()
    .messages({
      "string.empty": "Email ID (FIELD2) cannot be empty",
    }),
  email: Joi.string().trim().email().optional().messages({
    "string.email": "Email ID must be a valid email address",
    "string.empty": "Email ID cannot be empty",
  }),
  email_id: Joi.string().trim().optional(),
})
  .or("CUSTNO", "canumber", "consumer_number")
  .unknown(true)
  .messages({
    "object.missing": "Consumer Number / Policy Number (CUSTNO) is required",
  });

export {
  getBillersByCategoryIdSchema,
  getBillersByCategoryNameSchema,
  fetchBillSchema,
  payBillSchema,
};
