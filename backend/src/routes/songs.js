const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const handleValidation = require('../utils/handleValidation');
const songController = require('../controllers/songController');
const categoryController = require('../controllers/categoryController');
const songImportController = require('../controllers/songImportController');
const adminController = require('../controllers/adminController');
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
// optionalAuth so an authenticated user also receives their own private categories.
router.get('/categories', optionalAuth, categoryController.getPublicCategories);
router.get('/meta/categories', categoryController.getLegacyMetaCategories);

// --- Authenticated user's own (private) songs & categories ---
router.post('/my/categories', auth, categoryController.createUserCategory);
router.put('/my/categories/:id', auth, categoryController.updateUserCategory);
router.delete('/my/categories/:id', auth, categoryController.deleteUserCategory);
router.post('/my/songs', auth, songController.createUserSong);
router.put('/my/songs/:id', auth, songController.updateUserSong);
router.delete('/my/songs/:id', auth, songController.deleteUserSong);
router.post('/my/save/:id', auth, songController.saveSongToMyCatalog);

// --- Hidden admin endpoints (before /:id to avoid route conflicts) ---
router.get('/admin/categories', categoryController.getAdminCategories);
router.post('/admin/categories', categoryController.createCategory);
router.put('/admin/categories/reorder', categoryController.reorderCategories);
router.put('/admin/categories/:categoryId', categoryController.updateCategory);
router.delete('/admin/categories/:categoryId', categoryController.deleteCategory);
router.get('/admin/users', adminController.listUsers);
router.get('/admin/songbooks', adminController.listSongbooks);
router.get('/admin/songbooks/:id', adminController.getSongbook);
router.put('/admin/songbooks/:id', adminController.updateSongbookTitle);
router.delete('/admin/songbooks/:id', adminController.deleteSongbook);
router.delete('/admin/users/:id', adminController.deleteUser);
router.get('/admin/list', songController.adminList);
router.post('/admin/songs', songController.adminCreate);
router.get('/admin/export', songImportController.exportToJson);
router.post('/import-from-json', songImportController.importFromJson);
router.delete('/admin/all', songController.adminDeleteAll);
router.post('/admin/delete-by-category', songController.adminDeleteByCategory);
router.post('/admin/songs/bulk-delete', songController.adminBulkDelete);
router.post('/admin/songs/bulk-category', songController.adminBulkCategory);
router.put('/admin/:id/category', songController.adminUpdateCategory);
router.put('/admin/:id/publish', songController.adminPublish);
router.get('/admin/:id', songController.adminGetById);
router.put('/admin/:id', songController.adminUpdate);
router.delete('/admin/:id', songController.adminDeleteById);

// --- Single song ---
router.get('/:id', optionalAuth, songController.getById);
router.post('/', auth, createSongRules, handleValidation, songController.create);
router.put('/:id', auth, updateSongRules, handleValidation, songController.update);
router.delete('/:id', auth, songController.remove);

module.exports = router;
