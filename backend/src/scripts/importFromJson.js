const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Song = require('../models/Song');
const User = require('../models/User');

async function importFromJson() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
    console.log('✅ Connected to MongoDB');

    // Очищуємо існуючі пісні
    const deletedCount = await Song.deleteMany({});
    console.log(`🗑️  Deleted ${deletedCount.deletedCount} existing songs`);

    // Читаємо JSON файл
    const jsonPath = path.join(__dirname, '../../data/latest-songs.json');
    const jsonData = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(jsonData);

    console.log(`📊 Found ${data.songs.length} songs in JSON`);

    // Знаходимо або створюємо користувача для імпорту
    let importUser = await User.findOne({ email: 'import@plast.org' });
    if (!importUser) {
      importUser = new User({
        email: 'import@plast.org',
        name: 'JSON Import User'
      });
      await importUser.save();
      console.log('👤 Created import user');
    }

    let importedCount = 0;

    // Імпортуємо кожну пісню
    for (const songData of data.songs) {
      try {
        // Маппимо категорії
        const categoryMap = {
          'author': 'author',
          'plast': 'plast',
          'uprising': 'uprising',
          'folk': 'folk',
          'lemko': 'lemko',
          'christmas': 'christmas'
        };

        // Конвертуємо структуру для MongoDB
        const structure = songData.structure.map(section => ({
          type: section.type,
          number: section.number,
          repeat: section.repeat || 1,
          lines: section.lines.map(line => ({
            text: line.text,
            chordPositions: (line.chordPositions || line.chords || []).map(chord => ({
              chord: chord.chord,
              charIndex: chord.charIndex != null ? chord.charIndex : (chord.position != null ? chord.position : 0)
            })),
            isChorus: line.metadata?.isChorus || false
          }))
        }));

        // Створюємо legacy lyrics для зворотної сумісності
        const lyrics = structure.map(section => {
          const sectionTitle = section.type === 'chorus' ? 'Приспів:' : `Куплет ${section.number}:`;
          const lines = section.lines.map(line => line.text).join('\n');
          return `${sectionTitle}\n${lines}`;
        }).join('\n\n');

        const newSong = new Song({
          title: songData.title || 'Без назви',
          author: songData.author || 'Невідомий',
          lyrics: lyrics,
          chords: '', // Поки що порожній
          structure: structure,
          youtubeUrl: songData.youtubeUrl || '',
          category: categoryMap[songData.category] || 'folk',
          tags: [songData.category, 'imported', 'structured'],
          isPublic: true,
          createdBy: importUser._id,
          // Додаємо нову метаінформацію
          metadata: {
            words: songData.metadata?.words || '',
            music: songData.metadata?.music || '',
            performer: songData.metadata?.performer || ''
          }
        });

        await newSong.save();
        importedCount++;
        
        console.log(`✅ Imported: ${newSong.title} (${structure.length} sections)`);

        // Показуємо деталі для перших кількох пісень
        if (importedCount <= 2) {
          console.log(`   Category: ${newSong.category}`);
          console.log(`   YouTube: ${newSong.youtubeUrl ? 'Yes' : 'No'}`);
          console.log(`   Structure: ${structure.map(s => `${s.type}${s.number}`).join(', ')}`);
          
          // Показуємо приклад chord positions
          const firstLineWithChords = structure
            .flatMap(s => s.lines)
            .find(l => l.chordPositions && l.chordPositions.length > 0);
          
          if (firstLineWithChords) {
            const chordsStr = firstLineWithChords.chordPositions
              .map(cp => `${cp.chord}@char${cp.charIndex}`)
              .join(', ');
            console.log(`   Sample chords: [${chordsStr}]`);
          }
        }

      } catch (error) {
        console.error(`❌ Error importing ${songData.title}:`, error.message);
      }
    }

    console.log(`\n🎉 Import completed!`);
    console.log(`✅ Successfully imported: ${importedCount} songs`);
    console.log(`📊 Total songs in database: ${await Song.countDocuments()}`);

    // Статистика
    const stats = await Song.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📈 Category statistics:');
    for (const stat of stats) {
      console.log(`   ${stat._id}: ${stat.count} songs`);
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

if (require.main === module) {
  importFromJson();
}

module.exports = { importFromJson };