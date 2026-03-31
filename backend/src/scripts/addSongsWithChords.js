const mongoose = require('mongoose');
const Song = require('../models/Song');
const User = require('../models/User');
require('dotenv').config();

const songsWithChords = [
  {
    title: "Червона рута (з акордами)",
    author: "Володимир Івасюк",
    category: "author",
    lyrics: `Ти признайся мені, звідки в тебе ті очі
Ніби вишні розцвіли в них дві
Ти признайся мені, де ти бачила ночі
Повні зір і печалі такі

Червона рута, рута, рута
Де ти зросла, де ти зросла?
Кого ти любиш, молода?
Червона рута, рута, рута
Нащо мені, нащо мені
Бридкі ці сни, бридкі ці сни?`,
    chords: `Am        F         C           G
Ти признайся мені, звідки в тебе ті очі
Am        F         C        G
Ніби вишні розцвіли в них дві
Am        F         C           G
Ти признайся мені, де ти бачила ночі
Am        F         C     G    Am
Повні зір і печалі такі

    F         C         G        Am
Червона рута, рута, рута
F         C         G        Am
Де ти зросла, де ти зросла?
F         C         G        Am
Кого ти любиш, молода?
F         C         G        Am
Червона рута, рута, рута
F         C         G        Am
Нащо мені, нащо мені
F         C         G        Am
Бридкі ці сни, бридкі ці сни?`,
    tags: ["авторська", "акорди", "популярна"],
    isPublic: true
  }
];

async function addSongs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
    console.log('✅ Connected to MongoDB');

    let defaultUser = await User.findOne({ email: 'admin@plast.org' });
    if (!defaultUser) {
      defaultUser = new User({ email: 'admin@plast.org', name: 'Admin' });
      await defaultUser.save();
    }

    for (const songData of songsWithChords) {
      const existingSong = await Song.findOne({ title: songData.title });
      if (!existingSong) {
        const song = new Song({ ...songData, createdBy: defaultUser._id });
        await song.save();
        console.log(`✅ Added: ${songData.title}`);
      } else {
        console.log(`⏭️  Already exists: ${songData.title}`);
      }
    }

    console.log('🎉 Songs with chords added!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  addSongs();
}

module.exports = addSongs;