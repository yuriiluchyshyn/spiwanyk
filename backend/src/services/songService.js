const mongoose = require('mongoose');
const Song = require('../models/Song');
const Category = require('../models/Category');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Song business logic: listing/searching, retrieval with access control and
 * authored CRUD. Owns the query-building that used to live in the route.
 */

const assertValidId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Невірний ID пісні');
  }
};

const cleanTags = (tags) =>
  tags
    .filter((tag) => tag && tag.trim())
    .map((tag) => tag.trim().toLowerCase());

/**
 * List public songs with optional full-text search, filtering and pagination.
 * When a category is supplied it must exist in the DB.
 */
const listSongs = async (params) => {
  const { q: searchQuery, category, difficulty, tags, limit, skip = 0 } = params;

  if (category) {
    const validCategory = await Category.findOne({ id: category });
    if (!validCategory) {
      const validCategories = (await Category.find({}).select('id name')).map((c) => ({
        id: c.id,
        name: c.name
      }));
      throw ApiError.badRequest('Невірна категорія', { validCategories });
    }
  }

  const options = {
    category,
    difficulty,
    tags: tags ? tags.split(',').map((tag) => tag.trim()) : undefined,
    limit: limit ? parseInt(limit) : undefined,
    skip: parseInt(skip)
  };

  let songs;
  if (searchQuery) {
    songs = await Song.search(searchQuery, options);
  } else {
    // Preserve the full document (incl. the `structure` virtual) by not using
    // .select() here.
    let query = Song.find({ isPublic: true }).sort({ createdAt: -1 });

    if (category) query = query.where('category', category);
    if (difficulty) query = query.where('difficulty', difficulty);
    if (options.tags && options.tags.length > 0) query = query.where('tags').in(options.tags);

    if (options.skip > 0) query = query.skip(options.skip);
    if (options.limit) query = query.limit(options.limit);

    songs = await query;
  }

  return {
    songs,
    total: songs.length,
    hasMore: songs.length === options.limit
  };
};

const getPopular = (limit) => Song.getPopular(limit);

const search = (searchQuery, limit) => Song.search(searchQuery, { limit });

/**
 * Fetch a single song, enforcing visibility rules for private songs, and
 * fire-and-forget increment its play count.
 */
const getById = async (id, user) => {
  assertValidId(id);

  const song = await Song.findById(id).populate('createdBy', 'email');
  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }

  const isOwner = user && song.createdBy && song.createdBy._id.toString() === user._id.toString();
  if (!song.isPublic && !isOwner) {
    throw ApiError.forbidden();
  }

  song
    .incrementPlayCount()
    .catch((err) => console.error('Error incrementing play count:', err));

  return song;
};

const create = async (body, userId) => {
  const songData = { ...body, createdBy: userId };
  if (songData.tags) {
    songData.tags = cleanTags(songData.tags);
  }

  const song = new Song(songData);
  await song.save();
  await song.populate('createdBy', 'email');
  return song;
};

const update = async (id, body, userId) => {
  assertValidId(id);

  const song = await Song.findById(id);
  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }

  if (song.createdBy.toString() !== userId.toString()) {
    throw ApiError.forbidden();
  }

  Object.keys(body).forEach((key) => {
    if (body[key] !== undefined) {
      song[key] = body[key];
    }
  });

  if (body.tags) {
    song.tags = cleanTags(body.tags);
  }

  await song.save();
  await song.populate('createdBy', 'email');
  return song;
};

const remove = async (id, userId) => {
  assertValidId(id);

  const song = await Song.findById(id);
  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }

  if (song.createdBy.toString() !== userId.toString()) {
    throw ApiError.forbidden();
  }

  await Song.findByIdAndDelete(id);
};

/**
 * Admin: lightweight list of every song for the management panel.
 *
 * We additionally need to know whether each song has chords. That info lives in
 * the `chords` string or in `structure[].lines[].chordPositions`, so we fetch
 * those fields to evaluate the `hasChords` virtual — but we DON'T ship the heavy
 * `structure` back to the client, only a boolean flag alongside the light fields.
 */
const adminList = async () => {
  const songs = await Song.find({})
    .select('title author category createdAt tags chords structure')
    .sort({ createdAt: -1 });

  return songs.map((s) => ({
    _id: s._id,
    title: s.title,
    author: s.author,
    category: s.category,
    createdAt: s.createdAt,
    tags: s.tags,
    hasChords: s.hasChords // virtual computed from chords/structure
  }));
};

/**
 * Admin: wipe the whole collection. Returns the number of removed documents.
 */
const adminDeleteAll = async () => {
  const result = await Song.deleteMany({});
  return result.deletedCount;
};

/**
 * Admin: delete a single song by id without ownership checks.
 */
const adminDeleteById = async (id) => {
  assertValidId(id);
  const song = await Song.findByIdAndDelete(id);
  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }
  return { id: song._id, title: song.title };
};

/**
 * Admin: move a song to a different category (folder) without ownership checks.
 * Validates that the target category exists.
 */
const adminUpdateCategory = async (id, category) => {
  assertValidId(id);
  if (!category) {
    throw ApiError.badRequest('category обовʼязковий');
  }

  const validCategory = await Category.findOne({ id: category });
  if (!validCategory) {
    throw ApiError.badRequest('Невірна категорія');
  }

  const song = await Song.findByIdAndUpdate(
    id,
    { category },
    { new: true }
  ).select('title category');

  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }
  return { id: song._id, title: song.title, category: song.category };
};

// --- Admin song content editing (lyrics + positional chords) ---

/**
 * Плоский текст пісні з структури — щоб пошук за словами працював навіть коли
 * пісня редагується через структурований редактор. Дзеркалить логіку імпорту.
 */
const buildLyricsFromStructure = (structure = []) =>
  structure
    .map((section) => {
      const title = section.type === 'chorus' ? 'Приспів:' : `Куплет ${section.number || 1}:`;
      const lines = (section.lines || []).map((line) => line.text || '').join('\n');
      return `${title}\n${lines}`;
    })
    .join('\n\n');

// Власник для пісень, створених/відредагованих через адмінку (той самий, що й
// для імпортованих пісень).
const getOrCreateAdminOwner = async () => {
  let user = await User.findOne({ email: 'import@plast.org' });
  if (!user) {
    user = await User.create({ email: 'import@plast.org' });
  }
  return user;
};

const assertCategoryExists = async (category) => {
  if (category === undefined) return;
  if (!category) return; // порожнє — не чіпаємо
  const exists = await Category.findOne({ id: category });
  if (!exists) {
    throw ApiError.badRequest('Невірна категорія');
  }
};

// Поля, які адмін може задавати. structure зберігається дослівно, тому позиції
// акордів (charIndex) не зміщуються після збереження.
const ADMIN_SONG_FIELDS = [
  'title',
  'author',
  'category',
  'youtubeUrl',
  'notes',
  'difficulty',
  'isPublic',
  'structure',
  'chords'
];

const applyAdminSongFields = (song, body) => {
  ADMIN_SONG_FIELDS.forEach((key) => {
    if (body[key] !== undefined) {
      song[key] = body[key];
    }
  });

  if (Array.isArray(body.tags)) {
    song.tags = cleanTags(body.tags);
  }

  // Тримаємо lyrics синхронізованим зі структурою (для пошуку).
  if (body.structure !== undefined) {
    song.lyrics = buildLyricsFromStructure(body.structure);
  } else if (body.lyrics !== undefined) {
    song.lyrics = body.lyrics;
  }
};

/**
 * Admin: повна пісня за id (без інкременту переглядів і перевірки прав).
 */
const adminGetById = async (id) => {
  assertValidId(id);
  const song = await Song.findById(id);
  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }
  return song;
};

/**
 * Admin: створити пісню (зі структурою/акордами або без).
 */
const adminCreate = async (body) => {
  if (!body.title || !body.title.trim()) {
    throw ApiError.badRequest('Назва пісні обовʼязкова');
  }
  await assertCategoryExists(body.category);

  const owner = await getOrCreateAdminOwner();
  const song = new Song({ createdBy: owner._id });
  applyAdminSongFields(song, body);

  await song.save();
  return song;
};

/**
 * Admin: оновити пісню без перевірки власника. Зберігає structure дослівно.
 */
const adminUpdate = async (id, body) => {
  assertValidId(id);
  await assertCategoryExists(body.category);

  const song = await Song.findById(id);
  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }

  applyAdminSongFields(song, body);
  await song.save();
  return song;
};

module.exports = {
  listSongs,
  getPopular,
  search,
  getById,
  create,
  update,
  remove,
  adminList,
  adminDeleteAll,
  adminDeleteById,
  adminUpdateCategory,
  adminGetById,
  adminCreate,
  adminUpdate
};
