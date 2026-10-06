import transporter from "../../../config/mail.js"
;

import {
  findLatestOtp,
  deleteExistingOtps,
  createOtp,
  markOtpVerified,
} from "../repository/emailOtp.repository.js";

import {
  findByMobile,
  findByEmail,
  setEmailVerified,
  markEmailVerifiedByEmail,
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

  await transporter.sendMail({
    from: `"HappyPay" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "HappyPay Email Verification OTP",

    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>HappyPay Email Verification</h2>

        <p>Your verification OTP is:</p>

        <h1 style="letter-spacing: 5px;">
          ${otp}
        </h1>

        <p>
          This OTP will expire in
          <strong>5 minutes</strong>.
        </p>

        <p>
          If you did not request this OTP,
          please ignore this email.
        </p>
      </div>
    `,
  });

  return {
    email,
    expiresAt,
  };
};


const verifyEmailOtp = async (email, otp, mobile) => {
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
    const error = new Error(
      "Invalid OTP"
    );

    error.statusCode = 400;

    throw error;
  }

  let user = null;

  if (mobile) {
    const normalizedMobile = String(mobile).trim();
    user = await findByMobile(normalizedMobile);

    if (!user || !user.isMobileVerified) {
      const error = new Error(
        "Mobile number is not verified"
      );
      error.statusCode = 400;
      throw error;
    }

    const emailOwner = await findByEmail(email);

    if (
      emailOwner &&
      emailOwner._id.toString() !== user._id.toString()
    ) {
      const error = new Error(
        "Email is already registered"
      );
      error.statusCode = 409;
      throw error;
    }
  }

  const verifiedOtp =
    await markOtpVerified(otpRecord);

  if (user) {
    await setEmailVerified(user._id, email);
  } else {
    await markEmailVerifiedByEmail(email);
  }

  return {
    email: verifiedOtp.email,
    verified: true,
    isEmailVerified: true,
    verifiedAt: verifiedOtp.verifiedAt,
  };
};


export {
  sendEmailOtp,
  verifyEmailOtp,
};