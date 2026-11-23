import Banner from "../model/banner.model.js";

const createBanner = async (bannerData) => {
  const banner = new Banner(bannerData);
  return await banner.save();
};

const getBanners = async (filters = {}, options = {}) => {
  const { sort = { createdAt: -1 }, limit = 100 } = options;
  return await Banner.find(filters).sort(sort).limit(limit);
};

const getBannerById = async (id) => {
  return await Banner.findById(id);
};

const updateBanner = async (id, updateData) => {
  return await Banner.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

const deleteBanner = async (id) => {
  return await Banner.findByIdAndDelete(id);
};

export {
  createBanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
};
