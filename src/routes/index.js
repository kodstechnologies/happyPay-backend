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
import upiCashpointRoutes from "../modules/UPICashpoint/routes/upiCashpoint.routes.js";
import cmsRoutes from "../modules/CMS/routes/cms.routes.js";
import paymentRoutes from "../modules/payments/routes/payment.routes.js";
import walletRoutes from "../modules/wallet/routes/wallet.routes.js";
import transactionRoutes from "../modules/transaction/routes/transaction.routes.js";
import fundRequestRoutes from "../modules/fundRequest/routes/fundRequest.routes.js";
import fundRequestAdminRoutes from "../modules/fundRequest/routes/fundRequest.admin.routes.js";
import walletLockRequestRoutes from "../modules/walletLockRequest/routes/walletLockRequest.routes.js";
import walletLockRequestAdminRoutes from "../modules/walletLockRequest/routes/walletLockRequest.admin.routes.js";
import adminWalletLockRoutes from "../modules/walletLockRequest/routes/adminWalletLock.routes.js";

import dashboardRoutes from "../modules/dashboard/routes/dashboard.routes.js";
import pricingRoutes from "../modules/pricing/routes/pricing.routes.js";
import webhookRoutes from "../modules/webhooks/routes/webhook.routes.js";


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
router.use("/api/v1/upi-cashpoint", upiCashpointRoutes);
router.use("/api/v1/cms", cmsRoutes);
router.use("/api/v1/payments", paymentRoutes);
router.use("/api/v1/wallet", walletRoutes);
router.use("/api/v1/transactions", transactionRoutes);
router.use("/api/v1/fund-requests", fundRequestRoutes);
router.use("/api/v1/admin/fund-requests", fundRequestAdminRoutes);
router.use("/api/v1/wallet-lock-requests", walletLockRequestRoutes);
router.use("/api/v1/admin/wallet-lock-requests", walletLockRequestAdminRoutes);
router.use("/api/v1/admin", adminWalletLockRoutes);
router.use("/api/v1/dashboard", dashboardRoutes);
router.use("/api/v1/pricing", pricingRoutes);

// Webhook routes — no JWT, provider-authenticated per route
router.use("/api/v1/webhooks", webhookRoutes);


// router.use("/api/v1/admin/support", adminSupportRoutes);

router.use("/api/admin", adminRoutes);
router.use("/api/v1/banners", bannerRoutes);

export default router;
