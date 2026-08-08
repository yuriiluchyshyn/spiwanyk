#!/usr/bin/env node
/**
 * Read-only diagnostic: who can see which songbooks and why.
 * Run: cd backend && node src/scripts/debugAccess.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Songbook = require('../models/Songbook');
require('../models/Song'); // needed for populate('songs.song')

const fmt = (d) => (d ? new Date(d).toISOString() : 'never');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spivanyk');
  console.log('connected\n');

  const users = await User.find({ isActive: true }).select('_id email location');
  console.log(`=== USERS (${users.length}) ===`);
  users.forEach((u) => {
    const c = u.location?.coordinates || [];
    console.log(
      `  ${u.email}  id=${u._id}\n    coords=[${c.join(', ')}]  updatedAt=${fmt(u.location?.updatedAt)}`
    );
  });

  const books = await Songbook.find({ isActive: { $ne: false } })
    .populate('owner', 'email')
    .select('title privacy shareNearby owner sharedWith');
  console.log(`\n=== SONGBOOKS (${books.length}) ===`);
  books.forEach((b) => {
    console.log(
      `  "${b.title}"  privacy=${b.privacy}  shareNearby=${b.shareNearby}  owner=${b.owner?.email}`
    );
    (b.sharedWith || []).forEach((s) =>
      console.log(`      sharedWith: email=${s.email} user=${s.user || 'NOT_LINKED'} perms=${s.permissions}`)
    );
  });

  console.log('\n=== WHAT EACH USER SHOULD SEE ===');
  for (const u of users) {
    console.log(`\n--- ${u.email} ---`);

    const owned = books.filter((b) => b.owner?._id.toString() === u._id.toString());
    console.log(`  owned (/my): ${owned.length} -> ${owned.map((b) => b.title).join(', ') || '-'}`);

    // shared by email
    const sharedToMe = await Songbook.find({
      isActive: { $ne: false },
      'sharedWith.email': u.email.toLowerCase()
    }).select('title privacy');
    console.log(
      `  shared to my email: ${sharedToMe.length} -> ${sharedToMe.map((b) => b.title).join(', ') || '-'}`
    );

    // nearby
    const c = u.location?.coordinates;
    if (!c || (c[0] === 0 && c[1] === 0)) {
      console.log('  nearby: SKIPPED - no real location stored');
    } else {
      const nearby = await Songbook.findNearby(c[0], c[1], 500, u._id, Songbook.PRESENCE_WINDOW_MINUTES);
      console.log(`  nearby: ${nearby.length} -> ${nearby.map((b) => b.title).join(', ') || '-'}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
