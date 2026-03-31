const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/auth/login - Login with email only
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Невірний формат email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find or create user
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      user = new User({ email });
      await user.save();
      console.log(`Новий користувач створений: ${email}`);
    } else {
      // Update last login
      await user.updateLastLogin();
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Успішний вхід',
      token,
      user: {
        _id: user._id,
        email: user.email,
        lastLogin: user.lastLogin,
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Помилка сервера при вході' });
  }
});

// GET /api/auth/verify - Verify token
router.get('/verify', auth, async (req, res) => {
  try {
    res.json({
      message: 'Токен дійсний',
      user: {
        _id: req.user._id,
        email: req.user.email,
        lastLogin: req.user.lastLogin,
        preferences: req.user.preferences
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ message: 'Помилка перевірки токену' });
  }
});

// GET /api/auth/profile - Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-__v')
      .populate('songbooks', 'title description privacy createdAt');

    res.json({
      user,
      stats: {
        songbooksCount: user.songbooks?.length || 0,
        lastLogin: user.lastLogin,
        memberSince: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Помилка отримання профілю' });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', [
  auth,
  body('preferences.language').optional().isIn(['uk', 'en']),
  body('preferences.theme').optional().isIn(['light', 'dark'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const { preferences } = req.body;
    
    if (preferences) {
      req.user.preferences = { ...req.user.preferences, ...preferences };
      await req.user.save();
    }

    res.json({
      message: 'Профіль оновлено',
      user: {
        _id: req.user._id,
        email: req.user.email,
        preferences: req.user.preferences
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Помилка оновлення профілю' });
  }
});

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', auth, async (req, res) => {
  try {
    // In a more complex setup, you might want to blacklist the token
    // For now, we just confirm the logout
    res.json({ message: 'Успішний вихід' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Помилка виходу' });
  }
});

module.exports = router;