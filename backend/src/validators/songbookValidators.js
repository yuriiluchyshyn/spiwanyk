const mongoose = require('mongoose');
const { body, query } = require('express-validator');

// Accepts undefined, null, empty string, or a valid ObjectId. Used for the
// optional sectionId on add/move/reorder operations.
const optionalSectionId = (value) => {
  if (value === undefined || value === null || value === '') {
    return true;
  }
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid section ID');
  }
  return true;
};

const publicSongbooksRules = [
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('skip').optional().isInt({ min: 0 }),
  query('tags').optional().isString()
];

const nearbySongbooksRules = [
  query('lat').notEmpty().isFloat({ min: -90, max: 90 }),
  query('lng').notEmpty().isFloat({ min: -180, max: 180 }),
  query('maxDistance').optional().isInt({ min: 100, max: 5000 }),
  query('maxAge').optional().isInt({ min: 1, max: 1440 })
];

const createSongbookRules = [
  body('title').notEmpty().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('privacy').optional().isIn(['private', 'public', 'shared', 'nearby']),
  body('tags').optional().isArray()
];

const updateSongbookRules = [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('privacy').optional().isIn(['private', 'public', 'shared', 'nearby']),
  body('defaultPermissions').optional().isIn(['view', 'edit']),
  body('tags').optional().isArray(),
  body('sharedWith').optional().isArray()
];

const addSongRules = [
  body('songId').notEmpty().isMongoId(),
  body('sectionId').optional().custom(optionalSectionId)
];

const reorderSongsRules = [
  body('sectionId').optional({ nullable: true }).custom(optionalSectionId),
  body('orderedSongIds').isArray({ min: 1 }),
  body('orderedSongIds.*').isMongoId()
];

const moveSongRules = [
  body('sectionId').optional({ nullable: true }).custom(optionalSectionId),
  body('targetIndex').optional().isInt({ min: 0 })
];

const addSectionRules = [
  body('name').notEmpty().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 })
];

const shareRules = [
  body('email').isEmail().normalizeEmail(),
  body('permissions').optional().isIn(['view', 'edit'])
];

const availableSongsRules = [
  query('search').optional().isString(),
  query('category').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('skip').optional().isInt({ min: 0 })
];

module.exports = {
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
};
