const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/location - Update user location
router.post('/', [
  auth,
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Невірна широта'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Невірна довгота')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Помилка валідації',
        errors: errors.array()
      });
    }

    const { lat, lng } = req.body;

    await req.user.updateLocation(lng, lat); // MongoDB uses [longitude, latitude]

    res.json({
      message: 'Місцезнаходження оновлено',
      location: {
        latitude: lat,
        longitude: lng,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Помилка оновлення місцезнаходження' });
  }
});

// GET /api/location - Get user location
router.get('/', auth, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.location || !user.location.coordinates) {
      return res.status(404).json({ message: 'Місцезнаходження не встановлено' });
    }

    const [longitude, latitude] = user.location.coordinates;

    res.json({
      location: {
        latitude,
        longitude,
        updatedAt: user.location.updatedAt
      }
    });

  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ message: 'Помилка отримання місцезнаходження' });
  }
});

// DELETE /api/location - Clear user location
router.delete('/', auth, async (req, res) => {
  try {
    req.user.location = {
      type: 'Point',
      coordinates: [0, 0],
      updatedAt: new Date()
    };
    
    await req.user.save();

    res.json({ message: 'Місцезнаходження очищено' });

  } catch (error) {
    console.error('Clear location error:', error);
    res.status(500).json({ message: 'Помилка очищення місцезнаходження' });
  }
});

module.exports = router;