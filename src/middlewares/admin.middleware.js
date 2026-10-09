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

export default requireAdmin;
