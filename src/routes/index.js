import { Router } from 'express';
const router = Router();

import emailOtpRoutes from "../modules/auth/routes/emailOtp.routes.js";
import masterDataRoutes from "../modules/masterdata/routes/masterData.routes.js";
import otpRoutes from "../modules/auth/routes/otp.routes.js";
import authRoutes from "../modules/auth/routes/auth.routes.js";
import adminAuthRoutes from "../modules/auth/routes/admin.routes.js";
import supportRoutes from "../modules/support/routes/support.route.js";
import adminSupportRoutes from "../modules/support/routes/support.route.js";
import aepsRoutes from "../modules/AEPS/routes/aeps.routes.js";
import notificationsRoutes from "../modules/notifications/routes/notifications.routes.js";
import adminRoutes from "../modules/admin/routes/admin.routes.js";
import bannerRoutes from "../modules/banner/routes/banner.routes.js";
import bbpsRoutes from "../modules/BBPS/routes/bbps.routes.js";
import dmtRoutes from "../modules/DMT/routes/dmt.routes.js";

router.use("/api/v1/otp", otpRoutes);
router.use("/api/v1/email-otp", emailOtpRoutes);
router.use("/api/v1/master-data", masterDataRoutes);
router.use("/api/v1/auth", authRoutes);

router.use("/api/v1/auth/admin", adminAuthRoutes);
router.use("/api/v1/support", supportRoutes);
router.use("/api/v1/aeps", aepsRoutes);
router.use("/api/v1/notifications", notificationsRoutes);
router.use("/api/v1/bbps", bbpsRoutes);
router.use("/api/v1/dmt", dmtRoutes);
// router.use("/api/v1/admin/support", adminSupportRoutes);

router.use("/api/admin", adminRoutes);
router.use("/api/v1/banners", bannerRoutes);

export default router;
