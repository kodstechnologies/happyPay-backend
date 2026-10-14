import mongoose from "mongoose";

const remitterSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      trim: true,
      default: "",
    },
    lastname: {
      type: String,
      trim: true,
      default: "",
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    aadhar: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    eKyc: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "PENDING",
      index: true,
    },
    outletId: {
      type: String,
      trim: true,
      index: true,
      default: null,
    },
  },
  { timestamps: true },
);

const Remitter = mongoose.models.Remitter || mongoose.model("Remitter", remitterSchema);

export default Remitter;
