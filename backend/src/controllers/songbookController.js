const asyncHandler = require('../utils/asyncHandler');
const songbookService = require('../services/songbookService');

const getMy = asyncHandler(async (req, res) => {
  const songbooks = await songbookService.getMySongbooks(req.user._id);
  res.json({ songbooks, total: songbooks.length });
});

const getPublic = asyncHandler(async (req, res) => {
  const songbooks = await songbookService.getPublicSongbooks(req.query);
  res.json({
    songbooks,
    total: songbooks.length,
    hasMore: songbooks.length === parseInt(req.query.limit || 20)
  });
});

const getNearby = asyncHandler(async (req, res) => {
  console.log('🔍 getNearby called:', {
    userId: req.user._id,
    userEmail: req.user.email,
    query: req.query
  });
  
  const { songbooks, searchCenter, maxDistance, maxAge } =
    await songbookService.getNearbySongbooks(req.query, req.user._id);
    
  console.log('📍 getNearby result:', {
    userId: req.user._id,
    userEmail: req.user.email,
    songbooksFound: songbooks.length,
    songbookTitles: songbooks.map(sb => sb.title),
    searchCenter,
    maxDistance,
    maxAge
  });
  
  res.json({ songbooks, total: songbooks.length, searchCenter, maxDistance, maxAge });
});

const getById = asyncHandler(async (req, res) => {
  const songbook = await songbookService.getById(req.params.id, req.user);
  res.json({ songbook });
});

const create = asyncHandler(async (req, res) => {
  const songbook = await songbookService.create(req.body, req.user._id);
  res.status(201).json({ message: 'Співаник створено', songbook });
});

const update = asyncHandler(async (req, res) => {
  const songbook = await songbookService.update(req.params.id, req.body, req.user);
  res.json({ message: 'Співаник оновлено', songbook });
});

const remove = asyncHandler(async (req, res) => {
  await songbookService.remove(req.params.id, req.user);
  res.json({ message: 'Співаник видалено' });
});

const addSong = asyncHandler(async (req, res) => {
  const songbook = await songbookService.addSong(req.params.id, req.body, req.user);
  res.json({ message: 'Пісню додано до співаника', songbook });
});

const removeSong = asyncHandler(async (req, res) => {
  const songbook = await songbookService.removeSong(req.params.id, req.params.songId, req.user);
  res.json({ message: 'Пісню видалено зі співаника', songbook });
});

const reorderSongs = asyncHandler(async (req, res) => {
  const songbook = await songbookService.reorderSongs(req.params.id, req.body, req.user);
  res.json({ message: 'Порядок пісень оновлено', songbook });
});

const moveSong = asyncHandler(async (req, res) => {
  const songbook = await songbookService.moveSong(
    req.params.id,
    req.params.songId,
    req.body,
    req.user
  );
  res.json({ message: 'Пісню переміщено', songbook });
});

const addSection = asyncHandler(async (req, res) => {
  const songbook = await songbookService.addSection(req.params.id, req.body, req.user);
  res.json({ message: 'Розділ додано', songbook });
});

const removeSection = asyncHandler(async (req, res) => {
  const songbook = await songbookService.removeSection(
    req.params.id,
    req.params.sectionId,
    req.user
  );
  res.json({ message: 'Розділ видалено', songbook });
});

const share = asyncHandler(async (req, res) => {
  const songbook = await songbookService.share(req.params.id, req.body, req.user);
  res.json({ message: `Співаник поділено з ${req.body.email}`, songbook });
});

const unshare = asyncHandler(async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const songbook = await songbookService.unshare(req.params.id, email, req.user);
  res.json({ message: `Доступ для ${email} скасовано`, songbook });
});

const getAvailableSongs = asyncHandler(async (req, res) => {
  const result = await songbookService.getAvailableSongs(req.params.id, req.query, req.user);
  res.json(result);
});

module.exports = {
  getMy,
  getPublic,
  getNearby,
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
  getAvailableSongs
};
