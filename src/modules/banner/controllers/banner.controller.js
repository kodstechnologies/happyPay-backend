import { addBanner, listBanners, fetchBanner, modifyBanner, removeBanner } from "../services/banner.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";

export const createBannerController = asyncHandler(async (req, res) => {
  const { imageUrl: _imageUrl, ...bannerData } = req.body;

  const banner = await addBanner({
    ...bannerData,
    imageUrl: req.file?.path,
  });
  res.status(201).json(ApiResponse.success(banner, "Banner created successfully"));
});

export const getBannersController = asyncHandler(async (req, res) => {
  // Pass true if user is admin, false if user is retailer
  // Assuming req.user has a role, or you can check req.path if it's admin route
  const isAdmin = req.originalUrl.includes("/admin"); 
  const banners = await listBanners(isAdmin);
  res.status(200).json(ApiResponse.success(banners, "Banners fetched successfully"));
});

export const getBannerByIdController = asyncHandler(async (req, res) => {
  const banner = await fetchBanner(req.params.id);
  res.status(200).json(ApiResponse.success(banner, "Banner fetched successfully"));
});

export const updateBannerController = asyncHandler(async (req, res) => {
  const { imageUrl: _imageUrl, ...updateData } = req.body;
  if (req.file?.path) {
    updateData.imageUrl = req.file.path;
  }

  const banner = await modifyBanner(req.params.id, updateData);
  res.status(200).json(ApiResponse.success(banner, "Banner updated successfully"));
});

export const deleteBannerController = asyncHandler(async (req, res) => {
  const response = await removeBanner(req.params.id);
  res.status(200).json(ApiResponse.success(response, "Banner deleted successfully"));
});
