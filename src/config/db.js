import mongoose from "mongoose";
import env from "./env.js";

const connectDB = async () => {
  try {
    if (!env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    console.log("Attempting to connect to MongoDB...");
console.log("MONGO_URI:", env.MONGO_URI);
    const connection = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      connectTimeoutMS: 10000,
    });

    console.log(
      `MongoDB connected: ${connection.connection.host} (${connection.connection.name})    `
    );
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error("Please check your .env file and ensure MONGO_URI is set correctly");
    process.exit(1);
  }
};

export default connectDB;