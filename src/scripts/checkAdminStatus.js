import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Admin from "../modules/auth/model/Admin.model.js";

const checkAdminStatus = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const admin = await Admin.findOne({ email: "admin@happypayfintech.com" });
    
    if (!admin) {
      console.log("Admin not found!");
      process.exit(1);
    }

    console.log("Admin Status:");
    console.log("Email:", admin.email);
    console.log("Status:", admin.status);
    console.log("Full Admin Object:", JSON.stringify(admin, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error("Error checking admin status:", error);
    process.exit(1);
  }
};

checkAdminStatus();
