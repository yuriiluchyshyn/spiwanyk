const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

const toPublicUser = (user) => ({
  _id: user._id,
  email: user.email,
  lastLogin: user.lastLogin,
  preferences: user.preferences
});

const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body.email);
  res.json({
    message: 'Успішний вхід',
    token,
    user: toPublicUser(user)
  });
});

const verify = asyncHandler(async (req, res) => {
  res.json({
    message: 'Токен дійсний',
    user: toPublicUser(req.user)
  });
});

const getProfile = asyncHandler(async (req, res) => {
  const { user, stats } = await authService.getProfile(req.user._id);
  res.json({ user, stats });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user, req.body.preferences);
  res.json({
    message: 'Профіль оновлено',
    user: {
      _id: user._id,
      email: user.email,
      preferences: user.preferences
    }
  });
});

const logout = asyncHandler(async (req, res) => {
  res.json({ message: 'Успішний вихід' });
});

module.exports = { login, verify, getProfile, updateProfile, logout };
