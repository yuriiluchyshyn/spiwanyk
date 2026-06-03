const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Song = require('../models/Song');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/songs - Get all songs with optional search and filters
router.get('/', [
  optionalAuth,
  query('q').optional().trim().isLength({ max: 100 }),
  query('category').optional().isIn(['patriotic', 'camp', 'religious', 'folk', 'modern', 'other']),
  query('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  query('tags').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
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
      limit = 20,
      skip = 0
    } = req.query;

    const options = {
      category,
      difficulty,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
      limit: parseInt(limit),
      skip: parseInt(skip)
    };

    let songs;
    if (searchQuery) {
      songs = await Song.search(searchQuery, options);
    } else {
      // Get songs with virtual properties included - don't use .select() to preserve structure field
      songs = await Song.find({ isPublic: true })
        .sort({ createdAt: -1 })
        .limit(options.limit)
        .skip(options.skip);
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
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const songs = await Song.getPopular(limit);
    
    res.json({
      songs,
      message: `Топ ${songs.length} популярних пісень`
    });

  } catch (error) {
    console.error('Get popular songs error:', error);
    res.status(500).json({ message: 'Помилка отримання популярних пісень' });
  }
});

// GET /api/songs/search - Search songs (alternative endpoint)
router.get('/search', [
  query('q').notEmpty().trim().isLength({ min: 1, max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const { q: searchQuery, limit = 20 } = req.query;
    
    const songs = await Song.search(searchQuery, { limit: parseInt(limit) });
    
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

// GET /api/songs/categories - Get available categories
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

// Helper: перевірка секретного ключа (вимкнено — відкритий доступ)
function checkAdminSecret(req) {
  return true;
}

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

    // Читаємо JSON файл
    const jsonPath = path.join(__dirname, '../../data/latest-songs.json');
    const jsonData = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(jsonData);

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