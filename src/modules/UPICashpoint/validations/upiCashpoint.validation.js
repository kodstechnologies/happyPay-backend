import Joi from "joi";
import mongoose from "mongoose";

const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

const latitudeRule = Joi.alternatives()
  .try(
    Joi.number().min(-90).max(90),
    Joi.string().trim().min(1)
  )
  .required()
  .messages({
    "any.required": "Latitude is required",
    "string.empty": "Latitude cannot be empty",
  });

const longitudeRule = Joi.alternatives()
  .try(
    Joi.number().min(-180).max(180),
    Joi.string().trim().min(1)
  )
  .required()
  .messages({
    "any.required": "Longitude is required",
    "string.empty": "Longitude cannot be empty",
  });

const merchantIdRule = Joi.alternatives()
  .try(
    Joi.string().trim().min(1),
    Joi.number()
  )
  .required()
  .messages({
    "any.required": "merchantId is required",
    "string.empty": "merchantId cannot be empty",
  });

const initiateUpiCashpointSchema = Joi.object({
  latitude: latitudeRule,
  longitude: longitudeRule,

  merchantLoginId: Joi.alternatives()
    .try(
      Joi.string().trim().min(1),
      Joi.number()
    )
    .required()
    .messages({
      "any.required": "merchantLoginId is required",
      "string.empty": "merchantLoginId cannot be empty",
    }),

  amount: Joi.alternatives()
    .try(
      Joi.number().positive(),
      Joi.string().trim().pattern(/^\d+(\.\d{1,2})?$/)
    )
    .required()
    .messages({
      "any.required": "Amount is required",
      "string.empty": "Amount cannot be empty",
      "number.positive": "Amount must be greater than zero",
      "string.pattern.base": "Please enter a valid monetary amount",
    }),
}).unknown(true);

const merchantRegistrationSendOtpSchema = Joi.object({
  merchantId: merchantIdRule,
});

const merchantRegistrationVerifySchema = Joi.object({
  merchantId: merchantIdRule,

  otp: Joi.alternatives()
    .try(
      Joi.string().trim().min(1),
      Joi.number()
    )
    .required()
    .messages({
      "any.required": "otp is required",
      "string.empty": "otp cannot be empty",
    }),
});

const sellerOnboardingSchema = Joi.object({
  osVersion: Joi.string().trim().required().messages({
    "any.required": "osVersion is required",
    "string.empty": "osVersion cannot be empty",
  }),
  osType: Joi.string().trim().required().messages({
    "any.required": "osType is required",
    "string.empty": "osType cannot be empty",
  }),
  appVersion: Joi.string().trim().required().messages({
    "any.required": "appVersion is required",
    "string.empty": "appVersion cannot be empty",
  }),
  deviceFingerprint: Joi.string().trim().required().messages({
    "any.required": "deviceFingerprint is required",
    "string.empty": "deviceFingerprint cannot be empty",
  }),
  ipaddress: Joi.string().trim().required().messages({
    "any.required": "ipaddress is required",
    "string.empty": "ipaddress cannot be empty",
  }),
  longitude: longitudeRule,
  latitude: latitudeRule,
  merchantId: merchantIdRule,
});

const merchantRegistrationSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .custom(objectIdValidator, "MongoDB ObjectId validation")
    .messages({
      "any.invalid": "Invalid User ID format",
      "string.empty": "User ID cannot be empty",
    }),

  userid: Joi.string()
    .trim()
    .custom(objectIdValidator, "MongoDB ObjectId validation")
    .messages({
      "any.invalid": "Invalid User ID format",
      "string.empty": "User ID cannot be empty",
    }),

  stateCode: Joi.string().trim().required().messages({
    "any.required": "stateCode is required",
    "string.empty": "stateCode cannot be empty",
  }),
  fathername: Joi.string().trim().required().messages({
    "any.required": "fathername is required",
    "string.empty": "fathername cannot be empty",
  }),
  mothername: Joi.string().trim().required().messages({
    "any.required": "mothername is required",
    "string.empty": "mothername cannot be empty",
  }),
  firstname: Joi.string().trim().required().messages({
    "any.required": "firstname is required",
    "string.empty": "firstname cannot be empty",
  }),
  lastname: Joi.string().trim().required().messages({
    "any.required": "lastname is required",
    "string.empty": "lastname cannot be empty",
  }),
  dob: Joi.string().trim().required().messages({
    "any.required": "dob is required",
    "string.empty": "dob cannot be empty",
  }),
  email: Joi.string().trim().email().required().messages({
    "any.required": "email is required",
    "string.empty": "email cannot be empty",
    "string.email": "Please provide a valid email address",
  }),
  phone: Joi.alternatives()
    .try(
      Joi.string().trim().min(10),
      Joi.number()
    )
    .required()
    .messages({
      "any.required": "phone is required",
      "string.empty": "phone cannot be empty",
    }),
  latitude: latitudeRule,
  longitude: longitudeRule,
  txnid: Joi.string().trim().required().messages({
    "any.required": "txnid is required",
    "string.empty": "txnid cannot be empty",
  }),
  merchantpincode: Joi.alternatives()
    .try(
      Joi.string().trim().min(6),
      Joi.number()
    )
    .required()
    .messages({
      "any.required": "merchantpincode is required",
      "string.empty": "merchantpincode cannot be empty",
    }),
  panno: Joi.string().trim().required().messages({
    "any.required": "panno is required",
    "string.empty": "panno cannot be empty",
  }),
  accountnumber: Joi.alternatives()
    .try(
      Joi.string().trim().min(1),
      Joi.number()
    )
    .required()
    .messages({
      "any.required": "accountnumber is required",
      "string.empty": "accountnumber cannot be empty",
    }),
  ifsc: Joi.string().trim().required().messages({
    "any.required": "ifsc is required",
    "string.empty": "ifsc cannot be empty",
  }),
  bankname: Joi.string().trim().required().messages({
    "any.required": "bankname is required",
    "string.empty": "bankname cannot be empty",
  }),
  aadharno: Joi.alternatives()
    .try(
      Joi.string().trim().min(12),
      Joi.number()
    )
    .required()
    .messages({
      "any.required": "aadharno is required",
      "string.empty": "aadharno cannot be empty",
    }),
  state: Joi.string().trim().required().messages({
    "any.required": "state is required",
    "string.empty": "state cannot be empty",
  }),
  shopname: Joi.string().trim().required().messages({
    "any.required": "shopname is required",
    "string.empty": "shopname cannot be empty",
  }),
  address: Joi.string().trim().required().messages({
    "any.required": "address is required",
    "string.empty": "address cannot be empty",
  }),
  gender: Joi.string().trim().required().messages({
    "any.required": "gender is required",
    "string.empty": "gender cannot be empty",
  }),
  maritalstatus: Joi.string().trim().required().messages({
    "any.required": "maritalstatus is required",
    "string.empty": "maritalstatus cannot be empty",
  }),
  ipaddress: Joi.string().trim().required().messages({
    "any.required": "ipaddress is required",
    "string.empty": "ipaddress cannot be empty",
  }),
  district: Joi.string().trim().required().messages({
    "any.required": "district is required",
    "string.empty": "district cannot be empty",
  }),
})
  .or("userId", "userid")
  .unknown(true)
  .messages({
    "object.missing": "userId is required in request body",
  });

const merchantEkycSchema = Joi.object({
  merchantId: merchantIdRule,
  pidData: Joi.alternatives()
    .try(
      Joi.string().trim().min(1),
      Joi.object()
    )
    .required()
    .messages({
      "any.required": "pidData is required",
      "string.empty": "pidData cannot be empty",
    }),
});

export {
  initiateUpiCashpointSchema,
  merchantRegistrationSchema,
  merchantRegistrationSendOtpSchema,
  merchantRegistrationVerifySchema,
  sellerOnboardingSchema,
  merchantEkycSchema,
};
