const SUPER_ADMIN_ROLE = "super_admin";

const getUserRoles = (user) => {
  if (Array.isArray(user?.roles)) {
    return user.roles;
  }

  if (user?.role) {
    return [user.role];
  }

  return [];
};

const getUserPermissions = (user) => {
  if (Array.isArray(user?.permissions)) {
    return user.permissions;
  }

  return [];
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Authentication required",
      });
    }

    const userRoles = getUserRoles(req.user);

    if (userRoles.includes(SUPER_ADMIN_ROLE)) {
      return next();
    }

    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You are not authorized to access this resource",
      });
    }

    next();
  };
};

const authorizePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Authentication required",
      });
    }

    const userRoles = getUserRoles(req.user);

    if (userRoles.includes(SUPER_ADMIN_ROLE)) {
      return next();
    }

    const userPermissions = getUserPermissions(req.user);

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You are not authorized to access this resource",
      });
    }

    next();
  };
};

export { authorize, authorizePermission };
export default authorize;
