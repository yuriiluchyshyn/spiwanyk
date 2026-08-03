const { body, query } = require('express-validator');

const YOUTUBE_URL_REGEX = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)/;
const SONG_CATEGORIES = ['patriotic', 'camp', 'religious', 'folk', 'modern', 'other'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

const listSongsRules = [
  query('q').optional().trim().isLength({ max: 100 }),
  query('category').optional().isString(),
  query('difficulty').optional().isIn(DIFFICULTIES),
  query('tags').optional().isString(),
  query('limit').optional().isInt({ min: 1 }),
  query('skip').optional().isInt({ min: 0 })
];

const popularSongsRules = [
  query('limit').optional().isInt({ min: 1 })
];

const searchSongsRules = [
  query('q').notEmpty().trim().isLength({ min: 1, max: 100 }),
  query('limit').optional().isInt({ min: 1 })
];

const createSongRules = [
  body('title').notEmpty().trim().isLength({ min: 1, max: 200 }),
  body('author').optional().trim().isLength({ max: 100 }),
  body('lyrics').optional().trim(),
  body('chords').optional().trim(),
  body('notes').optional().trim().isURL(),
  body('youtubeUrl').optional().trim().matches(YOUTUBE_URL_REGEX),
  body('category').optional().isIn(SONG_CATEGORIES),
  body('difficulty').optional().isIn(DIFFICULTIES),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean()
];

const updateSongRules = [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('author').optional().trim().isLength({ max: 100 }),
  body('lyrics').optional().trim(),
  body('chords').optional().trim(),
  body('notes').optional().trim(),
  body('youtubeUrl').optional().trim().matches(YOUTUBE_URL_REGEX),
  body('category').optional().isIn(SONG_CATEGORIES),
  body('difficulty').optional().isIn(DIFFICULTIES),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean()
];

module.exports = {
  listSongsRules,
  popularSongsRules,
  searchSongsRules,
  createSongRules,
  updateSongRules
};
