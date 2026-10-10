import mongoose from "mongoose";
import onboardMerchant from "../../external/services/provider.service.js";
import Category from "../../masterdata/model/catagory.model.js";
import PropertyType from "../../masterdata/model/propertyType.model.js";
import EducationalQualification from "../../masterdata/model/EducationalQualification.model.js";
import ProofType from "../../masterdata/model/ProofType.model.js";
import { findVerifiedOtp, checkEmailOtpVerified } from "../repository/emailOtp.repository.js";
import User from "../model/user.model.js";
import {
  findByAadhaar,
  findByEmail,
  findByMobile,
  findByPan,
  saveRetailerRegistration,
} from "../repository/user.repository.js";

const fail = (statusCode, message, meta = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.meta = meta;
  return error;
};

const isBlank = (value) =>
  value === undefined ||
  value === null ||
  String(value).trim() === "";

const toDateOnly = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

const buildRetailerResponse = (user) => ({
  id: user._id,
  mobile: user.mobile,
  isMobileVerified: user.isMobileVerified,
  email: user.email,
  isEmailVerified: user.isEmailVerified,
  fullName: user.fullName,
  gender: user.gender,
  panNumber: user.panNumber,
  aadhaarNumber: user.aadhaarNumber,
  dateOfBirth: user.dateOfBirth
    ? new Date(user.dateOfBirth).toISOString().slice(0, 10)
    : null,
  fullAddress: user.shop?.address?.addressLine || null,
  city: user.shop?.address?.city || null,
  state: user.shop?.address?.state || null,
  pincode: user.shop?.address?.pincode || null,
  shopName: user.shop?.name || null,
  shopCategory: user.shop?.category || null,
  propertyType: user.shop?.propertyType || null,
  shopAddress: user.shop?.completeAddress || null,
  latitude: user.shop?.location?.latitude ?? null,
  longitude: user.shop?.location?.longitude ?? null,
  selfie: user.selfie || null,
  maritalStatus: user.maritalStatus || null,
  educationalQualification: user.educationalQualification || null,
  panDocument: user.panDocument || null,
  fatherName: user.fatherName || null,
  aadhaarDocument: user.aadhaarDocument || null,
  shopInsidePhoto: user.shopInsidePhoto || null,
  shopOutsidePhoto: user.shopOutsidePhoto || null,
  shopLocationPhoto: user.shopLocationPhoto || null,
  businessProof: user.businessProofType || null,
  businessProofDocument: user.businessProofDocument || null,
  banks: user.banks || [],
  primaryBank: user.banks?.find((b) => b.isPrimary) || user.banks?.[0] || null,
  outletId: user.outletId || null,
  adminApproved: user.adminApproved,
  reasonOfRejection: user.reasonOfRejection || null,
  documentReviews: user.documentReviews || null,
  registrationStatus: user.registrationStatus || "NOT_STARTED",
  currentRegistrationStep: user.currentRegistrationStep || "ACCOUNT",
});

const assertActiveMaster = async (Model, id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw fail(400, `Invalid ${label}`);
  }

  const record = await Model.findOne({
    _id: id,
    isActive: true,
  });

  if (!record) {
    throw fail(400, `${label} not found`);
  }

  return record._id;
};

const registerRetailer = async (body = {}) => {
  const mobile = isBlank(body.mobile) ? "" : String(body.mobile).trim();
  const name = isBlank(body.name) ? "" : String(body.name).trim();
  const gender = isBlank(body.gender) ? "" : String(body.gender).trim();
  const pan = isBlank(body.pan) ? "" : String(body.pan).trim().toUpperCase();
  const email = isBlank(body.email) ? "" : String(body.email).trim().toLowerCase();
  const aadhaar = isBlank(body.aadhaar) ? "" : String(body.aadhaar).trim();
  const fulladdress = isBlank(body.fulladdress)
    ? ""
    : String(body.fulladdress).trim();
  const pincode = isBlank(body.pincode) ? "" : String(body.pincode).trim();
  const city = isBlank(body.city) ? "" : String(body.city).trim();
  const dob = isBlank(body.dob) ? "" : String(body.dob).trim();
  const latitude = body.latitude;
  const longitude = body.longitude;
  const shopName = isBlank(body.shopName) ? "" : String(body.shopName).trim();
  const shopCategory = isBlank(body.shopCategory)
    ? ""
    : String(body.shopCategory).trim();
  const propertyType = isBlank(body.propertyType)
    ? ""
    : String(body.propertyType).trim();
  const shopAddress = isBlank(body.shopAddress)
    ? ""
    : String(body.shopAddress).trim();
  const selfie = isBlank(body.selfie) ? "" : String(body.selfie).trim();
  const maritalStatus = isBlank(body.maritalStatus)
    ? ""
    : String(body.maritalStatus).trim();
  const educationalQualification = isBlank(body.educationalQualification)
    ? ""
    : String(body.educationalQualification).trim();
  const panDocument = isBlank(body.panDocument)
    ? ""
    : String(body.panDocument).trim();
  const fatherName = isBlank(body.fatherName)
    ? ""
    : String(body.fatherName).trim();
  const aadhaarDocument = isBlank(body.aadhaarDocument)
    ? ""
    : String(body.aadhaarDocument).trim();
  const shopInsidePhoto = isBlank(body.shopInsidePhoto)
    ? ""
    : String(body.shopInsidePhoto).trim();
  const shopOutsidePhoto = isBlank(body.shopOutsidePhoto)
    ? ""
    : String(body.shopOutsidePhoto).trim();
  const shopLocationPhoto = isBlank(body.shopLocationPhoto)
    ? ""
    : String(body.shopLocationPhoto).trim();
  const businessProof = isBlank(body.businessProof)
    ? ""
    : String(body.businessProof).trim();
  const businessProofDocument = isBlank(body.businessProofDocument)
    ? ""
    : String(body.businessProofDocument).trim();
  const bankName = isBlank(body.bankName) ? "" : String(body.bankName).trim();
  const ifscCode = isBlank(body.ifscCode)
    ? ""
    : String(body.ifscCode).trim().toUpperCase();

  const required = {
    mobile,
    name,
    gender,
    pan,
    email,
    aadhaar,
    fulladdress,
    pincode,
    city,
    dob,
    latitude,
    longitude,
    shopName,
    shopCategory,
    propertyType,
    shopAddress,
    selfie,
    maritalStatus,
    educationalQualification,
    panDocument,
    fatherName,
    aadhaarDocument,
    shopInsidePhoto,
    shopOutsidePhoto,
    shopLocationPhoto,
    businessProof,
    businessProofDocument,
    bankName,
    ifscCode,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => isBlank(value))
    .map(([key]) => key);

  if (missing.length) {
    throw fail(400, `Missing required fields: ${missing.join(", ")}`);
  }

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    throw fail(400, "Please enter a valid 10-digit mobile number");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw fail(400, "Please enter a valid email address");
  }

  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    throw fail(400, "Please enter a valid PAN number");
  }

  if (!/^\d{12}$/.test(aadhaar)) {
    throw fail(400, "Please enter a valid 12-digit Aadhaar number");
  }

  if (!/^\d{6}$/.test(pincode)) {
    throw fail(400, "Please enter a valid 6-digit pincode");
  }

  const parsedDob = toDateOnly(dob);
  if (!parsedDob) {
    throw fail(400, "Please enter a valid date of birth");
  }

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (
    Number.isNaN(parsedLatitude) ||
    parsedLatitude < -90 ||
    parsedLatitude > 90
  ) {
    throw fail(400, "Please enter a valid latitude");
  }

  if (
    Number.isNaN(parsedLongitude) ||
    parsedLongitude < -180 ||
    parsedLongitude > 180
  ) {
    throw fail(400, "Please enter a valid longitude");
  }

  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    throw fail(400, "Please enter a valid IFSC code");
  }

  const [
    shopCategoryId,
    propertyTypeId,
    businessProofId,
  ] = await Promise.all([
    assertActiveMaster(Category, shopCategory, "shop category"),
    assertActiveMaster(PropertyType, propertyType, "property type"),
    assertActiveMaster(ProofType, businessProof, "business proof"),
  ]);

  const user = await findByMobile(mobile);

  if (!user || !user.isMobileVerified) {
    throw fail(
      400,
      "Mobile number is not verified. Verify the mobile OTP before registration"
    );
  }

  const emailMatchesUser =
    user.isEmailVerified && user.email === email;
  const verifiedEmailOtp = emailMatchesUser
    ? null
    : await findVerifiedOtp(email);

  if (!emailMatchesUser && !verifiedEmailOtp) {
    throw fail(
      400,
      "Email is not verified. Verify the email OTP before registration"
    );
  }

  if (user.outletId) {
    throw fail(409, "Retailer is already registered");
  }

  const [emailOwner, panOwner, aadhaarOwner] = await Promise.all([
    findByEmail(email),
    findByPan(pan),
    findByAadhaar(aadhaar),
  ]);

  if (
    emailOwner &&
    emailOwner._id.toString() !== user._id.toString()
  ) {
    throw fail(409, "Email is already registered");
  }

  if (
    panOwner &&
    panOwner._id.toString() !== user._id.toString()
  ) {
    throw fail(409, "PAN is already registered");
  }

  if (
    aadhaarOwner &&
    aadhaarOwner._id.toString() !== user._id.toString()
  ) {
    throw fail(409, "Aadhaar is already registered");
  }

  let providerResult;

  try {
    providerResult = await onboardMerchant({
      mobile,
      name,
      gender,
      pan,
      email,
      aadhaar,
      fulladdress,
      pincode,
      city,
      dob: parsedDob,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
    });
  } catch (error) {
    const providerStatus = error.response?.status;
    const providerData = error.response?.data;
    const providerMessage =
      providerData?.msg ||
      providerData?.message ||
      error.message ||
      "Merchant onboarding failed";

    throw fail(
      providerStatus && providerStatus >= 400 && providerStatus < 500
        ? providerStatus
        : 502,
      providerMessage,
      providerData || null
    );
  }

  const providerStatus = String(providerResult?.status || "").toUpperCase();
  const providerData = providerResult?.data || {};
  const outletId = providerData.outletId;

  if (providerStatus !== "SUCCESS" || isBlank(outletId)) {
    throw fail(
      400,
      providerResult?.msg || "Merchant onboarding failed",
      providerResult || null
    );
  }

  const savedUser = await saveRetailerRegistration(user._id, {
    fullName: providerData.name || name,
    gender: providerData.gender || gender,
    panNumber: pan,
    email,
    isEmailVerified: true,
    aadhaarNumber: aadhaar,
    dateOfBirth: new Date(providerData.dateOfBirth || parsedDob),
    "shop.address.addressLine": providerData.address || fulladdress,
    "shop.address.city": providerData.city || city,
    "shop.address.state": providerData.state || null,
    "shop.address.pincode": providerData.pincode
      ? String(providerData.pincode)
      : pincode,
    "shop.name": shopName,
    "shop.category": shopCategoryId,
    "shop.propertyType": propertyTypeId,
    "shop.completeAddress": shopAddress,
    "shop.location.latitude": parsedLatitude,
    "shop.location.longitude": parsedLongitude,
    selfie,
    maritalStatus,
    educationalQualification: educationalQualification, // Store as plain text
    panDocument,
    fatherName,
    aadhaarDocument,
    shopInsidePhoto,
    shopOutsidePhoto,
    shopLocationPhoto,
    businessProofType: businessProofId,
    businessProofDocument,
    banks: [
      {
        name: bankName,
        ifscCode: ifscCode,
        isPrimary: true,
        isActive: true,
      },
    ],
    outletId: String(outletId),
    registrationStatus: "COMPLETED",
    adminApproved: "pending",
    reasonOfRejection: null,
    documentReviews: {
      panDocument: {
        status: panDocument ? "PENDING" : "NOT_SUBMITTED",
      },
      aadhaarDocument: {
        status: aadhaarDocument ? "PENDING" : "NOT_SUBMITTED",
      },
      selfie: {
        status: selfie ? "PENDING" : "NOT_SUBMITTED",
      },
      shopInsidePhoto: {
        status: shopInsidePhoto ? "PENDING" : "NOT_SUBMITTED",
      },
      shopOutsidePhoto: {
        status: shopOutsidePhoto ? "PENDING" : "NOT_SUBMITTED",
      },
      shopLocationPhoto: {
        status: shopLocationPhoto ? "PENDING" : "NOT_SUBMITTED",
      },
      businessProofDocument: {
        status: businessProofDocument ? "PENDING" : "NOT_SUBMITTED",
      },
    },
  });

  return buildRetailerResponse(savedUser);
};

export { registerRetailer };

const resolveMasterDataId = async (Model, value, label) => {
  if (mongoose.Types.ObjectId.isValid(value)) {
    const record = await Model.findOne({ _id: value, isActive: true });
    if (!record) throw fail(400, `${label} not found or inactive`);
    return record._id;
  }
  throw fail(400, `Invalid ${label}`);
};

const updateShopDetails = async (body = {}, files = {}) => {
  // Get user (userId already validated by route middleware)
  const user = await User.findById(body.userId);
  if (!user) {
    throw fail(404, "User not found");
  }

  // Check if mobile is verified (business logic validation)
  if (!user.isMobileVerified) {
    throw fail(400, "Mobile number must be verified before proceeding with registration");
  }

  // Process form data (all already validated by Joi)
  const shopName = body.shopName || user.shop?.name;
  const pincode = body.pincode || user.shop?.address?.pincode;
  const city = body.city || user.shop?.address?.city;
  const address = body.address || body.fulladdress || user.shop?.completeAddress;

  // Resolve master data IDs
  let shopCategoryId = user.shop?.category;
  if (body.shopCategory || body.category) {
    const categoryVal = body.shopCategory || body.category;
    shopCategoryId = await resolveMasterDataId(Category, categoryVal, "Shop category");
  }

  let propertyTypeId = user.shop?.propertyType;
  if (body.propertyType) {
    propertyTypeId = await resolveMasterDataId(PropertyType, body.propertyType, "Property type");
  }

  let businessProofId = user.businessProofType;
  if (body.businessProofType || body.businessProof) {
    const proofVal = body.businessProofType || body.businessProof;
    businessProofId = await resolveMasterDataId(ProofType, proofVal, "Business proof type");
  }

  // Process file uploads
  const shopInsidePhoto = files.shopInsidePhoto?.[0]?.path || body.shopInsidePhoto || user.shopInsidePhoto;
  const shopOutsidePhoto = files.shopOutsidePhoto?.[0]?.path || body.shopOutsidePhoto || user.shopOutsidePhoto;
  const shopLocationPhoto = files.shopLocationPhoto?.[0]?.path || body.shopLocationPhoto || user.shopLocationPhoto;
  const businessProofDocument = files.businessProofDocument?.[0]?.path || files.businessProofDoc?.[0]?.path || body.businessProofDocument || user.businessProofDocument;

  // Update user data (no email processing in shop details)

  // Update shop details
  if (!user.shop) user.shop = {};
  if (shopName) user.shop.name = shopName.trim();
  if (shopCategoryId) user.shop.category = shopCategoryId;
  if (propertyTypeId) user.shop.propertyType = propertyTypeId;

  if (!user.shop.address) user.shop.address = {};
  if (city) user.shop.address.city = city.trim();
  if (pincode) user.shop.address.pincode = pincode.trim();
  if (address) user.shop.completeAddress = address.trim();

  // Update location
  if (body.latitude !== undefined && body.latitude !== null && body.latitude !== "") {
    if (!user.shop.location) user.shop.location = {};
    user.shop.location.latitude = Number(body.latitude);
  }
  if (body.longitude !== undefined && body.longitude !== null && body.longitude !== "") {
    if (!user.shop.location) user.shop.location = {};
    user.shop.location.longitude = Number(body.longitude);
  }

  // Update photos and documents
  if (shopInsidePhoto) user.shopInsidePhoto = shopInsidePhoto;
  if (shopOutsidePhoto) user.shopOutsidePhoto = shopOutsidePhoto;
  if (shopLocationPhoto) user.shopLocationPhoto = shopLocationPhoto;
  if (businessProofId) user.businessProofType = businessProofId;
  if (businessProofDocument) user.businessProofDocument = businessProofDocument;

  // Update registration progress
  user.registrationStatus = "IN_PROGRESS";
  user.currentRegistrationStep = "SHOP_DETAILS";

  await user.save();
  return buildRetailerResponse(user);
};

const updateAboutDetails = async (body = {}, files = {}) => {
  // Get user (userId already validated by route middleware)
  const user = await User.findById(body.userId);
  if (!user) {
    throw fail(404, "User not found");
  }

  // Process form data (all already validated by Joi)
  const fullName = body.fullName || body.name;
  const dob = body.dob || body.dateOfBirth;
  const parsedDob = toDateOnly(dob);

  // Process file upload
  const selfie = files.selfie?.[0]?.path || body.selfie;

  // Update user data
  user.fullName = fullName.trim();
  user.dateOfBirth = new Date(parsedDob);
  user.gender = body.gender.trim();
  user.maritalStatus = body.maritalStatus.trim();
  user.educationalQualification = body.educationalQualification.trim();
  if (selfie) user.selfie = selfie;
  if (body.fatherName) user.fatherName = body.fatherName.trim();

  // Update registration progress
  user.registrationStatus = "IN_PROGRESS";
  user.currentRegistrationStep = "ABOUT";

  await user.save();
  return buildRetailerResponse(user);
};

const updateAadhaarDetails = async (body = {}, files = {}) => {
  const user = await User.findById(body.userId);
  if (!user) {
    throw fail(404, "User not found");
  }

  // Process file upload
  const aadhaarDocument = files.aadhaarDocument?.[0]?.path;

  // Update user data (all already validated by Joi and multer middleware)
  user.aadhaarNumber = body.aadhaarNumber;
  user.aadhaarConsent = body.aadhaarConsent;
  user.aadhaarMobileLinked = body.aadhaarMobileLinked;
  if (aadhaarDocument) user.aadhaarDocument = aadhaarDocument;

  // Update registration progress
  user.registrationStatus = "IN_PROGRESS";
  user.currentRegistrationStep = "AADHAAR_DETAILS";

  await user.save();
  return buildRetailerResponse(user);
};

const updateBankDetailsAndOnboard = async (body = {}) => {
  // Get user (userId already validated by route middleware)
  const user = await User.findById(body.userId);
  if (!user) {
    throw fail(404, "User not found");
  }

  // Process form data (all already validated by Joi)
  let bankName = body.bankName;
  if (Array.isArray(bankName)) {
    bankName = bankName[0];
  }

  // Update bank details
  user.banks = [
    {
      name: bankName.trim(),
      ifscCode: body.ifscCode.trim().toUpperCase(),
      accountNumber: body.accountNumber.trim(),
      isPrimary: true,
      isActive: true,
    }
  ];

  // Call external merchant onboarding API (Provider API)
  const parsedDob = user.dateOfBirth ? toDateOnly(user.dateOfBirth) : "";
  const onboardPayload = {
    mobile: user.mobile || "",
    name: user.fullName || "",
    gender: user.gender || "",
    pan: user.panNumber || "",
    email: user.email || "",
    aadhaar: user.aadhaarNumber || "",
    fulladdress: user.shop?.completeAddress || user.shop?.address?.addressLine || "",
    pincode: user.shop?.address?.pincode || "",
    city: user.shop?.address?.city || "",
    dob: parsedDob,
    latitude: user.shop?.location?.latitude || 0,
    longitude: user.shop?.location?.longitude || 0,
  };

  let providerResult;
  try {
    providerResult = await onboardMerchant(onboardPayload);
  } catch (error) {
    const providerStatus = error.response?.status;
    const providerData = error.response?.data;
    const providerMessage =
      providerData?.msg ||
      providerData?.message ||
      error.message ||
      "Merchant onboarding failed at external gateway";

    throw fail(
      providerStatus && providerStatus >= 400 && providerStatus < 500
        ? providerStatus
        : 502,
      providerMessage,
      providerData || null
    );
  }

  const providerStatus = String(providerResult?.status || "").toUpperCase();
  const providerData = providerResult?.data || {};
  const outletId = providerData.outletId || providerResult?.outletId;

  if (providerStatus !== "SUCCESS" || isBlank(outletId)) {
    throw fail(
      400,
      providerResult?.msg || providerResult?.message || "Merchant onboarding failed at external gateway",
      providerResult || null
    );
  }

  user.outletId = String(outletId);
  user.registrationStatus = "COMPLETED";
  user.currentRegistrationStep = "SUBMITTED";

  // Set each document review status to PENDING
  if (!user.documentReviews) user.documentReviews = {};
  const docFields = [
    "panDocument",
    "aadhaarDocument",
    "selfie",
    "shopInsidePhoto",
    "shopOutsidePhoto",
    "shopLocationPhoto",
    "businessProofDocument",
  ];
  for (const field of docFields) {
    if (!user.documentReviews[field]) user.documentReviews[field] = {};
    user.documentReviews[field].status = "PENDING";
  }

  await user.save();
  return {
    user: buildRetailerResponse(user),
    outletId: user.outletId,
    onboarding: providerResult,
  };
};





const getCurrentRegistrationStep = async (userId) => {
  if (!userId) {
    throw fail(400, "User ID (userId) is required");
  }

  const user = await User.findById(userId)
    .populate('shop.category', 'name')
    .populate('shop.propertyType', 'name')
    .populate('businessProofType', 'name');

  if (!user) {
    throw fail(404, "User not found");
  }

  return {
    userId: user._id,
    mobile: user.mobile,
    email: user.email,
    registrationStatus: user.registrationStatus,
    currentRegistrationStep: user.currentRegistrationStep,
    isMobileVerified: user.isMobileVerified,
    isEmailVerified: user.isEmailVerified,
    outletId: user.outletId || null,
    adminApproved: user.adminApproved,
    eKYCStatus: user.eKYCStatus,

    // All filled information
    filledData: {
      // Account info
      panNumber: user.panNumber || null,
      panDocument: user.panDocument || null,

      // Shop details
      shop: user.shop ? {
        name: user.shop.name || null,
        category: user.shop.category || null,
        propertyType: user.shop.propertyType || null,
        address: {
          addressLine: user.shop.address?.addressLine || null,
          city: user.shop.address?.city || null,
          state: user.shop.address?.state || null,
          pincode: user.shop.address?.pincode || null,
        },
        completeAddress: user.shop.completeAddress || null,
        location: {
          latitude: user.shop.location?.latitude || null,
          longitude: user.shop.location?.longitude || null,
        },
      } : null,
      shopInsidePhoto: user.shopInsidePhoto || null,
      shopOutsidePhoto: user.shopOutsidePhoto || null,
      shopLocationPhoto: user.shopLocationPhoto || null,
      businessProofType: user.businessProofType || null,
      businessProofDocument: user.businessProofDocument || null,

      // Personal/About details
      fullName: user.fullName || null,
      fatherName: user.fatherName || null,
      gender: user.gender || null,
      maritalStatus: user.maritalStatus || null,
      educationalQualification: user.educationalQualification || null,
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : null,
      selfie: user.selfie || null,

      // Aadhaar details
      aadhaarNumber: user.aadhaarNumber || null,
      aadhaarDocument: user.aadhaarDocument || null,
      aadhaarConsent: user.aadhaarConsent || false,
      aadhaarMobileLinked: user.aadhaarMobileLinked || false,
      aadhaarVerified: user.aadhaarVerified || false,

      // Bank details
      banks: user.banks || [],
      primaryBank: user.banks?.find((b) => b.isPrimary) || user.banks?.[0] || null,
    },

    // Step completion status
    completedSteps: {
      account: user.isMobileVerified,
      shopDetails: !!(user.shop?.name && user.email),
      about: !!(user.fullName && user.dateOfBirth && user.gender && user.maritalStatus && user.educationalQualification && user.selfie),
      aadhaarDetails: !!user.aadhaarNumber,
      bankDetails: !!(user.banks && user.banks.length > 0),
      submitted: !!user.outletId,
    },
  };
};

export {
  // registerRetailer,
  updateShopDetails,
  updateAboutDetails,
  updateAadhaarDetails,
  updateBankDetailsAndOnboard,
  getCurrentRegistrationStep,
};
