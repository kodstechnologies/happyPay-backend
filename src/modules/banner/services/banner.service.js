import { createBanner, getBanners, getBannerById, updateBanner, deleteBanner } from "../repository/banner.repository.js";
import ApiError from "../../../utils/ApiError.js";

const addBanner = async (bannerData) => {
  if (!bannerData.imageUrl) {
    throw ApiError.badRequest("Banner image is required");
  }
  return await createBanner(bannerData);
};

const listBanners = async (isAdmin = false) => {
  // If not admin, only show active banners
  const filters = isAdmin ? {} : { isActive: true };
  return await getBanners(filters);
};

const fetchBanner = async (id) => {
  const banner = await getBannerById(id);
  if (!banner) throw ApiError.notFound("Banner not found");
  return banner;
};

const modifyBanner = async (id, updateData) => {
  const banner = await updateBanner(id, updateData);
  if (!banner) throw ApiError.notFound("Banner not found");
  return banner;
};

const removeBanner = async (id) => {
  const banner = await deleteBanner(id);
  if (!banner) throw ApiError.notFound("Banner not found");
  return { message: "Banner deleted successfully" };
};

export {
  addBanner,
  listBanners,
  fetchBanner,
  modifyBanner,
  removeBanner,
};
