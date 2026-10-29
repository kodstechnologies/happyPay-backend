import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "INACTIVE",
  },
});

const serviceConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    categories: {
      type: [categorySchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "INACTIVE",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ServiceConfig", serviceConfigSchema);