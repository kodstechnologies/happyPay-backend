import transporter from "../../../config/mail.js";
import env from "../../../config/env.js";
import User from "../model/user.model.js";

import {
  findLatestOtp,
  deleteExistingOtps,
  createOtp,
  markOtpVerified,
} from "../repository/emailOtp.repository.js";

import {
  findByEmail,
  markEmailVerifiedByEmail,
  setEmailVerified,
} from "../repository/user.repository.js";


const generateOtp = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

const sendEmailOtp = async (email) => {
  if (!email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }



  email = email.trim().toLowerCase();

  const otp = generateOtp();

  // OTP expires in 5 minutes
  const expiresAt = new Date(
    Date.now() + 5 * 60 * 1000
  );

  await deleteExistingOtps(email);

  await createOtp({
    email,
    otp,
    expiresAt,
  });

  // Log email and OTP for all requests (for testing/debugging)
  console.log(`\n======================================================`);
  console.log(`[EMAIL OTP] Email: ${email}`);
  console.log(`[EMAIL OTP] OTP: ${otp}`);
  console.log(`[EMAIL OTP] Expires at: ${expiresAt.toISOString()}`);
  console.log(`======================================================\n`);

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM || `"HappyPay" <${env.SMTP_USER}>`,
      to: email,
      subject: "HappyPay Email Verification OTP",

      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HappyPay - Email Verification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 1px;">HappyPay</h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">Email Verification</h2>
            <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
              Thank you for choosing HappyPay! Please use the following One-Time Password (OTP) to verify your email address:
            </p>

            <!-- OTP Box -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 8px; text-align: center; margin: 30px 0;">
              <p style="margin: 0 0 10px 0; color: #e0e0e0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 48px; font-weight: 700; letter-spacing: 8px;">${otp}</h1>
            </div>

            <p style="margin: 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
              This OTP will expire in <strong style="color: #667eea;">5 minutes</strong> for your security.
            </p>

            <!-- Security Notice -->
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
                <strong>⚠️ Security Notice:</strong> If you did not request this OTP, please ignore this email and ensure your account is secure.
              </p>
            </div>

            <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
              For assistance, please contact our support team.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">
              © 2026 HappyPay. All rights reserved.
            </p>
            <p style="margin: 0; color: #999999; font-size: 12px;">
              This is an automated email. Please do not reply.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    });
    console.log(`[EMAIL OTP] Email sent successfully to ${email}`);
  } catch (mailError) {
    console.error("[EMAIL OTP] Failed to send OTP email via SMTP:", mailError.message);

    if (env.NODE_ENV !== "production") {
      console.log(`[EMAIL OTP] Development mode: Email delivery failed, OTP already logged above`);
      return {
        email,
        expiresAt,
        devOtp: otp,
        message: "Development mode: Email delivery failed, OTP logged to console",
      };
    }

    const error = new Error("Failed to send verification email. Please check your SMTP configuration.");
    error.statusCode = 500;
    throw error;
  }

  return {
    email,
    expiresAt,
  };
};


const verifyEmailOtp = async (email, otp, userId = null) => {
  if (!email || !otp) {
    const error = new Error(
      "Email and OTP are required"
    );

    error.statusCode = 400;

    throw error;
  }

  email = email.trim().toLowerCase();
  otp = String(otp).trim();

  if (!/^[0-9]{4}$/.test(otp)) {
    const error = new Error("OTP must be 4 digits");
    error.statusCode = 400;
    throw error;
  }

  let user = null;
  if (userId) {
    user = await User.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if another user already has this email
    const existingWithEmail = await findByEmail(email);
    if (
      existingWithEmail &&
      existingWithEmail._id.toString() !== String(userId)
    ) {
      const error = new Error("Email is already registered to another user");
      error.statusCode = 409;
      throw error;
    }
  }

  const otpRecord = await findLatestOtp(email);

  if (!otpRecord) {
    const error = new Error(
      "OTP not found or already verified"
    );

    error.statusCode = 400;

    throw error;
  }

  if (new Date() > otpRecord.expiresAt) {
    const error = new Error(
      "OTP has expired"
    );

    error.statusCode = 400;

    throw error;
  }

  if (otpRecord.otp !== otp) {
    // Check if it's the dummy OTP for testing
    if (otp !== "1234") {
      const error = new Error(
        "Invalid OTP"
      );

      error.statusCode = 400;

      throw error;
    }
  }

  // Mark OTP as verified
  const verifiedOtp = await markOtpVerified(otpRecord);

  // Store email and update status as email verified in user model
  if (user) {
    user.email = email;
    user.isEmailVerified = true;
    await user.save();
  } else if (userId) {
    await setEmailVerified(userId, email);
  }

  // Mark email as verified in database
  await markEmailVerifiedByEmail(email);

  return {
    userId: user?._id || userId || null,
    email: verifiedOtp.email,
    verified: true,
    isEmailVerified: true,
    emailVerified: true,
    verifiedAt: verifiedOtp.verifiedAt,
  };
};


export {
  sendEmailOtp,
  verifyEmailOtp,
};