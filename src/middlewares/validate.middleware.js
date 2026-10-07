const validate = (schema, source = "body", options = {}) => {
  return (req, res, next) => {
    let dataToValidate;

    if (source === "query") {
      dataToValidate = req.query;
    } else if (source === "params") {
      dataToValidate = req.params;
    } else {
      dataToValidate = req.body;
    }

    const validateOptions = {
      abortEarly: false,
      stripUnknown: false,
      ...options,
    };

    const { error, value } = schema.validate(dataToValidate, validateOptions);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((item) => item.message),
      });
    }

    if (source === "query") {
      req.query = value;
    } else if (source === "params") {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

export { validate };
export default validate;