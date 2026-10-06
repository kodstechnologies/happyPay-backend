import cors from "cors";
import env from "../config/env.js";

const configuredOrigins = (env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isHappypayOrigin = (origin) => {
  try {
    const { protocol, hostname } = new URL(origin);
    return (
      protocol === "https:" &&
      (hostname === "happypayfintech.com" ||
        hostname.endsWith(".happypayfintech.com"))
    );
  } catch {
    return false;
  }
};

export const isAllowedOrigin = (origin) =>
  configuredOrigins.includes(origin) || isHappypayOrigin(origin);

const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests without an Origin header
    // (Postman, server-to-server requests, etc.)
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(`CORS policy: Origin ${origin} is not allowed`)
    );
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-ID",
  ],
});

export default corsMiddleware;