const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Auth business logic: user identity, JWT issuing and profile management.
 * Knows nothing about Express req/res.
 */

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

/**
 * Passwordless login: find the user by email or create one on first sight,
 * refresh their last-login timestamp, and issue a token.
 */
const login = async (email) => {
  let user = await User.findOne({ email });

  if (!user) {
    user = new User({ email });
    await user.save();
    console.log(`Новий користувач створений: ${email}`);
  } else {
    await user.updateLastLogin();
  }

  const token = generateToken(user._id);
  return { user, token };
};

/**
 * Load a user profile together with their songbooks and derived stats.
 */
const getProfile = async (userId) => {
  const user = await User.findById(userId)
    .select('-__v')
    .populate('songbooks', 'title description privacy createdAt');

  const stats = {
    songbooksCount: user.songbooks?.length || 0,
    lastLogin: user.lastLogin,
    memberSince: user.createdAt
  };

  return { user, stats };
};

/**
 * Merge new preferences into an existing user document.
 */
const updateProfile = async (user, preferences) => {
  if (preferences) {
    user.preferences = { ...user.preferences, ...preferences };
    await user.save();
  }
  return user;
};

module.exports = { generateToken, login, getProfile, updateProfile };
