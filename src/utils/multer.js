import multer from "multer";
import path from "path";

import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import ApiError from "./ApiError.js";

/**
 * Cloudinary storage
 */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "happypay/support",
    resource_type: "auto",
  },
});

/**
 * Allowed MIME types
 */
const allowedMimeTypes = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",

  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",

  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Allowed file extensions
 *
 * Requestly sometimes sends files with:
 *
 * application/octet-stream
 *
 * So when that happens, we validate the extension.
 */
const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",

  ".mp4",
  ".webm",
  ".mov",

  ".pdf",
  ".doc",
  ".docx",
];

/**
 * Multer configuration
 */
const multerOptions = {
  storage,

  limits: {
    // Maximum size per file = 10 MB
    fileSize: 10 * 1024 * 1024,

    // Maximum number of files
    files: 25,
  },

  fileFilter: (req, file, cb) => {
    console.log("Uploaded file:");
    console.log("fieldname:", file.fieldname);
    console.log("originalname:", file.originalname);
    console.log("mimetype:", file.mimetype);

    /**
     * Normal MIME type
     */
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    /**
     * Requestly may send some files as:
     *
     * application/octet-stream
     *
     * In that case, validate using the file extension.
     */
    if (file.mimetype === "application/octet-stream") {
      const extension = path
        .extname(file.originalname)
        .toLowerCase();

      console.log("Detected extension:", extension);

      if (allowedExtensions.includes(extension)) {
        return cb(null, true);
      }
    }

    /**
     * Reject unsupported files
     */
    console.log("Rejected MIME type:", file.mimetype);

    return cb(
      new ApiError(
        400,
        `File type ${file.mimetype} is not allowed`
      ),
      false
    );
  },
};

/**
 * Standard upload middleware
 *
 * Example:
 * upload.array("attachments", 5)
 */
const retailerStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "happypay/retailers",
    resource_type: "auto",
  },
});

const retailerPhotoFields = new Set([
  "selfie",
  "shopInsidePhoto",
  "shopOutsidePhoto",
  "shopLocationPhoto",
]);

const retailerDocumentFields = new Set([
  "panDocument",
  "aadhaarDocument",
  "businessProofDocument",
]);

const imageMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const documentMimeTypes = [
  ...imageMimeTypes,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const documentExtensions = [...imageExtensions, ".pdf", ".doc", ".docx"];

const retailerFileFilter = (req, file, cb) => {
  const isPhoto = retailerPhotoFields.has(file.fieldname);
  const isDocument = retailerDocumentFields.has(file.fieldname);

  // Reject unknown field names
  if (!isPhoto && !isDocument) {
    return cb(
      new ApiError(
        400,
        `Unexpected file field: ${file.fieldname}`
      ),
      false
    );
  }

  const allowedMimes = isPhoto
    ? imageMimeTypes
    : documentMimeTypes;

  const allowedExts = isPhoto
    ? imageExtensions
    : documentExtensions;

  // --------------------------------
  // Normal MIME type
  // --------------------------------
  if (allowedMimes.includes(file.mimetype)) {
    return cb(null, true);
  }

  // --------------------------------
  // Requestly / some clients
  // send application/octet-stream
  // --------------------------------
  if (
    file.mimetype === "application/octet-stream" ||
    file.mimetype === "application/x-octet-stream"
  ) {
    const extension = path
      .extname(file.originalname || "")
      .toLowerCase();

    console.log("Retailer file:");
    console.log("Field:", file.fieldname);
    console.log("Name:", file.originalname);
    console.log("MIME:", file.mimetype);
    console.log("Extension:", extension);

    if (allowedExts.includes(extension)) {
      return cb(null, true);
    }

    return cb(
      new ApiError(
        400,
        `File extension ${extension || "unknown"} is not allowed for ${file.fieldname}`
      ),
      false
    );
  }

  // --------------------------------
  // Reject unsupported MIME
  // --------------------------------
  return cb(
    new ApiError(
      400,
      `File type ${file.mimetype} is not allowed`
    ),
    false
  );
};

export const uploadRetailerDocuments = multer({
  storage: retailerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 7,
  },
  fileFilter: retailerFileFilter,
}).fields([
  { name: "selfie", maxCount: 1 },
  { name: "panDocument", maxCount: 1 },
  { name: "aadhaarDocument", maxCount: 1 },
  { name: "shopInsidePhoto", maxCount: 1 },
  { name: "shopOutsidePhoto", maxCount: 1 },
  { name: "shopLocationPhoto", maxCount: 1 },
  { name: "businessProofDocument", maxCount: 1 },
]);

// Specialized multer middleware for shop details with mandatory file validation
export const uploadShopDetailsDocuments = multer({
  storage: retailerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 4, // Only 4 mandatory files
  },
  fileFilter: retailerFileFilter,
}).fields([
  { name: "shopInsidePhoto", maxCount: 1 },
  { name: "shopOutsidePhoto", maxCount: 1 },
  { name: "shopLocationPhoto", maxCount: 1 },
  { name: "businessProofDocument", maxCount: 1 },
]);

// Middleware to validate mandatory shop files are uploaded
export const validateShopFiles = (req, res, next) => {
  const mandatoryFiles = ['shopInsidePhoto', 'shopOutsidePhoto', 'shopLocationPhoto', 'businessProofDocument'];
  const uploadedFiles = req.files || {};
  const missingFiles = [];

  // Check each mandatory file
  mandatoryFiles.forEach(fieldName => {
    if (!uploadedFiles[fieldName] || uploadedFiles[fieldName].length === 0) {
      missingFiles.push(fieldName);
    }
  });

  if (missingFiles.length > 0) {
    const fieldLabels = {
      shopInsidePhoto: 'Shop Inside Photo',
      shopOutsidePhoto: 'Shop Outside Photo',
      shopLocationPhoto: 'Shop Location Photo',
      businessProofDocument: 'Business Proof Document'
    };

    const missingLabels = missingFiles.map(field => fieldLabels[field]);

    return res.status(400).json({
      success: false,
      message: `The following files are mandatory: ${missingLabels.join(', ')}`,
      statusCode: 400,
      errors: missingFiles.map(field => `${fieldLabels[field]} is required`)
    });
  }

  next();
};

// Specialized multer middleware for about details with mandatory selfie validation
export const uploadAboutDetailsDocuments = multer({
  storage: retailerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1, // Only selfie is required
  },
  fileFilter: retailerFileFilter,
}).fields([
  { name: "selfie", maxCount: 1 },
]);



export const uploadAdharDetailsDocuments = multer({
  storage: retailerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1, // Only selfie is required
  },
  fileFilter: retailerFileFilter,
}).fields([
  { name: "aadhaarDocument", maxCount: 1 },
]);

// Middleware to validate mandatory about details files are uploaded
export const validateAboutFiles = (req, res, next) => {
  const uploadedFiles = req.files || {};

  // Check if selfie is uploaded
  if (!uploadedFiles.selfie || uploadedFiles.selfie.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Selfie is required for about details",
      statusCode: 400,
      errors: ["Selfie is required"]
    });
  }

  next();
};

const bannerStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "happypay/banners",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const bannerFileFilter = (req, file, cb) => {
  if (file.fieldname !== "image") {
    return cb(
      new ApiError(400, `Unexpected file field: ${file.fieldname}`),
      false
    );
  }

  if (imageMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  if (
    file.mimetype === "application/octet-stream" ||
    file.mimetype === "application/x-octet-stream"
  ) {
    const extension = path.extname(file.originalname || "").toLowerCase();

    if (imageExtensions.includes(extension)) {
      return cb(null, true);
    }
  }

  return cb(
    new ApiError(400, `File type ${file.mimetype} is not allowed`),
    false
  );
};

export const uploadBannerImage = multer({
  storage: bannerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: bannerFileFilter,
}).single("image");

export const upload = multer(multerOptions);

/**
 * Upload any field
 */
export const uploadAny = multer(multerOptions).any();

/**
 * Convert req.files into a flat array
 */
const flattenUploadedFiles = (files) => {
  if (!files) return [];

  if (Array.isArray(files)) {
    return files;
  }

  return Object.values(files).flat();
};

/**
 * Restrict uploaded file field names
 */
export const restrictUploadedFileFields =
  (allowedFieldNames = []) =>
    (req, res, next) => {
      const allowed = new Set(allowedFieldNames);

      const invalid = flattenUploadedFiles(req.files).find(
        (file) => !allowed.has(file.fieldname)
      );

      if (invalid) {
        return next(
          new ApiError(
            400,
            `Unexpected file field: ${invalid.fieldname}`
          )
        );
      }

      return next();
    };

export default upload;