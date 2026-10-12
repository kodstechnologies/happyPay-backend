import jwt from "jsonwebtoken";

import env from "../config/env.js";

const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN || "1h",
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN || "10h",
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
