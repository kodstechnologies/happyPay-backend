import Remitter from "../models/remitter.model.js";

/**
  * Upsert remitter record idempotently
  * If the remitter exists, updates metadata while preserving completed eKYC status.
  */
export const upsertRemitter = async ({
  mobile,
  aadhar,
  firstname,
  lastname,
  name,
  outletId,
}) => {
  if (!mobile) return null;

  const updateFields = {};
  if (aadhar) updateFields.aadhar = String(aadhar).trim();
  if (outletId) updateFields.outletId = String(outletId).trim();

  if (firstname !== undefined && firstname !== null && String(firstname).trim()) {
    updateFields.firstname = String(firstname).trim();
  }
  if (lastname !== undefined && lastname !== null && String(lastname).trim()) {
    updateFields.lastname = String(lastname).trim();
  }

  // If a full name is passed and firstname/lastname are not set, split into firstname & lastname
  if (name && !updateFields.firstname) {
    const cleanName = String(name).trim();
    const nameParts = cleanName.split(/\s+/);
    updateFields.firstname = nameParts[0] || "";
    if (nameParts.length > 1 && !updateFields.lastname) {
      updateFields.lastname = nameParts.slice(1).join(" ");
    }
  }

  return await Remitter.findOneAndUpdate(
    { mobile: String(mobile).trim() },
    {
      $set: updateFields,
      $setOnInsert: {
        mobile: String(mobile).trim(),
        eKyc: "PENDING",
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

/**
  * Update Remitter eKYC status (e.g., "COMPLETED")
  */
export const updateRemitterEkycStatus = async (mobile, status = "COMPLETED") => {
  if (!mobile) return null;

  return await Remitter.findOneAndUpdate(
    { mobile: String(mobile).trim() },
    { $set: { eKyc: status } },
    { new: true }
  );
};

/**
  * Find remitter by mobile number
  */
export const findRemitterByMobile = async (mobile) => {
  if (!mobile) return null;
  return await Remitter.findOne({ mobile: String(mobile).trim() }).lean();
};

/**
  * Find remitter by mobile and validate Aadhaar match
  * Returns remitter if found and Aadhaar matches, null if not found, and false if Aadhaar doesn't match
  */
export const validateRemitterAadhaar = async (mobile, aadhaar) => {
  if (!mobile || !aadhaar) return null;
  
  const remitter = await Remitter.findOne({ mobile: String(mobile).trim() }).lean();
  
  if (!remitter) return null; // Remitter not found
  if (remitter.aadhar !== String(aadhaar).trim()) return false; // Aadhaar mismatch
  
  return remitter; // Remitter found and Aadhaar matches
};

export default {
  upsertRemitter,
  updateRemitterEkycStatus,
  findRemitterByMobile,
  validateRemitterAadhaar,
};
