import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Admin from "../modules/auth/model/Admin.model.js";

const updateAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const admin = await Admin.findOne({ email: "admin@happypayfintech.com" });
    
    if (!admin) {
      console.log("Admin not found!");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash("admin123", 12);
    admin.password = hashedPassword;
    admin.status = "active";
    await admin.save();

    console.log("Admin password updated successfully!");
    console.log("Email: admin@happypayfintech.com");
    console.log("Password: admin123");
    console.log("Status: active");
    
    process.exit(0);
  } catch (error) {
    console.error("Error updating admin password:", error);
    process.exit(1);
  }
};

updateAdminPassword();
