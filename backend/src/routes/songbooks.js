const express = require('express');
const mongoose = require('mongoose');
const { body, query, validationResult } = require('express-validator');
const Songbook = require('../models/Songbook');
const Song = require('../models/Song');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/songbooks/my - Get user's songbooks
router.get('/my', auth, async (req, res) => {
  try {
    const songbooks = await Songbook.find({ owner: req.user._id })
      .populate('songs.song', 'title author')
      .sort({ lastAccessed: -1, createdAt: -1 });

    res.json({
      songbooks,
      total: songbooks.length
    });

  } catch (error) {
    console.error('Get my songbooks error:', error);
    res.status(500).json({ message: 'Помилка отримання співаників' });
  }
});

// GET /api/songbooks/public - Get public songbooks
router.get('/public', [
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('skip').optional().isInt({ min: 0 }),
  query('tags').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const {
      limit = 20,
      skip = 0,
      tags
    } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined
    };

    const songbooks = await Songbook.findPublic(options);

    res.json({
      songbooks,
      total: songbooks.length,
      hasMore: songbooks.length === options.limit
    });

  } catch (error) {
    console.error('Get public songbooks error:', error);
    res.status(500).json({ message: 'Помилка отримання публічних співаників' });
  }
});

// GET /api/songbooks/nearby - Get nearby songbooks
router.get('/nearby', [
  auth,
  query('lat').notEmpty().isFloat({ min: -90, max: 90 }),
  query('lng').notEmpty().isFloat({ min: -180, max: 180 }),
  query('maxDistance').optional().isInt({ min: 100, max: 5000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const {
      lat,
      lng,
      maxDistance = 500
    } = req.query;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    const songbooks = await Songbook.findNearby(longitude, latitude, parseInt(maxDistance));

    res.json({
      songbooks,
      total: songbooks.length,
      searchCenter: { latitude, longitude },
      maxDistance: parseInt(maxDistance)
    });

  } catch (error) {
    console.error('Get nearby songbooks error:', error);
    res.status(500).json({ message: 'Помилка отримання співаників поруч' });
  }
});

// GET /api/songbooks/:id - Get songbook by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const songbook = await Songbook.findById(req.params.id)
      .populate('owner', 'email')
      .populate('songs.song', 'title author lyrics chords notes youtubeUrl category structure metadata')
      .populate('songs.addedBy', 'email');

    if (!songbook || !songbook.isActive) {
      return res.status(404).json({ message: 'Співаник не знайдено' });
    }

    // Check access permissions
    if (req.user) {
      const access = songbook.canAccess(req.user);
      if (!access.canAccess) {
        return res.status(403).json({ message: 'Доступ заборонено' });
      }
      
      // Increment access count (async, don't wait)
      songbook.incrementAccess().catch(err => 
        console.error('Error incrementing access count:', err)
      );
    } else {
      // Not authenticated - only public songbooks
      if (songbook.privacy !== 'public') {
        return res.status(403).json({ message: 'Доступ заборонено' });
      }
    }

    // Sort sections alphabetically
    songbook.sections.sort((a, b) => a.name.localeCompare(b.name, 'uk'));

    // Sort songs within each section by title
    const songsBySection = {};
    songbook.songs.forEach(songEntry => {
      const sectionId = songEntry.section ? songEntry.section.toString() : 'no-section';
      if (!songsBySection[sectionId]) {
        songsBySection[sectionId] = [];
      }
      songsBySection[sectionId].push(songEntry);
    });

    // Sort songs within each section
    Object.keys(songsBySection).forEach(sectionId => {
      songsBySection[sectionId].sort((a, b) => {
        const titleA = a.song?.title || '';
        const titleB = b.song?.title || '';
        return titleA.localeCompare(titleB, 'uk');
      });
    });

    // Rebuild songs array with sorted order
    const sortedSongs = [];
    
    // First add songs from sorted sections
    songbook.sections.forEach(section => {
      const sectionSongs = songsBySection[section._id.toString()] || [];
      sortedSongs.push(...sectionSongs);
    });
    
    // Then add songs without section
    const noSectionSongs = songsBySection['no-section'] || [];
    sortedSongs.push(...noSectionSongs);
    
    songbook.songs = sortedSongs;

    res.json({ songbook });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID співаника' });
    }
    
    console.error('Get songbook error:', error);
    res.status(500).json({ message: 'Помилка отримання співаника' });
  }
});

// POST /api/songbooks - Create new songbook
router.post('/', [
  auth,
  body('title').notEmpty().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('privacy').optional().isIn(['private', 'public', 'shared', 'nearby']),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const songbookData = {
      ...req.body,
      owner: req.user._id
    };

    // Clean tags
    if (songbookData.tags) {
      songbookData.tags = songbookData.tags
        .filter(tag => tag && tag.trim())
        .map(tag => tag.trim().toLowerCase());
    }

    const songbook = new Songbook(songbookData);
    await songbook.save();

    await songbook.populate('owner', 'email');

    res.status(201).json({
      message: 'Співаник створено',
      songbook
    });

  } catch (error) {
    console.error('Create songbook error:', error);
    res.status(500).json({ message: 'Помилка створення співаника' });
  }
});

// PUT /api/songbooks/:id - Update songbook
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('privacy').optional().isIn(['private', 'public', 'shared', 'nearby']),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const songbook = await Songbook.findById(req.params.id);

    if (!songbook || !songbook.isActive) {
      return res.status(404).json({ message: 'Співаник не знайдено' });
    }

    // Check permissions
    if (songbook.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Доступ заборонено' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        songbook[key] = req.body[key];
      }
    });

    // Clean tags
    if (req.body.tags) {
      songbook.tags = req.body.tags
        .filter(tag => tag && tag.trim())
        .map(tag => tag.trim().toLowerCase());
    }

    await songbook.save();
    await songbook.populate('owner', 'email');

    res.json({
      message: 'Співаник оновлено',
      songbook
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID співаника' });
    }
    
    console.error('Update songbook error:', error);
    res.status(500).json({ message: 'Помилка оновлення співаника' });
  }
});

// DELETE /api/songbooks/:id - Delete songbook
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('Delete songbook request:', {
      songbookId: req.params.id,
      userId: req.user._id,
      userEmail: req.user.email
    });

    const songbook = await Songbook.findById(req.params.id);

    if (!songbook) {
      console.log('Delete songbook - not found:', req.params.id);
      return res.status(404).json({ message: 'Співаник не знайдено' });
    }

    // Check permissions
    if (songbook.owner.toString() !== req.user._id.toString()) {
      console.log('Delete songbook - permission denied:', {
        songbookOwner: songbook.owner,
        requestUser: req.user._id
      });
      return res.status(403).json({ message: 'Доступ заборонено' });
    }

    console.log('Delete songbook - deleting:', {
      songbookId: songbook._id,
      songbookTitle: songbook.title
    });

    // Soft delete
    songbook.isActive = false;
    await songbook.save();

    console.log('Delete songbook - success');
    res.json({ message: 'Співаник видалено' });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID співаника' });
    }
    
    console.error('Delete songbook error:', error);
    res.status(500).json({ message: 'Внутрішня помилка сервера при видаленні співаника' });
  }
});

// POST /api/songbooks/:id/songs - Add song to songbook
router.post('/:id/songs', [
  auth,
  body('songId').notEmpty().isMongoId(),
  body('sectionId').optional().custom((value) => {
    // Allow undefined, null, or valid MongoDB ObjectId
    if (value === undefined || value === null || value === '') {
      return true;
    }
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid section ID');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const { songId, sectionId } = req.body;
    
    // Normalize sectionId - convert empty string to undefined
    const normalizedSectionId = sectionId && sectionId.trim() ? sectionId : undefined;

    const songbook = await Songbook.findById(req.params.id);
    if (!songbook || !songbook.isActive) {
      return res.status(404).json({ message: 'Співаник не знайдено' });
    }

    // Check permissions
    const access = songbook.canAccess(req.user);
    console.log('AddSong - Access check:', {
      songbookId: songbook._id,
      songbookTitle: songbook.title,
      songbookOwner: songbook.owner,
      songbookPrivacy: songbook.privacy,
      userId: req.user._id,
      userEmail: req.user.email,
      access: access,
      songId: songId,
      normalizedSectionId: normalizedSectionId
    });
    
    if (!access.canAccess || access.permissions !== 'edit') {
      console.log('AddSong - Permission denied:', { access, required: 'edit' });
      return res.status(403).json({ message: 'Недостатньо прав для редагування' });
    }

    // Check if song exists
    const song = await Song.findById(songId);
    if (!song) {
      console.log('AddSong - Song not found:', songId);
      return res.status(404).json({ message: 'Пісню не знайдено' });
    }

    // Check if section exists (if provided)
    if (normalizedSectionId) {
      const section = songbook.sections.id(normalizedSectionId);
      if (!section) {
        return res.status(404).json({ message: 'Розділ не знайдено' });
      }
    }

    console.log('AddSong - About to add song:', {
      songId: songId,
      songTitle: song.title,
      normalizedSectionId: normalizedSectionId,
      userId: req.user._id
    });

    await songbook.addSong(songId, normalizedSectionId, req.user._id);

    console.log('AddSong - Successfully added song');

    res.json({
      message: 'Пісню додано до співаника',
      songbook: await songbook.populate('songs.song', 'title author')
    });

  } catch (error) {
    if (error.message === 'Пісня вже додана до співаника') {
      return res.status(400).json({ message: error.message });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID' });
    }
    
    console.error('Add song to songbook error:', error);
    res.status(500).json({ message: 'Внутрішня помилка сервера при додаванні пісні' });
  }
});

// DELETE /api/songbooks/:id/songs/:songId - Remove song from songbook
router.delete('/:id/songs/:songId', auth, async (req, res) => {
  try {
    const songbook = await Songbook.findById(req.params.id);
    if (!songbook || !songbook.isActive) {
      return res.status(404).json({ message: 'Співаник не знайдено' });
    }

    // Check permissions
    const access = songbook.canAccess(req.user);
    if (!access.canAccess || access.permissions !== 'edit') {
      return res.status(403).json({ message: 'Недостатньо прав для редагування' });
    }

    await songbook.removeSong(req.params.songId);

    res.json({
      message: 'Пісню видалено зі співаника',
      songbook: await songbook.populate('songs.song', 'title author')
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID' });
    }
    
    console.error('Remove song from songbook error:', error);
    res.status(500).json({ message: 'Помилка видалення пісні' });
  }
});

// POST /api/songbooks/:id/sections - Add section to songbook
router.post('/:id/sections', [
  auth,
  body('name').notEmpty().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const { name, description } = req.body;

    const songbook = await Songbook.findById(req.params.id);
    if (!songbook || !songbook.isActive) {
      return res.status(404).json({ message: 'Співаник не знайдено' });
    }

    // Check permissions
    if (songbook.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Доступ заборонено' });
    }

    await songbook.addSection(name, description);

    res.json({
      message: 'Розділ додано',
      songbook
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID співаника' });
    }
    
    console.error('Add section error:', error);
    res.status(500).json({ message: 'Помилка додавання розділу' });
  }
});

// DELETE /api/songbooks/:id/sections/:sectionId - Remove section from songbook
router.delete('/:id/sections/:sectionId', auth, async (req, res) => {
  try {
    const songbook = await Songbook.findById(req.params.id);
    if (!songbook || !songbook.isActive) {
      return res.status(404).json({ message: 'Співаник не знайдено' });
    }

    // Check permissions
    if (songbook.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Доступ заборонено' });
    }

    await songbook.removeSection(req.params.sectionId);

    res.json({
      message: 'Розділ видалено',
      songbook
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID' });
    }
    
    console.error('Remove section error:', error);
    res.status(500).json({ message: 'Помилка видалення розділу' });
  }
});

// POST /api/songbooks/:id/share - Share songbook
router.post('/:id/share', [
  auth,
  body('email').isEmail().normalizeEmail(),
  body('permissions').optional().isIn(['view', 'edit'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const { email, permissions = 'view' } = req.body;

    const songbook = await Songbook.findById(req.params.id);
    if (!songbook || !songbook.isActive) {
      return res.status(404).json({ message: 'Співаник не знайдено' });
    }

    // Check permissions
    if (songbook.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Доступ заборонено' });
    }

    // Can't share with yourself
    if (email === req.user.email) {
      return res.status(400).json({ message: 'Не можна поділитися з собою' });
    }

    await songbook.shareWith(email, permissions);

    res.json({
      message: `Співаник поділено з ${email}`,
      songbook
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID співаника' });
    }
    
    console.error('Share songbook error:', error);
    res.status(500).json({ message: 'Помилка поділення співаника' });
  }
});

// DELETE /api/songbooks/:id/share/:email - Unshare songbook
router.delete('/:id/share/:email', auth, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);

    const songbook = await Songbook.findById(req.params.id);
    if (!songbook || !songbook.isActive) {
      return res.status(404).json({ message: 'Співаник не знайдено' });
    }

    // Check permissions
    if (songbook.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Доступ заборонено' });
    }

    await songbook.unshareWith(email);

    res.json({
      message: `Доступ для ${email} скасовано`,
      songbook
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID співаника' });
    }
    
    console.error('Unshare songbook error:', error);
    res.status(500).json({ message: 'Помилка скасування доступу' });
  }
});

// GET /api/songbooks/:id/available-songs - Get songs available to add to songbook
router.get('/:id/available-songs', [
  auth,
  query('search').optional().isString(),
  query('category').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('skip').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const songbook = await Songbook.findById(req.params.id);
    if (!songbook || !songbook.isActive) {
      return res.status(404).json({ message: 'Співаник не знайдено' });
    }

    // Check permissions
    const access = songbook.canAccess(req.user);
    console.log('GetAvailableSongs - Access check:', {
      songbookId: songbook._id,
      songbookTitle: songbook.title,
      songbookOwner: songbook.owner,
      songbookPrivacy: songbook.privacy,
      userId: req.user._id,
      userEmail: req.user.email,
      access: access
    });
    
    if (!access.canAccess || access.permissions !== 'edit') {
      console.log('GetAvailableSongs - Permission denied:', { access, required: 'edit' });
      return res.status(403).json({ message: 'Недостатньо прав для редагування' });
    }

    const {
      search = '',
      category = '',
      limit = 20,
      skip = 0
    } = req.query;

    // Get IDs of songs already in songbook
    const existingSongIds = songbook.songs.map(s => s.song.toString());

    // Build query for available songs
    let query = {
      _id: { $nin: existingSongIds }
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    const songs = await Song.find(query)
      .select('title author category youtubeUrl metadata')
      .sort({ title: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Song.countDocuments(query);

    console.log('GetAvailableSongs - Query result:', {
      query: query,
      songsFound: songs.length,
      totalAvailable: total,
      existingSongIds: existingSongIds.length
    });

    res.json({
      songs,
      total,
      hasMore: skip + songs.length < total
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID співаника' });
    }
    
    console.error('Get available songs error:', error);
    res.status(500).json({ message: 'Помилка отримання доступних пісень' });
  }
});

module.exports = router;