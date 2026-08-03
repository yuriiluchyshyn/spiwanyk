const asyncHandler = require('../utils/asyncHandler');
const categoryService = require('../services/categoryService');

// Public
const getPublicCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getPublicCategories();
  res.json({ categories });
});

const getLegacyMetaCategories = (req, res) => {
  res.json({ categories: categoryService.getLegacyMetaCategories() });
};

// Admin
const getAdminCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAdminCategories();
  res.json({ categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.categoryId, req.body);
  res.json({ category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { deletedCategory, affectedSongs } = await categoryService.deleteCategory(
    req.params.categoryId
  );
  res.json({ message: 'Категорію видалено', deletedCategory, affectedSongs });
});

module.exports = {
  getPublicCategories,
  getLegacyMetaCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
