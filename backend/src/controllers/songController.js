const asyncHandler = require('../utils/asyncHandler');
const songService = require('../services/songService');

const list = asyncHandler(async (req, res) => {
  const result = await songService.listSongs(req.query, req.user);
  res.json(result);
});

// Authenticated user creates a private song of their own.
const createUserSong = asyncHandler(async (req, res) => {
  const song = await songService.createUserSong(req.user, req.body);
  res.status(201).json({ message: 'Пісню створено', song });
});

// Authenticated user saves a song (seen in a shared songbook) into their own
// catalogue under a chosen or newly created category.
const saveSongToMyCatalog = asyncHandler(async (req, res) => {
  const song = await songService.saveSongToMyCatalog(req.user, req.params.id, req.body);
  res.status(201).json({ message: 'Пісню збережено у ваших піснях', song });
});

// Authenticated user updates one of their own private songs.
const updateUserSong = asyncHandler(async (req, res) => {
  const song = await songService.updateUserSong(req.user, req.params.id, req.body);
  res.json({ message: 'Пісню оновлено', song });
});

// Authenticated user deletes one of their own private songs.
const deleteUserSong = asyncHandler(async (req, res) => {
  const song = await songService.deleteUserSong(req.user, req.params.id);
  res.json({ message: 'Пісню видалено', song });
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

const adminDeleteByCategory = asyncHandler(async (req, res) => {
  // Розділи приймаємо або з тіла (categories: [...]), або з query (?categories=a,b)
  let categories = req.body?.categories;
  if (!categories && typeof req.query.categories === 'string') {
    categories = req.query.categories.split(',');
  }
  const deletedCount = await songService.adminDeleteByCategories(categories);
  res.json({ message: 'Пісні вибраних розділів видалено', deletedCount });
});

const adminBulkDelete = asyncHandler(async (req, res) => {
  const deletedCount = await songService.adminDeleteByIds(req.body?.ids);
  res.json({ message: 'Вибрані пісні видалено', deletedCount });
});

const adminBulkCategory = asyncHandler(async (req, res) => {
  const modifiedCount = await songService.adminSetCategoryForIds(
    req.body?.ids,
    req.body?.category
  );
  res.json({ message: 'Розділ вибраних пісень оновлено', modifiedCount });
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

// Зберегти пісню в загальний список (доступний усім). Потрібен розділ.
const adminPublish = asyncHandler(async (req, res) => {
  const song = await songService.adminPublish(req.params.id, req.body?.category);
  res.json({ message: 'Пісню збережено в загальний список', song });
});

module.exports = {
  list,
  createUserSong,
  updateUserSong,
  deleteUserSong,
  saveSongToMyCatalog,
  getPopular,
  search,
  getById,
  create,
  update,
  remove,
  adminList,
  adminDeleteAll,
  adminDeleteByCategory,
  adminBulkDelete,
  adminBulkCategory,
  adminDeleteById,
  adminUpdateCategory,
  adminGetById,
  adminCreate,
  adminUpdate,
  adminPublish
};
