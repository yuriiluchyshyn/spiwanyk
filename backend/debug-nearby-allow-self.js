/**
 * Тимчасовий fix для тестування - дозволити бачити власні nearby співаники
 * Це потрібно тільки для debugging! В продакшені люди не повинні бачити власні nearby
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Підключаємо моделі
require('./src/models/User');
require('./src/models/Songbook');

// Тимчасова модифікація findNearby - БЕЗ виключення власного користувача
const Songbook = mongoose.model('Songbook');
Songbook.findNearbyDebug = async function(
  longitude,
  latitude,
  maxDistance = 500,
  excludeUserId = null, // ІГНОРУЄМО для debug
  freshnessMinutes = 60
) {
  console.log('🔍 findNearbyDebug called (ALLOWS SELF):', {
    longitude, latitude, maxDistance, excludeUserId, freshnessMinutes
  });
  
  const User = mongoose.model('User');
  const freshnessThreshold = new Date(Date.now() - freshnessMinutes * 60 * 1000);

  const userQuery = {
    'location.coordinates': { $ne: [0, 0] },
    'location.updatedAt': { $gte: freshnessThreshold },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  };

  // НE виключаємо власного користувача для debug!
  // if (excludeUserId) {
  //   userQuery._id = { $ne: excludeUserId };
  // }

  console.log('👥 Debug: Searching for nearby users (INCLUDING SELF):', userQuery);
  const nearbyUsers = await User.find(userQuery).select('_id email location');
  
  console.log('👥 Debug: Found nearby users (INCLUDING SELF):', nearbyUsers.map(u => ({
    id: u._id,
    email: u.email,
    coordinates: u.location.coordinates,
    updatedAt: u.location.updatedAt
  })));

  if (nearbyUsers.length === 0) {
    console.log('❌ No nearby users found');
    return [];
  }

  const userIds = nearbyUsers.map(u => u._id);

  const songbooks = await this.find({
    owner: { $in: userIds },
    privacy: 'nearby',
    isActive: true
  })
    .populate('owner', 'email')
    .populate('songs.song', 'title author')
    .sort({ createdAt: -1 });

  console.log('📚 Debug: Found nearby songbooks (INCLUDING OWN):', songbooks.map(sb => ({
    id: sb._id,
    title: sb.title,
    owner: sb.owner.email,
    privacy: sb.privacy
  })));

  return songbooks;
};

console.log('🚨 DEBUG MODE: findNearbyDebug method added to Songbook model');
console.log('   This allows users to see their OWN nearby songbooks');
console.log('   FOR TESTING PURPOSES ONLY!');