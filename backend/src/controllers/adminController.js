const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/adminService');

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

module.exports = { listUsers, listSongbooks, updateSongbookTitle };
