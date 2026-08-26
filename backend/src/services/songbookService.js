const mongoose = require('mongoose');
const Songbook = require('../models/Songbook');
const Song = require('../models/Song');
const ApiError = require('../utils/ApiError');

/**
 * Songbook business logic: ownership/sharing access control, section & song
 * organisation and the presentation ordering that used to live in the route.
 * Rich domain operations (addSong, reorderSongs, canAccess, ...) remain on the
 * Songbook model; this layer orchestrates them and enforces permissions.
 */

const assertId = (id, message = 'Невірний ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest(message);
  }
};

// Load an active songbook or throw 404.
const loadActive = async (id, idMessage) => {
  assertId(id, idMessage);
  const songbook = await Songbook.findById(id);
  if (!songbook || !songbook.isActive) {
    throw ApiError.notFound('Співаник не знайдено');
  }
  return songbook;
};

const requireOwner = (songbook, user) => {
  if (songbook.owner.toString() !== user._id.toString()) {
    throw ApiError.forbidden();
  }
};

// Permission levels that allow modifying songbook content.
const EDIT_PERMISSIONS = ['edit', 'full'];

const requireEditAccess = (songbook, user) => {
  const access = songbook.canAccess(user);
  if (!access.canAccess || !EDIT_PERMISSIONS.includes(access.permissions)) {
    throw ApiError.forbidden('Недостатньо прав для редагування');
  }
  return access;
};

// "Full" rights: delete the songbook, manage sections and manage other users'
// access. The owner always has full rights (canAccess returns 'full' for them)
// and can never be restricted by anyone else.
const requireFullAccess = (songbook, user) => {
  const access = songbook.canAccess(user);
  if (!access.canAccess || access.permissions !== 'full') {
    throw ApiError.forbidden('Недостатньо прав для керування співаником');
  }
  return access;
};

const normalizeSectionId = (sectionId) =>
  sectionId && sectionId.toString().trim() ? sectionId : undefined;

const getMySongbooks = (userId) =>
  Songbook.find({ owner: userId, isActive: { $ne: false } })
    .populate('songs.song', 'title author')
    .sort({ lastAccessed: -1, createdAt: -1 });

// Songbooks other people shared directly with this user's email. Sharing is
// recorded by email (the invitee may not have existed yet), so we match on
// email and not on sharedWith.user.
const getSharedWithMe = (user) =>
  Songbook.find({
    isActive: { $ne: false },
    owner: { $ne: user._id },
    'sharedWith.email': user.email.toLowerCase()
  })
    .populate('owner', 'email')
    .populate('songs.song', 'title author')
    .sort({ lastAccessed: -1, createdAt: -1 });

const getPublicSongbooks = ({ limit = 20, skip = 0, tags }) =>
  Songbook.findPublic({
    limit: parseInt(limit),
    skip: parseInt(skip),
    tags: tags ? tags.split(',').map((tag) => tag.trim()) : undefined
  });

const getNearbySongbooks = ({ lat, lng, maxDistance = 500, maxAge }, userId) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const freshnessMinutes =
    maxAge !== undefined ? parseInt(maxAge) : Songbook.PRESENCE_WINDOW_MINUTES;

  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 getNearbySongbooks: lat=${latitude}, lng=${longitude}, maxDistance=${maxDistance}, userId=${userId}`);
  }

  return Songbook.findNearby(
    longitude,
    latitude,
    parseInt(maxDistance),
    userId,
    freshnessMinutes
  ).then((songbooks) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📚 findNearby returned ${songbooks.length} songbooks`);
    }
    return {
      songbooks,
      searchCenter: { latitude, longitude },
      maxDistance: parseInt(maxDistance),
      maxAge: freshnessMinutes
    };
  });
};

// Reorder a songbook's songs for presentation: sections alphabetically, songs
// within each section by manual `order` (falling back to title), no-section
// songs last.
const applyPresentationOrder = (songbook) => {
  songbook.sections.sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  const songsBySection = {};
  songbook.songs.forEach((songEntry) => {
    if (!songEntry.song) return;
    const sectionId = songEntry.section ? songEntry.section.toString() : 'no-section';
    if (!songsBySection[sectionId]) {
      songsBySection[sectionId] = [];
    }
    songsBySection[sectionId].push(songEntry);
  });

  Object.keys(songsBySection).forEach((sectionId) => {
    songsBySection[sectionId].sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      const titleA = a.song?.title || '';
      const titleB = b.song?.title || '';
      return titleA.localeCompare(titleB, 'uk');
    });
  });

  const sortedSongs = [];
  songbook.sections.forEach((section) => {
    sortedSongs.push(...(songsBySection[section._id.toString()] || []));
  });
  sortedSongs.push(...(songsBySection['no-section'] || []));

  songbook.songs = sortedSongs;
};

/**
 * Fetch a fully-populated songbook, enforce access rules for the (optional)
 * user and return it in presentation order.
 */
const getById = async (id, user) => {
  assertId(id, 'Невірний ID співаника');

  const songbook = await Songbook.findById(id)
    .populate('owner', 'email')
    .populate('songs.song', 'title author lyrics chords notes youtubeUrl category structure metadata')
    .populate('songs.addedBy', 'email');

  if (!songbook || !songbook.isActive) {
    throw ApiError.notFound('Співаник не знайдено');
  }

  // Drop dangling references to deleted songs.
  songbook.songs = songbook.songs.filter((s) => s.song !== null && s.song !== undefined);

  if (user) {
    const access = songbook.canAccess(user);
    if (!access.canAccess) {
      throw ApiError.forbidden();
    }
    songbook
      .incrementAccess()
      .catch((err) => console.error('Error incrementing access count:', err));
  } else if (songbook.privacy !== 'public') {
    throw ApiError.forbidden();
  }

  applyPresentationOrder(songbook);

  // Hide a stale "singing now" marker on open (response-only, not persisted).
  songbook.nowSinging = normalizeNowSinging(songbook.nowSinging);

  return songbook;
};

const cleanTags = (tags) =>
  tags.filter((tag) => tag && tag.trim()).map((tag) => tag.trim().toLowerCase());

const create = async (body, userId) => {
  const songbookData = { ...body, owner: userId };
  if (songbookData.tags) {
    songbookData.tags = cleanTags(songbookData.tags);
  }

  const songbook = new Songbook(songbookData);
  await songbook.save();
  await songbook.populate('owner', 'email');
  return songbook;
};

// Fields that must never be reassigned through a generic update, so a user
// with full access can manage everything except taking over ownership.
const PROTECTED_UPDATE_FIELDS = ['owner', '_id', 'accessCount'];

const update = async (id, body, user) => {
  const songbook = await loadActive(id, 'Невірний ID співаника');
  requireFullAccess(songbook, user);

  Object.keys(body).forEach((key) => {
    if (
      body[key] !== undefined &&
      key !== 'sharedWith' &&
      !PROTECTED_UPDATE_FIELDS.includes(key)
    ) {
      songbook[key] = body[key];
    }
  });

  if (body.tags) {
    songbook.tags = cleanTags(body.tags);
  }

  if (body.sharedWith !== undefined) {
    // The creator is identified by `owner` (id) and always resolves to full
    // access in canAccess(), so they can never be locked out via sharedWith.
    songbook.sharedWith = body.sharedWith
      .filter(
        (share) =>
          share.email &&
          typeof share.email === 'string' &&
          share.email.includes('@') &&
          ['view', 'edit', 'full'].includes(share.permissions)
      )
      .map((share) => ({
        email: share.email.toLowerCase().trim(),
        permissions: share.permissions,
        sharedAt: new Date()
      }));
  }

  await songbook.save();
  await songbook.populate('owner', 'email');
  return songbook;
};

// Soft delete: keep the document but flag it inactive.
// Owner and users with full rights can delete.
const remove = async (id, user) => {
  assertId(id, 'Невірний ID співаника');
  const songbook = await Songbook.findById(id);
  if (!songbook) {
    throw ApiError.notFound('Співаник не знайдено');
  }
  requireFullAccess(songbook, user);

  songbook.isActive = false;
  await songbook.save();
};

const addSong = async (id, { songId, sectionId }, user) => {
  const normalizedSectionId = normalizeSectionId(sectionId);

  const songbook = await loadActive(id);
  requireEditAccess(songbook, user);

  const song = await Song.findById(songId);
  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }

  if (normalizedSectionId) {
    const section = songbook.sections.id(normalizedSectionId);
    if (!section) {
      throw ApiError.notFound('Розділ не знайдено');
    }
  }

  try {
    await songbook.addSong(songId, normalizedSectionId, user._id);
  } catch (err) {
    if (err.message === 'Пісня вже додана до співаника') {
      throw ApiError.badRequest(err.message);
    }
    throw err;
  }

  return songbook.populate('songs.song', 'title author');
};

const removeSong = async (id, songId, user) => {
  const songbook = await loadActive(id);
  requireEditAccess(songbook, user);

  await songbook.removeSong(songId);
  return songbook.populate('songs.song', 'title author');
};

const reorderSongs = async (id, { sectionId, orderedSongIds }, user) => {
  const normalizedSectionId = sectionId && sectionId !== '' ? sectionId : null;

  const songbook = await loadActive(id);
  requireEditAccess(songbook, user);

  await songbook.reorderSongs(normalizedSectionId, orderedSongIds);
  return songbook.populate('songs.song', 'title author');
};

const moveSong = async (id, songId, { sectionId, targetIndex = 0 }, user) => {
  const normalizedSectionId = sectionId && sectionId !== '' ? sectionId : null;

  const songbook = await loadActive(id);
  requireEditAccess(songbook, user);

  if (normalizedSectionId) {
    const section = songbook.sections.id(normalizedSectionId);
    if (!section) {
      throw ApiError.notFound('Розділ не знайдено');
    }
  }

  try {
    await songbook.moveSong(songId, normalizedSectionId, parseInt(targetIndex, 10));
  } catch (err) {
    if (err.message === 'Пісню не знайдено у співанику') {
      throw ApiError.notFound(err.message);
    }
    throw err;
  }

  return songbook.populate('songs.song', 'title author');
};

const addSection = async (id, { name, description }, user) => {
  const songbook = await loadActive(id, 'Невірний ID співаника');
  requireFullAccess(songbook, user);

  await songbook.addSection(name, description);
  return songbook;
};

const removeSection = async (id, sectionId, user) => {
  const songbook = await loadActive(id);
  requireFullAccess(songbook, user);

  await songbook.removeSection(sectionId);
  return songbook;
};

const share = async (id, { email, permissions = 'view' }, user) => {
  const songbook = await loadActive(id, 'Невірний ID співаника');
  requireFullAccess(songbook, user);

  if (email === user.email) {
    throw ApiError.badRequest('Не можна поділитися з собою');
  }

  await songbook.shareWith(email, permissions);
  return songbook;
};

const unshare = async (id, email, user) => {
  const songbook = await loadActive(id, 'Невірний ID співаника');
  requireFullAccess(songbook, user);

  await songbook.unshareWith(email);
  return songbook;
};

/**
 * List songs that are NOT yet in the songbook, with optional text/category
 * filtering and pagination. Requires edit access.
 */
// --- "Singing now" shared state ---------------------------------------------

const nowSingingWindowMs = () =>
  (Songbook.NOW_SINGING_WINDOW_MINUTES || 10) * 60 * 1000;

// Return the singing marker only if it is present and fresh; otherwise null.
const normalizeNowSinging = (nowSinging) => {
  if (!nowSinging || !nowSinging.songId || !nowSinging.startedAt) return null;
  const age = Date.now() - new Date(nowSinging.startedAt).getTime();
  if (age > nowSingingWindowMs()) return null;
  return {
    songId: nowSinging.songId,
    songTitle: nowSinging.songTitle,
    startedByEmail: nowSinging.startedByEmail,
    startedAt: nowSinging.startedAt
  };
};

// Anyone who can view the songbook can read/lead its singing state.
const requireViewAccess = (songbook, user) => {
  if (user) {
    if (!songbook.canAccess(user).canAccess) {
      throw ApiError.forbidden();
    }
  } else if (songbook.privacy !== 'public') {
    throw ApiError.forbidden();
  }
};

const setNowSinging = async (id, songId, user) => {
  assertId(songId, 'Невірний ID пісні');
  const songbook = await loadActive(id, 'Невірний ID співаника');
  requireViewAccess(songbook, user);

  const inSongbook = songbook.songs.some(
    (s) => s.song && s.song.toString() === songId.toString()
  );
  if (!inSongbook) {
    throw ApiError.notFound('Пісню не знайдено у співанику');
  }

  const song = await Song.findById(songId).select('title');
  if (!song) {
    throw ApiError.notFound('Пісню не знайдено');
  }

  await songbook.setNowSinging(song, user);

  // A user may lead only one song at a time: clear any other songbook they were
  // leading so their "mine" indicator never appears in two places at once.
  if (user?.email) {
    await Songbook.updateMany(
      { _id: { $ne: songbook._id }, 'nowSinging.startedByEmail': user.email },
      { $set: { nowSinging: null } }
    );
  }

  return normalizeNowSinging(songbook.nowSinging);
};

// Every fresh "singing now" marker across songbooks this user can see. Powers
// the aggregated header indicator (multiple songbooks singing at once).
const getAllNowSinging = async (user) => {
  const candidates = await Songbook.find({
    isActive: true,
    'nowSinging.songId': { $ne: null },
    $or: [
      { owner: user._id },
      { 'sharedWith.email': user.email.toLowerCase() },
      { privacy: 'public' },
      { privacy: 'nearby' },
      { shareNearby: true }
    ]
  })
    .select('title nowSinging')
    .lean();

  return candidates
    .map((sb) => {
      const ns = normalizeNowSinging(sb.nowSinging);
      if (!ns) return null;
      return {
        songbookId: sb._id,
        songbookTitle: sb.title,
        songId: ns.songId,
        songTitle: ns.songTitle,
        startedByEmail: ns.startedByEmail,
        startedAt: ns.startedAt
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
};

const stopNowSinging = async (id, user) => {
  const songbook = await loadActive(id, 'Невірний ID співаника');
  requireViewAccess(songbook, user);

  await songbook.clearNowSinging();
  return null;
};

const getNowSinging = async (id, user) => {
  const songbook = await loadActive(id, 'Невірний ID співаника');
  requireViewAccess(songbook, user);
  return normalizeNowSinging(songbook.nowSinging);
};

const getAvailableSongs = async (id, params, user) => {
  const songbook = await loadActive(id, 'Невірний ID співаника');
  requireEditAccess(songbook, user);

  const { search: searchTerm = '', category = '', limit = 20, skip = 0 } = params;

  const existingSongIds = songbook.songs.map((s) => s.song.toString());

  const query = { _id: { $nin: existingSongIds } };
  if (searchTerm) {
    query.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { author: { $regex: searchTerm, $options: 'i' } }
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

  return {
    songs,
    total,
    hasMore: parseInt(skip) + songs.length < total
  };
};

module.exports = {
  getMySongbooks,
  getSharedWithMe,
  getPublicSongbooks,
  getNearbySongbooks,
  getById,
  create,
  update,
  remove,
  addSong,
  removeSong,
  reorderSongs,
  moveSong,
  addSection,
  removeSection,
  share,
  unshare,
  getAvailableSongs,
  setNowSinging,
  stopNowSinging,
  getNowSinging,
  getAllNowSinging
};
