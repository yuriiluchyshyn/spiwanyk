const mongoose = require('mongoose');
const Song = require('../models/Song');

async function cleanSongTexts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
    console.log('✅ Connected to MongoDB');

    const songs = await Song.find({});
    console.log(`📊 Found ${songs.length} songs to analyze`);

    let cleanedCount = 0;
    let totalChanges = 0;

    for (const song of songs) {
      let hasChanges = false;
      let changes = [];

      // Очищення lyrics
      if (song.lyrics) {
        const originalLyrics = song.lyrics;
        let cleanedLyrics = originalLyrics;

        // Видаляємо рядки з "Куплет X:"
        cleanedLyrics = cleanedLyrics.replace(/^Куплет\s+\d+:\s*$/gm, '');
        
        // Видаляємо "Куплет X:" на початку рядків
        cleanedLyrics = cleanedLyrics.replace(/^Куплет\s+\d+:\s*/gm, '');
        
        // Видаляємо "Приспів:" на початку рядків
        cleanedLyrics = cleanedLyrics.replace(/^Приспів:\s*$/gm, '');
        cleanedLyrics = cleanedLyrics.replace(/^Приспів:\s*/gm, '');
        
        // Видаляємо зайві порожні рядки
        cleanedLyrics = cleanedLyrics.replace(/\n\n\n+/g, '\n\n');
        cleanedLyrics = cleanedLyrics.trim();

        if (cleanedLyrics !== originalLyrics) {
          song.lyrics = cleanedLyrics;
          hasChanges = true;
          changes.push('lyrics');
        }
      }

      // Очищення structure
      if (song.structure && song.structure.length > 0) {
        for (let section of song.structure) {
          for (let line of section.lines) {
            if (line.text) {
              const originalText = line.text;
              let cleanedText = originalText;

              // Видаляємо "Куплет X:" з початку рядків
              cleanedText = cleanedText.replace(/^Куплет\s+\d+:\s*/g, '');
              
              // Видаляємо "Приспів:" з початку рядків
              cleanedText = cleanedText.replace(/^Приспів:\s*/g, '');
              
              cleanedText = cleanedText.trim();

              if (cleanedText !== originalText && cleanedText.length > 0) {
                line.text = cleanedText;
                hasChanges = true;
                if (!changes.includes('structure')) {
                  changes.push('structure');
                }
              }
            }
          }
        }
      }

      // Очищення chords
      if (song.chords) {
        const originalChords = song.chords;
        let cleanedChords = originalChords;

        // Видаляємо рядки з "Куплет X:"
        cleanedChords = cleanedChords.replace(/^Куплет\s+\d+:\s*$/gm, '');
        cleanedChords = cleanedChords.replace(/^Куплет\s+\d+:\s*/gm, '');
        
        // Видаляємо "Приспів:"
        cleanedChords = cleanedChords.replace(/^Приспів:\s*$/gm, '');
        cleanedChords = cleanedChords.replace(/^Приспів:\s*/gm, '');
        
        // Видаляємо зайві порожні рядки
        cleanedChords = cleanedChords.replace(/\n\n\n+/g, '\n\n');
        cleanedChords = cleanedChords.trim();

        if (cleanedChords !== originalChords) {
          song.chords = cleanedChords;
          hasChanges = true;
          changes.push('chords');
        }
      }

      // Зберігаємо зміни
      if (hasChanges) {
        await song.save();
        cleanedCount++;
        totalChanges += changes.length;
        
        console.log(`✅ Cleaned: ${song.title} (${changes.join(', ')})`);
        
        // Показуємо деталі для перших кількох пісень
        if (cleanedCount <= 5) {
          if (changes.includes('lyrics')) {
            console.log(`   Lyrics preview: ${song.lyrics.substring(0, 100)}...`);
          }
          if (changes.includes('structure')) {
            console.log(`   Structure sections: ${song.structure.length}`);
          }
        }
      }
    }

    console.log(`\n🎉 Cleaning completed!`);
    console.log(`✅ Cleaned ${cleanedCount} songs`);
    console.log(`📝 Total changes: ${totalChanges}`);

    // Показуємо статистику
    const songsWithLyrics = await Song.countDocuments({ lyrics: { $exists: true, $ne: '' } });
    const songsWithStructure = await Song.countDocuments({ structure: { $exists: true, $ne: [] } });
    const songsWithChords = await Song.countDocuments({ chords: { $exists: true, $ne: '' } });

    console.log(`\n📊 Database statistics:`);
    console.log(`   Songs with lyrics: ${songsWithLyrics}`);
    console.log(`   Songs with structure: ${songsWithStructure}`);
    console.log(`   Songs with chords: ${songsWithChords}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Функція для тестування на одній пісні
async function testCleanSingleSong() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
    console.log('✅ Connected to MongoDB');

    // Знаходимо пісню з "Куплет" в тексті
    const song = await Song.findOne({
      $or: [
        { lyrics: /Куплет/i },
        { chords: /Куплет/i },
        { 'structure.lines.text': /Куплет/i }
      ]
    });

    if (song) {
      console.log(`🎵 Found song with "Куплет": ${song.title}`);
      
      if (song.lyrics && song.lyrics.includes('Куплет')) {
        console.log('Original lyrics:');
        console.log(song.lyrics.substring(0, 200) + '...');
      }
      
      if (song.structure) {
        console.log('Structure sections with "Куплет":');
        song.structure.forEach((section, i) => {
          section.lines.forEach((line, j) => {
            if (line.text && line.text.includes('Куплет')) {
              console.log(`  Section ${i+1}, Line ${j+1}: ${line.text}`);
            }
          });
        });
      }
    } else {
      console.log('✅ No songs found with "Куплет" in text');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Запуск скрипта
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    testCleanSingleSong();
  } else {
    cleanSongTexts();
  }
}

module.exports = { cleanSongTexts, testCleanSingleSong };