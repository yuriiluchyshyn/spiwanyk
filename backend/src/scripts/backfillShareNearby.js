#!/usr/bin/env node
/**
 * One-off backfill: songbooks created before `shareNearby` existed relied on
 * `privacy: 'nearby'` alone. Set the flag so the new query finds them.
 *
 * Run: cd backend && node src/scripts/backfillShareNearby.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Songbook = require('../models/Songbook');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spivanyk');

  const result = await Songbook.updateMany(
    { privacy: 'nearby', shareNearby: { $ne: true } },
    { $set: { shareNearby: true } }
  );
  console.log(`privacy:'nearby' -> shareNearby:true  updated=${result.modifiedCount}`);

  const missing = await Songbook.updateMany(
    { shareNearby: { $exists: false } },
    { $set: { shareNearby: false } }
  );
  console.log(`default shareNearby:false             updated=${missing.modifiedCount}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
