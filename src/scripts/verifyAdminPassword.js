import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Admin from "../modules/auth/model/Admin.model.js";

const verifyAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const admin = await Admin.findOne({ email: "admin@happypayfintech.com" }).select("+password");
    
    if (!admin) {
      console.log("Admin not found!");
      process.exit(1);
    }

    console.log("Admin found with password field");
    console.log("Email:", admin.email);
    console.log("Status:", admin.status);
    console.log("Has password:", !!admin.password);
    
    if (admin.password) {
      const isValid = await bcrypt.compare("admin123", admin.password);
      console.log("Password validation (admin123):", isValid);
      
      const isOldValid = await bcrypt.compare("YourStrongPassword", admin.password);
      console.log("Password validation (YourStrongPassword):", isOldValid);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error verifying admin password:", error);
    process.exit(1);
  }
};

verifyAdminPassword();
