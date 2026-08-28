const asyncHandler = require('../utils/asyncHandler');
const songService = require('../services/songService');

const list = asyncHandler(async (req, res) => {
  const result = await songService.listSongs(req.query);
  res.json(result);
});

const getPopular = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
  const songs = await songService.getPopular(limit);
  res.json({
    songs,
    message: `${limit ? `Топ ${limit}` : 'Всі'} популярні пісні`
  });
});

const search = asyncHandler(async (req, res) => {
  const { q: searchQuery, limit } = req.query;
  const songs = await songService.search(searchQuery, limit ? parseInt(limit) : undefined);
  res.json({ songs, query: searchQuery, total: songs.length });
});

const getById = asyncHandler(async (req, res) => {
  const song = await songService.getById(req.params.id, req.user);
  res.json({ song });
});

const create = asyncHandler(async (req, res) => {
  const song = await songService.create(req.body, req.user._id);
  res.status(201).json({ message: 'Пісню створено', song });
});

const update = asyncHandler(async (req, res) => {
  const song = await songService.update(req.params.id, req.body, req.user._id);
  res.json({ message: 'Пісню оновлено', song });
});

const remove = asyncHandler(async (req, res) => {
  await songService.remove(req.params.id, req.user._id);
  res.json({ message: 'Пісню видалено' });
});

// Admin
const adminList = asyncHandler(async (req, res) => {
  const songs = await songService.adminList();
  res.json({ songs, total: songs.length });
});

const adminDeleteAll = asyncHandler(async (req, res) => {
  const deletedCount = await songService.adminDeleteAll();
  res.json({ message: 'Всі пісні видалено', deletedCount });
});

const adminDeleteById = asyncHandler(async (req, res) => {
  const song = await songService.adminDeleteById(req.params.id);
  res.json({ message: 'Пісню видалено', song });
});

const adminUpdateCategory = asyncHandler(async (req, res) => {
  const song = await songService.adminUpdateCategory(req.params.id, req.body.category);
  res.json({ message: 'Категорію пісні оновлено', song });
});

const adminGetById = asyncHandler(async (req, res) => {
  const song = await songService.adminGetById(req.params.id);
  res.json({ song });
});

const adminCreate = asyncHandler(async (req, res) => {
  const song = await songService.adminCreate(req.body);
  res.status(201).json({ message: 'Пісню створено', song });
});

const adminUpdate = asyncHandler(async (req, res) => {
  const song = await songService.adminUpdate(req.params.id, req.body);
  res.json({ message: 'Пісню оновлено', song });
});

module.exports = {
  list,
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
