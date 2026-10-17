import User from "../model/user.model.js";
import "../model/role.model.js";
import "../model/permission.model.js";
import "../../AEPS/model/aepsEkyc.model.js";

const rbacPopulate = [
  {
    path: "roles",
    populate: {
      path: "permissions",
    },
  },
  {
    path: "permissions",
  },
  {
    path: "AepsEkyc",
  },
];


/* ==============================
   Find Retailer By Email
============================== */

const findRetailerByEmail = async (email) => {
  return await User.findOne({
    email: email.toLowerCase().trim(),
  }).populate(rbacPopulate);
};


/* ==============================
   Find Retailer By Mobile
============================== */

const findRetailerByMobile = async (mobile) => {
  return await User.findOne({
    mobile: mobile.trim(),
  }).populate(rbacPopulate);
};


/* ==============================
   Create Test Retailer
============================== */

const createTestRetailer = async (email) => {
  return await User.create({
    email: email.toLowerCase().trim(),
    mobile: "9999999999",
    status: "active",
    kycStatus: "pending",
    isActive: true,
  });
};

const createRetailer = async (data) => {
  return await User.create({
    ...data,
    status: "active",
    kycStatus: "pending",
    isActive: true,
  });
};



/* ==============================
   Update Last Login
============================== */

const updateLastLogin = async (userId) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      lastLoginAt: new Date(),
    },
    {
      new: true,
    }
  );
};


/* ==============================
   Add Refresh Token
============================== */

const addRefreshToken = async (
  userId,
  refreshTokenData
) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      $push: {
        refreshTokens: refreshTokenData,
      },
    },
    {
      new: true,
    }
  );
};


/* ==============================
   Add / Update Device
============================== */

const addOrUpdateDevice = async (
  userId,
  deviceData
) => {
  const user = await User.findById(userId);

  if (!user) {
    return null;
  }

  if (!user.devices) {
    user.devices = [];
  }

  const existingDevice = user.devices.find(
    (device) =>
      device.deviceId === deviceData.deviceId
  );

  const cleanToken = (deviceData.fcmToken && deviceData.fcmToken !== "dummy" && typeof deviceData.fcmToken === "string")
    ? deviceData.fcmToken.trim()
    : null;

  if (existingDevice) {
    if (cleanToken) {
      existingDevice.fcmToken = cleanToken;
    }

    if (deviceData.platform) {
      existingDevice.platform = deviceData.platform;
    }

    if (deviceData.deviceName) {
      existingDevice.deviceName = deviceData.deviceName;
    }

    existingDevice.lastUsedAt = new Date();
    existingDevice.isActive = true;
  } else {
    user.devices.push({
      deviceId: deviceData.deviceId,
      fcmToken: cleanToken,
      platform: deviceData.platform || "web",
      deviceName: deviceData.deviceName || "Web browser",
      lastUsedAt: new Date(),
      isActive: true,
    });
  }

  return await user.save();
};


/* ==============================
   Find User By Refresh Token
============================== */

const findUserByRefreshToken = async (refreshToken) => {
  return await User.findOne({
    "refreshTokens.token": refreshToken,
  });
};


/* ==============================
   Remove Refresh Token
============================== */

const removeRefreshToken = async ({
  userId,
  refreshToken,
  deviceId,
}) => {
  const matchConditions = [];

  if (refreshToken) {
    matchConditions.push({ token: refreshToken });
  }

  if (deviceId) {
    matchConditions.push({ deviceId });
  }

  if (!matchConditions.length) {
    return null;
  }

  const pullFilter =
    matchConditions.length === 1
      ? matchConditions[0]
      : { $or: matchConditions };

  return await User.findByIdAndUpdate(
    userId,
    {
      $pull: {
        refreshTokens: pullFilter,
      },
    },
    {
      new: true,
    }
  );
};


/* ==============================
   Deactivate Device
============================== */

const deactivateDevice = async (userId, deviceId) => {
  return await User.findOneAndUpdate(
    {
      _id: userId,
      "devices.deviceId": deviceId,
    },
    {
      $set: {
        "devices.$.isActive": false,
        "devices.$.fcmToken": "",
      },
    },
    {
      new: true,
    }
  );
};


/* ==============================
   Update KYC Status to Pending
============================== */

const updateKycStatusToPending = async (userId) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      kycStatus: "pending",
      kycRejectionReason: "",
    },
    {
      new: true,
    }
  );
};


export {
  findRetailerByEmail,
  findRetailerByMobile,
  createTestRetailer,
  updateLastLogin,
  addRefreshToken,
  addOrUpdateDevice,
  findUserByRefreshToken,
  removeRefreshToken,
  deactivateDevice,
  updateKycStatusToPending,
  createRetailer,
};