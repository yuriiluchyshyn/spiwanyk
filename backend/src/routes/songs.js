const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Song = require('../models/Song');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/songs - Get all songs with optional search and filters
router.get('/', [
  optionalAuth,
  query('q').optional().trim().isLength({ max: 100 }),
  query('category').optional().isString(),
  query('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  query('tags').optional().isString(),
  query('limit').optional().isInt({ min: 1 }),
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

    const {
      q: searchQuery,
      category,
      difficulty,
      tags,
      limit,
      skip = 0
    } = req.query;

    // Валідуємо категорію з бази даних (якщо передана)
    if (category) {
      const Category = require('../models/Category');
      const validCategory = await Category.findOne({ id: category });
      if (!validCategory) {
        return res.status(400).json({
          message: 'Невірна категорія',
          validCategories: (await Category.find({}).select('id name')).map(c => ({ id: c.id, name: c.name }))
        });
      }
    }

    const options = {
      category,
      difficulty,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      skip: parseInt(skip)
    };

    let songs;
    if (searchQuery) {
      songs = await Song.search(searchQuery, options);
    } else {
      // Get songs with virtual properties included - don't use .select() to preserve structure field
      let query = Song.find({ isPublic: true }).sort({ createdAt: -1 });
      
      // Застосовуємо фільтри
      if (category) query = query.where('category', category);
      if (difficulty) query = query.where('difficulty', difficulty);
      if (options.tags && options.tags.length > 0) query = query.where('tags').in(options.tags);
      
      // Застосовуємо пагінацію тільки якщо є ліміт
      if (options.skip > 0) query = query.skip(options.skip);
      if (options.limit) query = query.limit(options.limit);
      
      songs = await query;
    }

    res.json({
      songs,
      total: songs.length,
      hasMore: songs.length === options.limit
    });

  } catch (error) {
    console.error('Get songs error:', error);
    res.status(500).json({ message: 'Помилка отримання пісень' });
  }
});

// GET /api/songs/popular - Get popular songs
router.get('/popular', [
  query('limit').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    
    const songs = await Song.getPopular(limit);
    
    res.json({
      songs,
      message: `${limit ? `Топ ${limit}` : 'Всі'} популярні пісні`
    });

  } catch (error) {
    console.error('Get popular songs error:', error);
    res.status(500).json({ message: 'Помилка отримання популярних пісень' });
  }
});

// GET /api/songs/search - Search songs (alternative endpoint)
router.get('/search', [
  query('q').notEmpty().trim().isLength({ min: 1, max: 100 }),
  query('limit').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const { q: searchQuery, limit } = req.query;
    
    const songs = await Song.search(searchQuery, { limit: limit ? parseInt(limit) : undefined });
    
    res.json({
      songs,
      query: searchQuery,
      total: songs.length
    });

  } catch (error) {
    console.error('Search songs error:', error);
    res.status(500).json({ message: 'Помилка пошуку пісень' });
  }
});

// GET /api/songs/categories - Get available categories (public, from DB)
router.get('/categories', async (req, res) => {
  try {
    const Category = require('../models/Category');
    let categories = await Category.find({}).sort({ order: 1 });

    // Fallback дефолтні якщо база порожня
    if (categories.length === 0) {
      categories = [
        { id: 'author', name: 'АВТОРСЬКІ ПІСНІ', icon: '🎵', color: '#8B4513' },
        { id: 'plast', name: 'ПЛАСТОВІ ПІСНІ', icon: '🔱', color: '#D2691E' },
        { id: 'uprising', name: 'ПОВСТАНСЬКІ ПІСНІ', icon: '🎩', color: '#8B7355' },
        { id: 'cossack', name: 'КОЗАЦЬКІ ПІСНІ', icon: '⚔️', color: '#654321' },
        { id: 'lemko', name: 'ЛЕМКІВСЬКІ ПІСНІ', icon: '🏔️', color: '#228B22' },
        { id: 'folk', name: 'НАРОДНІ ПІСНІ', icon: '🌾', color: '#6B8E23' },
        { id: 'christmas', name: 'НОВАЦЬКІ ПІСНІ', icon: '🔥', color: '#2F4F4F' },
        { id: 'carols', name: 'КОЛЯДКИ / ЩЕДРІВКИ', icon: '⭐', color: '#B22222' },
        { id: 'hymns', name: 'ГІМНИ / МОЛИТВИ', icon: '🇺🇦', color: '#4682B4' }
      ];
    }

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Помилка отримання категорій' });
  }
});

// GET /api/songs/meta/categories - Legacy endpoint
router.get('/meta/categories', (req, res) => {
  const categories = [
    { value: 'patriotic', label: 'Патріотичні' },
    { value: 'camp', label: 'Табірні' },
    { value: 'religious', label: 'Релігійні' },
    { value: 'folk', label: 'Народні' },
    { value: 'modern', label: 'Сучасні' },
    { value: 'other', label: 'Інші' }
  ];

  res.json({ categories });
});

// ============================================================
// HIDDEN ADMIN ENDPOINTS (before /:id to avoid route conflicts)
// ============================================================
const fs = require('fs').promises;
const path = require('path');
const User = require('../models/User');
const Category = require('../models/Category');

// Helper: перевірка секретного ключа (вимкнено — відкритий доступ)
function checkAdminSecret(req) {
  return true;
}

// GET /api/songs/admin/categories - отримати всі категорії
router.get('/admin/categories', async (req, res) => {
  try {
    let categories = await Category.find({}).sort({ order: 1 });

    // Якщо в базі нема категорій — створюємо дефолтні
    if (categories.length === 0) {
      const defaults = [
        { id: 'author', name: 'АВТОРСЬКІ ПІСНІ', icon: '🎵', color: '#8B4513', order: 0 },
        { id: 'plast', name: 'ПЛАСТОВІ ПІСНІ', icon: '🔱', color: '#D2691E', order: 1 },
        { id: 'uprising', name: 'ПОВСТАНСЬКІ ПІСНІ', icon: '🎩', color: '#8B7355', order: 2 },
        { id: 'cossack', name: 'КОЗАЦЬКІ ПІСНІ', icon: '⚔️', color: '#654321', order: 3 },
        { id: 'lemko', name: 'ЛЕМКІВСЬКІ ПІСНІ', icon: '🏔️', color: '#228B22', order: 4 },
        { id: 'folk', name: 'НАРОДНІ ПІСНІ', icon: '🌾', color: '#6B8E23', order: 5 },
        { id: 'christmas', name: 'НОВАЦЬКІ ПІСНІ', icon: '🔥', color: '#2F4F4F', order: 6 },
        { id: 'carols', name: 'КОЛЯДКИ / ЩЕДРІВКИ', icon: '⭐', color: '#B22222', order: 7 },
        { id: 'hymns', name: 'ГІМНИ / МОЛИТВИ', icon: '🇺🇦', color: '#4682B4', order: 8 }
      ];
      categories = await Category.insertMany(defaults);
    }

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Помилка отримання категорій', error: error.message });
  }
});

// POST /api/songs/admin/categories - створити нову категорію
router.post('/admin/categories', async (req, res) => {
  try {
    const { id, name, icon, color } = req.body;
    if (!id || !name) {
      return res.status(400).json({ message: 'id та name обовʼязкові' });
    }

    const maxOrder = await Category.findOne({}).sort({ order: -1 });
    const order = maxOrder ? maxOrder.order + 1 : 0;

    const category = new Category({ id: id.toLowerCase(), name, icon: icon || '🎵', color: color || '#8B4513', order });
    await category.save();

    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Категорія з таким id вже існує' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Помилка створення категорії', error: error.message });
  }
});

// PUT /api/songs/admin/categories/:categoryId - оновити категорію
router.put('/admin/categories/:categoryId', async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    const category = await Category.findOne({ id: req.params.categoryId });

    if (!category) {
      return res.status(404).json({ message: 'Категорію не знайдено' });
    }

    if (name) category.name = name;
    if (icon) category.icon = icon;
    if (color) category.color = color;

    await category.save();
    res.json({ category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Помилка оновлення категорії', error: error.message });
  }
});

// DELETE /api/songs/admin/categories/:categoryId - видалити категорію
router.delete('/admin/categories/:categoryId', async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ id: req.params.categoryId });
    if (!category) {
      return res.status(404).json({ message: 'Категорію не знайдено' });
    }

    // Кількість пісень цієї категорії
    const songCount = await Song.countDocuments({ category: req.params.categoryId });

    res.json({ message: 'Категорію видалено', deletedCategory: category.name, affectedSongs: songCount });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Помилка видалення категорії', error: error.message });
  }
});

// GET /api/songs/admin/list - список пісень для адмін-панелі
router.get('/admin/list', async (req, res) => {
  try {
    if (!checkAdminSecret(req)) {
      return res.status(404).json({ message: 'Маршрут не знайдено' });
    }

    const songs = await Song.find({})
      .select('title author category createdAt tags')
      .sort({ createdAt: -1 });

    res.json({ songs, total: songs.length });
  } catch (error) {
    console.error('Admin list songs error:', error);
    res.status(500).json({ message: 'Помилка отримання списку', error: error.message });
  }
});

// POST /api/songs/import-from-json - імпорт пісень
router.post('/import-from-json', async (req, res) => {
  try {
    if (!checkAdminSecret(req)) {
      return res.status(404).json({ message: 'Маршрут не знайдено' });
    }

    let data;

    // Якщо прийшов JSON body з піснями — використовуємо його
    if (req.body && req.body.songs && Array.isArray(req.body.songs)) {
      data = req.body;
    } else {
      // Fallback: читаємо з файлу latest-songs.json
      const jsonPath = path.join(__dirname, '../../data/latest-songs.json');
      const jsonData = await fs.readFile(jsonPath, 'utf8');
      data = JSON.parse(jsonData);
    }

    if (!data.songs || !Array.isArray(data.songs)) {
      return res.status(400).json({ message: 'Невірний формат JSON файлу' });
    }

    // Знаходимо або створюємо користувача для імпорту
    let importUser = await User.findOne({ email: 'import@plast.org' });
    if (!importUser) {
      importUser = new User({
        email: 'import@plast.org',
        name: 'JSON Import User'
      });
      await importUser.save();
    }

    const categoryMap = {
      'author': 'author',
      'plast': 'plast',
      'uprising': 'uprising',
      'folk': 'folk',
      'lemko': 'lemko',
      'christmas': 'christmas'
    };

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const songData of data.songs) {
      try {
        const existingSong = await Song.findOne({ title: songData.title });
        if (existingSong) {
          skipped++;
          continue;
        }

        const structure = (songData.structure || []).map(section => ({
          type: section.type,
          number: section.number,
          repeat: section.repeat || 1,
          lines: (section.lines || []).map(line => ({
            text: line.text,
            chordPositions: (line.chordPositions || line.chords || []).map(chord => ({
              chord: chord.chord,
              charIndex: chord.charIndex != null ? chord.charIndex : (chord.position != null ? chord.position : 0)
            })),
            isChorus: line.metadata?.isChorus || false
          }))
        }));

        const lyrics = structure.map(section => {
          const sectionTitle = section.type === 'chorus' ? 'Приспів:' : `Куплет ${section.number}:`;
          const lines = section.lines.map(line => line.text).join('\n');
          return `${sectionTitle}\n${lines}`;
        }).join('\n\n');

        const newSong = new Song({
          title: songData.title || 'Без назви',
          author: songData.author || 'Невідомий',
          lyrics: lyrics,
          chords: '',
          structure: structure,
          youtubeUrl: songData.youtubeUrl || '',
          category: categoryMap[songData.category] || 'folk',
          tags: [songData.category, 'imported', 'structured'].filter(Boolean),
          isPublic: true,
          createdBy: importUser._id,
          sourceUrl: songData.url || '',
          metadata: {
            words: songData.metadata?.words || '',
            music: songData.metadata?.music || '',
            performer: songData.metadata?.performer || ''
          }
        });

        await newSong.save();
        imported++;
      } catch (err) {
        errors.push({ title: songData.title, error: err.message });
      }
    }

    const totalInDb = await Song.countDocuments();

    res.json({
      message: 'Імпорт завершено',
      results: {
        totalInFile: data.songs.length,
        imported,
        skipped,
        errors: errors.length,
        totalInDatabase: totalInDb
      },
      ...(errors.length > 0 && { errors })
    });

  } catch (error) {
    console.error('Import from JSON error:', error);
    res.status(500).json({ message: 'Помилка імпорту', error: error.message });
  }
});

// DELETE /api/songs/admin/all - видалити ВСІ пісні
router.delete('/admin/all', async (req, res) => {
  try {
    if (!checkAdminSecret(req)) {
      return res.status(404).json({ message: 'Маршрут не знайдено' });
    }

    const result = await Song.deleteMany({});
    res.json({ message: 'Всі пісні видалено', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Delete all songs error:', error);
    res.status(500).json({ message: 'Помилка видалення', error: error.message });
  }
});

// DELETE /api/songs/admin/:id - видалити одну пісню (без перевірки прав)
router.delete('/admin/:id', async (req, res) => {
  try {
    if (!checkAdminSecret(req)) {
      return res.status(404).json({ message: 'Маршрут не знайдено' });
    }

    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Пісню не знайдено' });
    }

    res.json({ message: 'Пісню видалено', song: { id: song._id, title: song.title } });
  } catch (error) {
    console.error('Admin delete song error:', error);
    res.status(500).json({ message: 'Помилка видалення', error: error.message });
  }
});

// ============================================================
// END ADMIN ENDPOINTS
// ============================================================

// GET /api/songs/:id - Get song by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('createdBy', 'email');

    if (!song) {
      return res.status(404).json({ message: 'Пісню не знайдено' });
    }

    if (!song.isPublic && (!req.user || song.createdBy._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Доступ заборонено' });
    }

    // Increment play count (async, don't wait)
    song.incrementPlayCount().catch(err => 
      console.error('Error incrementing play count:', err)
    );

    res.json({ song });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID пісні' });
    }
    
    console.error('Get song error:', error);
    res.status(500).json({ message: 'Помилка отримання пісні' });
  }
});

// POST /api/songs - Create new song (authenticated users only)
router.post('/', [
  auth,
  body('title').notEmpty().trim().isLength({ min: 1, max: 200 }),
  body('author').optional().trim().isLength({ max: 100 }),
  body('lyrics').optional().trim(),
  body('chords').optional().trim(),
  body('notes').optional().trim().isURL(),
  body('youtubeUrl').optional().trim().matches(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)/),
  body('category').optional().isIn(['patriotic', 'camp', 'religious', 'folk', 'modern', 'other']),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const songData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Clean tags
    if (songData.tags) {
      songData.tags = songData.tags
        .filter(tag => tag && tag.trim())
        .map(tag => tag.trim().toLowerCase());
    }

    const song = new Song(songData);
    await song.save();

    await song.populate('createdBy', 'email');

    res.status(201).json({
      message: 'Пісню створено',
      song
    });

  } catch (error) {
    console.error('Create song error:', error);
    res.status(500).json({ message: 'Помилка створення пісні' });
  }
});

// PUT /api/songs/:id - Update song
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('author').optional().trim().isLength({ max: 100 }),
  body('lyrics').optional().trim(),
  body('chords').optional().trim(),
  body('notes').optional().trim(),
  body('youtubeUrl').optional().trim().matches(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)/),
  body('category').optional().isIn(['patriotic', 'camp', 'religious', 'folk', 'modern', 'other']),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({ message: 'Пісню не знайдено' });
    }

    // Check permissions
    if (song.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Доступ заборонено' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        song[key] = req.body[key];
      }
    });

    // Clean tags
    if (req.body.tags) {
      song.tags = req.body.tags
        .filter(tag => tag && tag.trim())
        .map(tag => tag.trim().toLowerCase());
    }

    await song.save();
    await song.populate('createdBy', 'email');

    res.json({
      message: 'Пісню оновлено',
      song
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID пісні' });
    }
    
    console.error('Update song error:', error);
    res.status(500).json({ message: 'Помилка оновлення пісні' });
  }
});

// DELETE /api/songs/:id - Delete song
router.delete('/:id', auth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({ message: 'Пісню не знайдено' });
    }

    // Check permissions
    if (song.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Доступ заборонено' });
    }

    await Song.findByIdAndDelete(req.params.id);

    res.json({ message: 'Пісню видалено' });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Невірний ID пісні' });
    }
    
    console.error('Delete song error:', error);
    res.status(500).json({ message: 'Помилка видалення пісні' });
  }
});

module.exports = router;