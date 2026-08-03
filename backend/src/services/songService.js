const mongoose = require('mongoose');
const Song = require('../models/Song');
const Category = require('../models/Category');
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
 */
const adminList = () =>
  Song.find({}).select('title author category createdAt tags').sort({ createdAt: -1 });

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
  adminDeleteById
};
