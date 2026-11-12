import ApiError from "../ApiError.js";
import { putObject } from "./putObject.js";

const uploadedFiles = (files) => {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return Object.values(files).flat();
};

export const uploadRegistrationFilesToS3 =
  (folder = "happypay/retailers") =>
  async (req, res, next) => {
    try {
      const files = uploadedFiles(req.files);

      await Promise.all(
        files.map(async (file) => {
          if (!file?.buffer) return;

          const { url, key } = await putObject(file, folder);
          file.path = url;
          file.key = key;
        })
      );

      next();
    } catch (error) {
      next(new ApiError(500, error?.message || "Failed to upload file"));
    }
  };
