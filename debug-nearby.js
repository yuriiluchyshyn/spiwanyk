#!/usr/bin/env node

/**
 * Debug script для перевірки nearby логіки
 * Використання: node debug-nearby.js
 */

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
require('./backend/src/models/User');
require('./backend/src/models/Songbook');

async function debugNearby() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spivanyk');
    console.log('📊 Connected to MongoDB');

    const User = mongoose.model('User');
    const Songbook = mongoose.model('Songbook');

    // Знайти всіх користувачів з локаціями
    const users = await User.find({
      'location.coordinates': { $ne: [0, 0] },
      isActive: true
    }).select('_id email location');

    console.log('👥 Users with locations:');
    users.forEach(user => {
      console.log(`  - ${user.email}: [${user.location.coordinates.join(', ')}] updated: ${user.location.updatedAt}`);
    });

    // Знайти всі nearby співаники
    const nearbyBooks = await Songbook.find({
      privacy: 'nearby',
      isActive: true
    }).populate('owner', 'email');

    console.log('\n📚 Nearby songbooks:');
    nearbyBooks.forEach(book => {
      console.log(`  - "${book.title}" by ${book.owner.email} (${book.privacy})`);
    });

    // Тест поиска nearby для кожного користувача
    console.log('\n🔍 Testing findNearby for each user:');
    for (const user of users) {
      const [lng, lat] = user.location.coordinates;
      console.log(`\n📍 Testing for ${user.email} at [${lng}, ${lat}]:`);
      
      const nearby = await Songbook.findNearby(lng, lat, 500, user._id, 60);
      console.log(`  Found ${nearby.length} songbooks:`);
      nearby.forEach(sb => {
        console.log(`    - "${sb.title}" by ${sb.owner.email}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

debugNearby();