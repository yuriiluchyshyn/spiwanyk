const asyncHandler = require('../utils/asyncHandler');
const categoryService = require('../services/categoryService');

// Public (includes the authenticated user's own private categories)
const getPublicCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getPublicCategories(req.user);
  res.json({ categories });
});

// Authenticated user creates a private category of their own.
const createUserCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createUserCategory(req.user, req.body);
  res.status(201).json({ category });
});

// Authenticated user renames one of their own private categories.
const updateUserCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateUserCategory(req.user, req.params.id, req.body);
  res.json({ category });
});

// Authenticated user deletes one of their own private categories.
const deleteUserCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.deleteUserCategory(req.user, req.params.id);
  res.json({ message: 'Розділ видалено', ...result });
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

const reorderCategories = asyncHandler(async (req, res) => {
  const { parentId, orderedIds } = req.body;
  const categories = await categoryService.reorderCategories(parentId ?? null, orderedIds);
  res.json({ categories });
});

module.exports = {
  getPublicCategories,
  createUserCategory,
  updateUserCategory,
  deleteUserCategory,
  getLegacyMetaCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
};
