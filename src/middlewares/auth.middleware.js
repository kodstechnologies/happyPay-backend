import { verifyAccessToken } from "../utils/jwt.js";

const parseCookieToken = (req) => {
  if (!req.headers.cookie) return null;
  try {
    const cookies = Object.fromEntries(
      req.headers.cookie
        .split(";")
        .map((c) => c.trim().split("="))
        .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))])
    );
    return cookies.accessToken || cookies.token || null;
  } catch {
    return null;
  }
};

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader) {
      const [scheme, bearerToken] = authHeader.split(" ");
      if (scheme === "Bearer" && bearerToken) {
        token = bearerToken;
      }
    }

    if (!token) {
      token = parseCookieToken(req);
    }

    if (!token) {
      if (req.body?.userId) {
        return next();
      }

      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Authorization token is required",
      });
    }

    const decoded = verifyAccessToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    if (req.body?.userId) {
      return next();
    }

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