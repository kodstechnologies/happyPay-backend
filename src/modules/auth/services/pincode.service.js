import axios from "axios";
import logger from "../../../utils/logger.js";

// In-memory cache for validated pincodes to avoid repeated external network requests
const pincodeCache = new Map();
const MAX_CACHE_SIZE = 5000;

/**
 * Validates a 6-digit Indian postal code using the India Post public API
 * with in-memory caching and resilient fallback.
 *
 * @param {string|number} pincode - 6-digit postal code
 * @returns {Promise<{ isValid: boolean, city?: string, district?: string, state?: string, postOffices?: string[], message?: string, isFallback?: boolean }>}
 */
export const validatePincode = async (pincode) => {
  const trimmed = String(pincode || "").trim();

  // Basic pattern validation
  if (!/^\d{6}$/.test(trimmed)) {
    return {
      isValid: false,
      message: "Pincode must be exactly 6 numeric digits",
    };
  }

  // Check cache first
  if (pincodeCache.has(trimmed)) {
    return pincodeCache.get(trimmed);
  }

  try {
    const response = await axios.get(
      `https://api.postalpincode.in/pincode/${trimmed}`,
      {
        timeout: 5000, // 5 seconds timeout
      }
    );

    const data = response.data?.[0];

    if (
      data &&
      data.Status === "Success" &&
      Array.isArray(data.PostOffice) &&
      data.PostOffice.length > 0
    ) {
      const primary = data.PostOffice[0];
      const result = {
        isValid: true,
        district: primary.District || null,
        city: primary.District || primary.Circle || null,
        state: primary.State || null,
        postOffices: data.PostOffice.map((po) => po.Name).filter(Boolean),
        message: "Pincode verified successfully",
      };

      // Store in LRU-like cache
      if (pincodeCache.size >= MAX_CACHE_SIZE) {
        const firstKey = pincodeCache.keys().next().value;
        pincodeCache.delete(firstKey);
      }
      pincodeCache.set(trimmed, result);

      return result;
    }

    // Explicit failure from postal service (no records found)
    return {
      isValid: false,
      message: "Invalid postal pincode. No official records found.",
    };
  } catch (error) {
    // If India Post API is temporarily unreachable or times out,
    // fallback gracefully so valid retailers are not blocked from registering.
    logger.warn(
      `Pincode validator external API error for ${trimmed}: ${error.message}. Allowing fallback validation.`
    );

    return {
      isValid: true,
      isFallback: true,
      message: "Pincode format verified (external directory unavailable)",
    };
  }
};
