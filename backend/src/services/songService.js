const mongoose = require('mongoose');
const Song = require('../models/Song');
const Category = require('../models/Category');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const categoryService = require('./categoryService');

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
 * Visibility filter for the songs catalogue:
 *  - anonymous: only global public songs (owner-less, isPublic);
 *  - authenticated: global public songs PLUS the user's own private songs.
 * Private songs of other users never appear in the catalogue (they surface only
 * inside a shared songbook).
 */
const visibilityFilter = (user) =>
  user
    ? { $or: [{ isPublic: true, owner: null }, { owner: user._id }] }
    : { isPublic: true, owner: null };

/**
 * List public songs with optional full-text search, filtering and pagination.
 * When a category is supplied it must exist in the DB.
 */
const listSongs = async (params, user) => {
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

  const parsedLimit = limit ? parseInt(limit) : undefined;
  const parsedSkip = parseInt(skip);
  const tagList = tags ? tags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined;

  // Visibility: public global songs + (for a logged-in user) their own private
  // songs. Preserve the full document (incl. the `structure` virtual).
  const filter = { ...visibilityFilter(user) };

  if (searchQuery && searchQuery.trim()) {
    const regex = new RegExp(searchQuery.trim(), 'i');
    filter.$and = [{ $or: [{ title: regex }, { lyrics: regex }, { author: regex }] }];
  }
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;
  if (tagList && tagList.length > 0) filter.tags = { $in: tagList };

  let query = Song.find(filter).sort({ createdAt: -1 });
  if (parsedSkip > 0) query = query.skip(parsedSkip);
  if (parsedLimit) query = query.limit(parsedLimit);

  const songs = await query;

  return {
    songs,
    total: songs.length,
    hasMore: parsedLimit ? songs.length === parsedLimit : false
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
    .select('title author category createdAt tags chords structure createdBy owner isPublic')
    .populate('createdBy', 'email')
    .sort({ createdAt: -1 });

  return songs.map((s) => ({
    _id: s._id,
    title: s.title,
    author: s.author,
    category: s.category,
    createdAt: s.createdAt,
    tags: s.tags,
    hasChords: s.hasChords, // virtual computed from chords/structure
    createdBy: s.createdBy ? s.createdBy.email : null, // хто додав пісню
    owner: s.owner || null, // null → глобальна пісня
    isPublic: s.isPublic
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
 * Admin: delete all songs that belong to any of the given category ids.
 * Returns the number of removed documents.
 */
const adminDeleteByCategories = async (categoryIds) => {
  const ids = (Array.isArray(categoryIds) ? categoryIds : [])
    .map((c) => String(c).trim())
    .filter(Boolean);
  if (ids.length === 0) {
    throw ApiError.badRequest('Не вказано жодного розділу');
  }
  const result = await Song.deleteMany({ category: { $in: ids } });
  return result.deletedCount;
};

/**
 * Admin: delete a set of songs by their ids. Returns the number removed.
 */
const adminDeleteByIds = async (songIds) => {
  const ids = (Array.isArray(songIds) ? songIds : [])
    .map((s) => String(s).trim())
    .filter(Boolean);
  if (ids.length === 0) {
    throw ApiError.badRequest('Не вказано жодної пісні');
  }
  const result = await Song.deleteMany({ _id: { $in: ids } });
  return result.deletedCount;
};

/**
 * Admin: move a set of songs (by ids) into another category.
 * Returns the number of updated documents.
 */
const adminSetCategoryForIds = async (songIds, category) => {
  const ids = (Array.isArray(songIds) ? songIds : [])
    .map((s) => String(s).trim())
    .filter(Boolean);
  if (ids.length === 0) {
    throw ApiError.badRequest('Не вказано жодної пісні');
  }
  if (!category || !String(category).trim()) {
    throw ApiError.badRequest('Не вказано розділ');
  }
  const result = await Song.updateMany(
    { _id: { $in: ids } },
    { category: String(category).trim() }
  );
  return result.modifiedCount;
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

/**
 * Admin: зберегти пісню в загальний (публічний) список, доступний усім.
 * Робить пісню глобальною (owner=null) та публічною (isPublic=true).
 * Розділ обовʼязковий: беремо переданий `category`, інакше поточний розділ
 * пісні. Якщо розділу немає — помилка (адмін має спочатку вибрати розділ).
 */
const adminPublish = async (id, category) => {
  assertValidId(id);

  const song = await Song.findById(id);
  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }

  const targetCategory =
    category !== undefined && category !== null && String(category).trim() !== ''
      ? category
      : song.category;

  if (!targetCategory) {
    throw ApiError.badRequest('Спочатку виберіть розділ для пісні');
  }
  await assertCategoryExists(targetCategory);

  song.category = targetCategory;
  song.owner = null;
  song.isPublic = true;
  await song.save();
  return song;
};

// --- User-owned (private) songs -------------------------------------------

// Resolve the target category for a user's private song: an existing global or
// own category id, or a freshly created private category (when `newCategory`
// is provided). Returns the category id string (or '' for none).
const resolveUserCategory = async (user, { category, newCategory }) => {
  if (newCategory && newCategory.name && newCategory.name.trim()) {
    const created = await categoryService.createUserCategory(user, newCategory);
    return created.id;
  }
  if (category) {
    const cat = await Category.findOne({
      id: category,
      $or: [{ owner: null }, { owner: user._id }]
    });
    if (!cat) {
      throw ApiError.badRequest('Невірна категорія');
    }
    return cat.id;
  }
  return '';
};

/**
 * Create a private song owned by the user. Visible to the user in the catalogue
 * and to anyone who can access a songbook it is added to, but never in other
 * users' catalogues.
 */
const createUserSong = async (user, body) => {
  if (!body.title || !body.title.trim()) {
    throw ApiError.badRequest('Назва пісні обовʼязкова');
  }

  const category = await resolveUserCategory(user, {
    category: body.category,
    newCategory: body.newCategory
  });

  const song = new Song({
    owner: user._id,
    createdBy: user._id,
    isPublic: false,
    title: body.title,
    author: body.author,
    category: category || undefined,
    youtubeUrl: body.youtubeUrl,
    structure: body.structure,
    chords: body.chords,
    difficulty: body.difficulty,
    tags: Array.isArray(body.tags) ? cleanTags(body.tags) : undefined,
    metadata: body.metadata
  });

  if (Array.isArray(body.structure) && body.structure.length > 0) {
    song.lyrics = buildLyricsFromStructure(body.structure);
  } else if (body.lyrics !== undefined) {
    song.lyrics = body.lyrics;
  }

  await song.save();
  return song;
};

/**
 * Update one of the user's own private songs (title, author, category, chords,
 * structure, youtube). Category may be an existing global/own one or a new one.
 */
const updateUserSong = async (user, id, body) => {
  assertValidId(id);
  const song = await Song.findOne({ _id: id, owner: user._id });
  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }

  if (body.title !== undefined) {
    if (!body.title.trim()) throw ApiError.badRequest('Назва пісні обовʼязкова');
    song.title = body.title;
  }
  if (body.author !== undefined) song.author = body.author;
  if (body.youtubeUrl !== undefined) song.youtubeUrl = body.youtubeUrl;
  if (body.chords !== undefined) song.chords = body.chords;

  if (body.structure !== undefined) {
    song.structure = body.structure;
    song.lyrics = buildLyricsFromStructure(body.structure);
  } else if (body.lyrics !== undefined) {
    song.lyrics = body.lyrics;
  }

  if (body.category !== undefined || body.newCategory) {
    song.category =
      (await resolveUserCategory(user, { category: body.category, newCategory: body.newCategory })) ||
      undefined;
  }

  await song.save();
  return song;
};

/**
 * Delete one of the user's own private songs.
 */
const deleteUserSong = async (user, id) => {
  assertValidId(id);
  const song = await Song.findOneAndDelete({ _id: id, owner: user._id });
  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }
  return { id: song._id, title: song.title };
};

/**
 * Copy an existing song (e.g. one seen inside a shared songbook) into the user's
 * own catalogue as a private song, under a chosen or newly created category.
 * Refuses to create a duplicate if the user already has a song with that title.
 */
const saveSongToMyCatalog = async (user, sourceSongId, { category, newCategory }) => {
  assertValidId(sourceSongId);

  const source = await Song.findById(sourceSongId);
  if (!source) {
    throw ApiError.notFound('Пісню не знайдено');
  }

  const existing = await Song.findOne({ owner: user._id, title: source.title });
  if (existing) {
    throw ApiError.badRequest('Така пісня вже є у ваших піснях');
  }

  const targetCategory = await resolveUserCategory(user, { category, newCategory });

  const copy = new Song({
    owner: user._id,
    createdBy: user._id,
    isPublic: false,
    title: source.title,
    author: source.author,
    lyrics: source.lyrics,
    chords: source.chords,
    notes: source.notes,
    structure: source.structure,
    youtubeUrl: source.youtubeUrl,
    category: targetCategory || undefined,
    metadata: source.metadata,
    difficulty: source.difficulty
  });

  await copy.save();
  return copy;
};

module.exports = {
  listSongs,
  getPopular,
  search,
  getById,
  create,
  createUserSong,
  updateUserSong,
  deleteUserSong,
  saveSongToMyCatalog,
  update,
  remove,
  adminList,
  adminDeleteAll,
  adminDeleteByCategories,
  adminDeleteByIds,
  adminSetCategoryForIds,
  adminDeleteById,
  adminUpdateCategory,
  adminGetById,
  adminCreate,
  adminUpdate,
  adminPublish
};
