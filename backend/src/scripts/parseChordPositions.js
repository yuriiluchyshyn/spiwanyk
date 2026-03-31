const mongoose = require('mongoose');
const Song = require('../models/Song');

/**
 * Парсить рядок акордів і повертає масив {chord, position}
 * Наприклад: "Em             D         Em" → [{chord:"Em", position:0}, {chord:"D", position:15}, {chord:"Em", position:25}]
 */
function parseChordsLine(chordsStr) {
  if (!chordsStr || !chordsStr.trim()) return [];

  const positions = [];
  // Знаходимо всі акорди з їх позиціями
  const chordRegex = /[A-G][#b]?(?:m|min|maj|dim|aug|sus|add)?[0-9]?(?:\+[0-9])?(?:\/[A-G][#b]?)?/g;
  
  let match;
  while ((match = chordRegex.exec(chordsStr)) !== null) {
    positions.push({
      chord: match[0],
      position: match.index
    });
  }

  return positions;
}

/**
 * Маппить позиції акордів на слова тексту.
 * Повертає масив {chord, wordIndex} — індекс слова над яким стоїть акорд.
 */
function mapChordsToWords(chordPositions, text) {
  if (!chordPositions.length || !text) return [];

  // Розбиваємо текст на слова зі збереженням позицій
  const words = [];
  const wordRegex = /\S+/g;
  let wordMatch;
  while ((wordMatch = wordRegex.exec(text)) !== null) {
    words.push({
      word: wordMatch[0],
      start: wordMatch.index,
      end: wordMatch.index + wordMatch[0].length
    });
  }

  if (!words.length) return [];

  const result = [];
  for (const cp of chordPositions) {
    // Знаходимо слово: акорд належить слову якщо його позиція >= start слова
    // і < start наступного слова (або це останнє слово)
    let bestIdx = 0;
    for (let i = 0; i < words.length; i++) {
      if (cp.position >= words[i].start) {
        bestIdx = i;
      }
    }

    result.push({
      chord: cp.chord,
      wordIndex: bestIdx
    });
  }

  return result;
}

async function parseAllChordPositions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
    console.log('✅ Connected to MongoDB');

    const songs = await Song.find({ structure: { $exists: true, $ne: [] } });
    console.log(`📊 Found ${songs.length} songs`);

    let updatedCount = 0;
    let totalLines = 0;

    for (const song of songs) {
      let hasChanges = false;

      for (const section of song.structure) {
        for (const line of section.lines) {
          if (line.chords && line.chords.trim()) {
            const positions = parseChordsLine(line.chords);
            
            if (positions.length > 0) {
              // Маппимо на слова
              const mapped = mapChordsToWords(positions, line.text);
              line.chordPositions = mapped;
              hasChanges = true;
              totalLines++;
            }
          }
        }
      }

      if (hasChanges) {
        await song.save();
        updatedCount++;
        
        // Показуємо приклад для перших пісень
        if (updatedCount <= 2) {
          console.log(`\n✅ ${song.title}:`);
          const firstSection = song.structure[0];
          for (let i = 0; i < Math.min(firstSection.lines.length, 3); i++) {
            const line = firstSection.lines[i];
            if (line.chordPositions && line.chordPositions.length > 0) {
              const chordsStr = line.chordPositions.map(cp => `${cp.chord}@word${cp.wordIndex}`).join(', ');
              console.log(`   "${line.text}"`);
              console.log(`   Chords: [${chordsStr}]`);
            }
          }
        }
      }
    }

    console.log(`\n🎉 Done! Updated ${updatedCount} songs, ${totalLines} lines with chord positions`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  }
}

if (require.main === module) {
  parseAllChordPositions();
}

module.exports = { parseChordsLine, mapChordsToWords, parseAllChordPositions };