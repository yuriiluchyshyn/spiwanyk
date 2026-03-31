const mongoose = require('mongoose');
const Song = require('../models/Song');

async function fixSongStructure() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
    console.log('✅ Connected to MongoDB');

    const songs = await Song.find({ structure: { $exists: true, $ne: [] } });
    console.log(`📊 Found ${songs.length} songs with structure`);

    let fixedCount = 0;

    for (const song of songs) {
      let hasChanges = false;
      const structure = song.structure;

      // Знаходимо повторювані рядки
      const lineFrequency = {};
      structure.forEach(section => {
        section.lines.forEach(line => {
          const cleanText = line.text.trim().toLowerCase();
          if (cleanText.length > 10) { // Ігноруємо короткі рядки
            lineFrequency[cleanText] = (lineFrequency[cleanText] || 0) + 1;
          }
        });
      });

      // Знаходимо рядки що повторюються (потенційні приспіви)
      const chorusLines = Object.keys(lineFrequency).filter(line => lineFrequency[line] >= 2);

      // Оновлюємо структуру
      for (let i = 0; i < structure.length; i++) {
        const section = structure[i];
        let isChorusSection = false;

        // Перевіряємо чи містить секція повторювані рядки
        let repeatedLinesCount = 0;
        for (const line of section.lines) {
          const cleanText = line.text.trim().toLowerCase();
          if (chorusLines.includes(cleanText)) {
            repeatedLinesCount++;
          }
        }

        // Секція є приспівом якщо більше половини рядків повторюються
        if (repeatedLinesCount > section.lines.length / 2) {
          isChorusSection = true;
        }

        // Перевіряємо на ключові фрази
        const sectionText = section.lines.map(l => l.text).join(' ').toLowerCase();
        if (sectionText.includes('лента за лентою') || 
            sectionText.includes('набої подавай') ||
            sectionText.includes('не відступай') ||
            sectionText.includes('117 стаття') ||
            sectionText.includes('приспів') ||
            sectionText.includes('гей, гей')) {
          isChorusSection = true;
        }

        // Спеціальна логіка: якщо це перша секція і вона не має явних ознак приспіву, то це куплет
        if (i === 0 && !sectionText.includes('приспів') && repeatedLinesCount < section.lines.length / 2) {
          isChorusSection = false;
        }

        // Оновлюємо тип секції
        if (isChorusSection && section.type !== 'chorus') {
          section.type = 'chorus';
          hasChanges = true;
        } else if (!isChorusSection && section.type !== 'verse') {
          section.type = 'verse';
          hasChanges = true;
        }

        // Оновлюємо isChorus для рядків
        section.lines.forEach(line => {
          const cleanText = line.text.trim().toLowerCase();
          if (chorusLines.includes(cleanText) || isChorusSection) {
            if (!line.isChorus) {
              line.isChorus = true;
              hasChanges = true;
            }
          } else {
            if (line.isChorus) {
              line.isChorus = false;
              hasChanges = true;
            }
          }
        });
      }

      // Перенумеровуємо секції
      let verseNumber = 1;
      let chorusNumber = 1;
      
      structure.forEach(section => {
        if (section.type === 'chorus') {
          section.number = chorusNumber++;
        } else {
          section.number = verseNumber++;
        }
      });

      // Зберігаємо зміни
      if (hasChanges) {
        song.structure = structure;
        await song.save();
        fixedCount++;
        console.log(`✅ Fixed structure for: ${song.title}`);
        
        // Показуємо структуру для перших кількох пісень
        if (fixedCount <= 3) {
          console.log('   Structure:');
          structure.forEach((section, i) => {
            console.log(`   ${i + 1}. ${section.type} ${section.number} (${section.lines.length} lines)`);
          });
        }
      }
    }

    console.log(`\n🎉 Fixed ${fixedCount} songs`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Запуск скрипта
if (require.main === module) {
  fixSongStructure();
}

module.exports = { fixSongStructure };