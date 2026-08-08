const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const handleValidation = require('../utils/handleValidation');
const songbookController = require('../controllers/songbookController');
const {
  publicSongbooksRules,
  nearbySongbooksRules,
  createSongbookRules,
  updateSongbookRules,
  addSongRules,
  reorderSongsRules,
  moveSongRules,
  addSectionRules,
  shareRules,
  availableSongsRules
} = require('../validators/songbookValidators');

const router = express.Router();

// --- Collections (must precede /:id) ---
router.get('/my', auth, songbookController.getMy);
router.get('/shared-with-me', auth, songbookController.getSharedWithMe);
router.get('/public', publicSongbooksRules, handleValidation, songbookController.getPublic);
router.get('/nearby', auth, nearbySongbooksRules, handleValidation, songbookController.getNearby);

// --- Single songbook ---
router.get('/:id', optionalAuth, songbookController.getById);
router.post('/', auth, createSongbookRules, handleValidation, songbookController.create);
router.put('/:id', auth, updateSongbookRules, handleValidation, songbookController.update);
router.delete('/:id', auth, songbookController.remove);

// --- Songs within a songbook ---
router.post('/:id/songs', auth, addSongRules, handleValidation, songbookController.addSong);
router.delete('/:id/songs/:songId', auth, songbookController.removeSong);
router.put('/:id/songs/reorder', auth, reorderSongsRules, handleValidation, songbookController.reorderSongs);
router.put('/:id/songs/:songId/move', auth, moveSongRules, handleValidation, songbookController.moveSong);

// --- Sections ---
router.post('/:id/sections', auth, addSectionRules, handleValidation, songbookController.addSection);
router.delete('/:id/sections/:sectionId', auth, songbookController.removeSection);

// --- Sharing ---
router.post('/:id/share', auth, shareRules, handleValidation, songbookController.share);
router.delete('/:id/share/:email', auth, songbookController.unshare);

// --- Song discovery ---
router.get('/:id/available-songs', auth, availableSongsRules, handleValidation, songbookController.getAvailableSongs);

module.exports = router;
