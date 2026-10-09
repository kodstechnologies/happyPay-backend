import { verifyAccessToken } from "../utils/jwt.js";

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Authorization token is required",
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Invalid authorization format",
      });
    }

    const decoded = verifyAccessToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Invalid or expired access token",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.userType !== "admin") {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: "Admin access is required",
    });
  }

  next();
};

export { authMiddleware as verifyToken, requireAdmin };
export default authMiddleware;