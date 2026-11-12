import crypto from "crypto";

export const generate15CharTxnId = (prefix = "TXN") => {
  const cleanPrefix = String(prefix || "");
  const remainingLen = Math.max(0, 15 - cleanPrefix.length);
  const randomStr = crypto
    .randomBytes(Math.ceil(remainingLen / 2) + 2)
    .toString("hex")
    .slice(0, remainingLen)
    .toUpperCase();

  return `${cleanPrefix}${randomStr}`;
};

/**
 * Generate a unique retailer ID in format: HP-{5 digit timestamp}-{MongoDB _id last 2 digits in caps}
 * @param {string} mongoId - MongoDB ObjectId string
 * @returns {string} - Retailer ID in format HP-XXXXX-YY
 */
export const generateRetailerId = (mongoId) => {
  if (!mongoId) {
    throw new Error("MongoDB ID is required to generate retailer ID");
  }

  // Get 5 digit unique timestamp (last 5 digits of current timestamp in milliseconds)
  const timestamp = Date.now();
  const timestamp5Digits = String(timestamp).slice(-5);

  // Get last 2 characters of MongoDB _id and convert to uppercase
  const mongoIdStr = String(mongoId);
  const last2Chars = mongoIdStr.slice(-2).toUpperCase();

  return `HP-${timestamp5Digits}-${last2Chars}`;
};

export default generate15CharTxnId;
