#!/usr/bin/env node

/**
 * Експорт пісень з локальної бази у JSON, готовий для імпорту на проді
 * через ендпоінт  POST /api/songs/import-from-json.
 *
 * Формат вихідного файлу узгоджений з songImportService.js:
 *   { metadata: {...}, songs: [ { title, author, category, url, youtubeUrl,
 *                                 metadata, structure: [ { ..., lines: [ {
 *                                 text, chordPositions, metadata:{isChorus} }]}]}] }
 *
 * Запуск:
 *   node src/scripts/exportForImport.js                 # експорт категорії hymns
 *   node src/scripts/exportForImport.js hymns           # те саме, явно
 *   node src/scripts/exportForImport.js hymns folk      # кілька категорій
 *   node src/scripts/exportForImport.js --all           # усі пісні
 *
 * Результат: backend/data/import-<category>-<timestamp>.json
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Song = require('../models/Song');
require('dotenv').config();

// Приводимо документ пісні з бази до "сирого" формату, який очікує імпорт.
function toImportShape(song) {
  return {
    title: song.title,
    author: song.author || 'Невідомий',
    category: song.category,
    url: song.sourceUrl || '',
    youtubeUrl: song.youtubeUrl || '',
    metadata: {
      words: song.metadata?.words || '',
      music: song.metadata?.music || '',
      performer: song.metadata?.performer || ''
    },
    structure: (song.structure || []).map(section => ({
      type: section.type,
      number: section.number,
      repeat: section.repeat || 1,
      lines: (section.lines || []).map(line => ({
        text: line.text,
        chordPositions: (line.chordPositions || []).map(cp => ({
          chord: cp.chord,
          charIndex: cp.charIndex != null ? cp.charIndex : 0
        })),
        // Імпорт читає isChorus саме з line.metadata.isChorus
        metadata: { isChorus: line.isChorus || false }
      }))
    }))
  };
}

async function main() {
  const args = process.argv.slice(2);
  const exportAll = args.includes('--all');
  const categories = args.filter(a => !a.startsWith('--'));
  if (!exportAll && categories.length === 0) categories.push('hymns');

  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook'
    );
    console.log('✅ Підключено до MongoDB');

    const query = exportAll ? {} : { category: { $in: categories } };
    const songs = await Song.find(query).sort({ category: 1, title: 1 }).lean();

    if (songs.length === 0) {
      console.log('⚠️  Не знайдено жодної пісні за заданими критеріями.');
      return;
    }

    const output = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalSongs: songs.length,
        categories: exportAll ? 'all' : categories,
        source: 'pryvatri.de',
        format: 'import-from-json'
      },
      songs: songs.map(toImportShape)
    };

    const dataDir = path.join(__dirname, '../../data');
    await fs.mkdir(dataDir, { recursive: true });

    const label = exportAll ? 'all' : categories.join('-');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filepath = path.join(dataDir, `import-${label}-${timestamp}.json`);

    await fs.writeFile(filepath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`💾 Збережено ${songs.length} пісень → ${filepath}`);
    console.log('\n📋 Пісні:');
    songs.forEach(s => console.log(`   • [${s.category}] ${s.title}`));
  } catch (error) {
    console.error('❌ Помилка експорту:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 З’єднання з базою закрито');
  }
}

if (require.main === module) {
  main();
}

module.exports = { toImportShape };
