import env from "../config/env.js";
import logger from "../utils/logger.js";

const errorMiddleware = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let errors = error.errors || [];

  // Mongoose Bad ObjectId / CastError
  if (error.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${error.path}: ${error.value}`;
  }

  // Mongoose Validation Error
  else if (error.name === "ValidationError") {
    const err= Object.values(error.errors || {})
    // map((err) => err.message);
    console.log("Validation errors:", err); // Log the validation errors for debugging
    statusCode = 400;
    message = [0]?.message || "Validation failed";
    errors = err.map((err) => err.message)
  }

  // Mongoose Duplicate Key Error
  else if (error.code === 11000) {
    statusCode = 409;
    const fields = error.keyPattern ? Object.keys(error.keyPattern).join(", ") : "field";
    message = `Duplicate value entered for ${fields}`;
  }

  // JWT Errors
  else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please authenticate again.";
  } else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired. Please log in again.";
  }

  // Multer Errors
  else if (error.name === "MulterError") {
    statusCode = 400;
    if (error.code === "LIMIT_FILE_SIZE") {
      message = "File size exceeds the allowed limit";
    } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
      message = `Unexpected file field: ${error.field}`;
    } else {
      message = error.message || "File upload error";
    }
  }

  // SyntaxError in request body parsing (JSON)
  else if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    statusCode = 400;
    message = "Malformed JSON in request body";
  }

  // Log based on severity
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} (${statusCode}) - ${message}`, error.stack || error);
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} (${statusCode}) - ${message}`);
  }

  const response = {
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(env.NODE_ENV === "development" && statusCode >= 500 && { stack: error.stack }),
  };

  return res.status(statusCode).json(response);
};

export default errorMiddleware;
