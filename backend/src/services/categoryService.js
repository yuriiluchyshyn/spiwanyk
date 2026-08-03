const Category = require('../models/Category');
const Song = require('../models/Song');
const ApiError = require('../utils/ApiError');
const { DEFAULT_CATEGORIES, LEGACY_META_CATEGORIES } = require('../constants/defaultCategories');

/**
 * Song category business logic: public listing, legacy metadata and the
 * admin CRUD used by the hidden admin panel.
 */

/**
 * Categories for the public UI. Falls back to the canonical defaults (without
 * touching the DB) when the collection is still empty.
 */
const getPublicCategories = async () => {
  const categories = await Category.find({}).sort({ order: 1 });
  return categories.length > 0 ? categories : DEFAULT_CATEGORIES;
};

const getLegacyMetaCategories = () => LEGACY_META_CATEGORIES;

/**
 * Categories for the admin panel. Seeds the canonical defaults into the DB the
 * first time it is called on an empty collection.
 */
const getAdminCategories = async () => {
  let categories = await Category.find({}).sort({ order: 1 });
  if (categories.length === 0) {
    categories = await Category.insertMany(DEFAULT_CATEGORIES);
  }
  return categories;
};

const createCategory = async ({ id, name, icon, color }) => {
  if (!id || !name) {
    throw ApiError.badRequest('id та name обовʼязкові');
  }

  const maxOrder = await Category.findOne({}).sort({ order: -1 });
  const order = maxOrder ? maxOrder.order + 1 : 0;

  const category = new Category({
    id: id.toLowerCase(),
    name,
    icon: icon || '🎵',
    color: color || '#8B4513',
    order
  });

  try {
    await category.save();
  } catch (error) {
    if (error.code === 11000) {
      throw ApiError.badRequest('Категорія з таким id вже існує');
    }
    throw error;
  }

  return category;
};

const updateCategory = async (categoryId, { name, icon, color }) => {
  const category = await Category.findOne({ id: categoryId });
  if (!category) {
    throw ApiError.notFound('Категорію не знайдено');
  }

  if (name) category.name = name;
  if (icon) category.icon = icon;
  if (color) category.color = color;

  await category.save();
  return category;
};

const deleteCategory = async (categoryId) => {
  const category = await Category.findOneAndDelete({ id: categoryId });
  if (!category) {
    throw ApiError.notFound('Категорію не знайдено');
  }

  const affectedSongs = await Song.countDocuments({ category: categoryId });
  return { deletedCategory: category.name, affectedSongs };
};

module.exports = {
  getPublicCategories,
  getLegacyMetaCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
