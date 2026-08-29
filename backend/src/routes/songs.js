const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const handleValidation = require('../utils/handleValidation');
const songController = require('../controllers/songController');
const categoryController = require('../controllers/categoryController');
const songImportController = require('../controllers/songImportController');
const {
  listSongsRules,
  popularSongsRules,
  searchSongsRules,
  createSongRules,
  updateSongRules
} = require('../validators/songValidators');

const router = express.Router();

// --- Collection & search (must precede /:id) ---
router.get('/', optionalAuth, listSongsRules, handleValidation, songController.list);
router.get('/popular', popularSongsRules, handleValidation, songController.getPopular);
router.get('/search', searchSongsRules, handleValidation, songController.search);

// --- Categories (public + legacy) ---
router.get('/categories', categoryController.getPublicCategories);
router.get('/meta/categories', categoryController.getLegacyMetaCategories);

// --- Hidden admin endpoints (before /:id to avoid route conflicts) ---
router.get('/admin/categories', categoryController.getAdminCategories);
router.post('/admin/categories', categoryController.createCategory);
router.put('/admin/categories/reorder', categoryController.reorderCategories);
router.put('/admin/categories/:categoryId', categoryController.updateCategory);
router.delete('/admin/categories/:categoryId', categoryController.deleteCategory);
router.get('/admin/list', songController.adminList);
router.post('/admin/songs', songController.adminCreate);
router.get('/admin/export', songImportController.exportToJson);
router.post('/import-from-json', songImportController.importFromJson);
router.delete('/admin/all', songController.adminDeleteAll);
router.post('/admin/delete-by-category', songController.adminDeleteByCategory);
router.post('/admin/songs/bulk-delete', songController.adminBulkDelete);
router.post('/admin/songs/bulk-category', songController.adminBulkCategory);
router.put('/admin/:id/category', songController.adminUpdateCategory);
router.get('/admin/:id', songController.adminGetById);
router.put('/admin/:id', songController.adminUpdate);
router.delete('/admin/:id', songController.adminDeleteById);

// --- Single song ---
router.get('/:id', optionalAuth, songController.getById);
router.post('/', auth, createSongRules, handleValidation, songController.create);
router.put('/:id', auth, updateSongRules, handleValidation, songController.update);
router.delete('/:id', auth, songController.remove);

module.exports = router;
