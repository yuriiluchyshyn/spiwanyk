const mongoose = require('mongoose');
const Song = require('./src/models/Song');
const fs = require('fs');

async function importTestSong() {
  try {
    // Підключаємося до MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spivanyk');
    console.log('✅ Connected to MongoDB');

    // Читаємо тестову пісню
    const testSong = JSON.parse(fs.readFileSync('./test-song-with-chords.json', 'utf8'));
    
    // Видаляємо існуючу тестову пісню
    await Song.deleteMany({ title: testSong.title });
    
    // Створюємо нову пісню
    const song = new Song(testSong);
    await song.save();
    
    console.log('✅ Test song imported successfully');
    console.log('Song ID:', song._id);
    console.log('Title:', song.title);
    
    // Перевіряємо структуру
    if (song.structure && song.structure.length > 0) {
      console.log('\n📊 Song structure:');
      song.structure.forEach((section, si) => {
        console.log(`Section ${si + 1} (${section.type}):`);
        section.lines.forEach((line, li) => {
          console.log(`  Line ${li + 1}: "${line.text}"`);
          if (line.chordPositions && line.chordPositions.length > 0) {
            console.log(`    Chords:`, line.chordPositions);
          }
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

importTestSong();