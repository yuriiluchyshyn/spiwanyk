const User = require('../models/User');
const Songbook = require('../models/Songbook');
const ApiError = require('../utils/ApiError');

/**
 * Admin overview logic: read-only listings of registered users and of every
 * songbook created across the platform. Used by the hidden admin panel.
 */

/**
 * List all registered users with a count of songbooks each one owns.
 * Sorted by newest first.
 */
const listUsers = async () => {
  const users = await User.find({})
    .select('email createdAt lastLogin isActive')
    .sort({ createdAt: -1 })
    .lean();

  // Count songbooks per owner in a single aggregation.
  const counts = await Songbook.aggregate([
    { $group: { _id: '$owner', count: { $sum: 1 } } }
  ]);
  const countByOwner = new Map(counts.map((c) => [String(c._id), c.count]));

  return users.map((u) => ({
    _id: u._id,
    email: u.email,
    isActive: u.isActive,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
    songbookCount: countByOwner.get(String(u._id)) || 0
  }));
};

/**
 * List every songbook with its owner's email and lightweight metadata.
 * Sorted by newest first.
 */
const listSongbooks = async () => {
  const songbooks = await Songbook.find({})
    .populate('owner', 'email')
    .select('title privacy shareNearby songs sections owner createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();

  return songbooks.map((sb) => ({
    _id: sb._id,
    title: sb.title,
    ownerEmail: sb.owner?.email || '—',
    privacy: sb.privacy,
    shareNearby: !!sb.shareNearby,
    songCount: Array.isArray(sb.songs) ? sb.songs.length : 0,
    sectionCount: Array.isArray(sb.sections) ? sb.sections.length : 0,
    createdAt: sb.createdAt,
    updatedAt: sb.updatedAt
  }));
};

/**
 * Rename a songbook (admin, no ownership check). Returns light metadata for the
 * updated songbook so the admin list can refresh in place.
 */
const updateSongbookTitle = async (id, title) => {
  const trimmed = (title || '').trim();
  if (!trimmed) {
    throw ApiError.badRequest('Назва співаника обовʼязкова');
  }

  const songbook = await Songbook.findByIdAndUpdate(
    id,
    { title: trimmed },
    { new: true, runValidators: true }
  ).populate('owner', 'email');

  if (!songbook) {
    throw ApiError.notFound('Співаник не знайдено');
  }

  return {
    _id: songbook._id,
    title: songbook.title,
    ownerEmail: songbook.owner?.email || '—'
  };
};

module.exports = { listUsers, listSongbooks, updateSongbookTitle };
