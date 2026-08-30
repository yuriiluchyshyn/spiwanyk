const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/adminService');
const songbookService = require('../services/songbookService');

const listUsers = asyncHandler(async (req, res) => {
  const users = await adminService.listUsers();
  res.json({ users, total: users.length });
});

const listSongbooks = asyncHandler(async (req, res) => {
  const songbooks = await adminService.listSongbooks();
  res.json({ songbooks, total: songbooks.length });
});

const updateSongbookTitle = asyncHandler(async (req, res) => {
  const songbook = await adminService.updateSongbookTitle(req.params.id, req.body.title);
  res.json({ message: 'Назву співаника оновлено', songbook });
});

const deleteSongbook = asyncHandler(async (req, res) => {
  const songbook = await adminService.deleteSongbook(req.params.id);
  res.json({ message: 'Співаник видалено', songbook });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await adminService.deleteUser(req.params.id);
  res.json({ message: 'Користувача видалено', user });
});

const getSongbook = asyncHandler(async (req, res) => {
  const songbook = await songbookService.adminGetById(req.params.id);
  res.json({ songbook });
});

module.exports = {
  listUsers,
  listSongbooks,
  updateSongbookTitle,
  deleteSongbook,
  deleteUser,
  getSongbook
};
