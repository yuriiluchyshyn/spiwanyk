#!/usr/bin/env node

/**
 * Скрапер розділу "Авторські пісні" з сайту pryvatri.de
 *
 * Використовує високоякісний парсер DetailedSongScraper (структура + позиційні
 * акорди) і зберігає пісні НАПРЯМУ в MongoDB.
 *
 * ВАЖЛИВО: цей скрипт НЕ видаляє наявні пісні. Він додає нові та (за бажанням)
 * оновлює вже існуючі — на відміну від importFromJson.js, який очищує колекцію.
 *
 * Джерело:   https://pryvatri.de/avtorski
 * Категорія: author (АВТОРСЬКІ ПІСНІ)
 *
 * Запуск:
 *   node src/scripts/scrapeAuthor.js            # додати нові, пропустити існуючі
 *   node src/scripts/scrapeAuthor.js --update    # також оновити існуючі
 */

const mongoose = require('mongoose');
const DetailedSongScraper = require('./detailedScraper');
const Song = require('../models/Song');
const User = require('../models/User');
require('dotenv').config();

const SECTION = 'avtorski';
const CATEGORY = 'author';

/**
 * Перетворює структуру, яку повертає DetailedSongScraper, у формат схеми Song.
 * (Логіка узгоджена з importFromJson.js / scrapeMolytvy.js)
 */
function buildStructure(songData) {
  return (songData.structure || []).map(section => ({
    type: section.type,
    number: section.number,
    repeat: section.repeat || 1,
    lines: (section.lines || []).map(line => ({
      text: line.text,
      chordPositions: (line.chordPositions || line.chords || []).map(chord => ({
        chord: chord.chord,
        charIndex:
          chord.charIndex != null
            ? chord.charIndex
            : chord.position != null
            ? chord.position
            : 0
      })),
      isChorus: line.metadata?.isChorus || line.isChorus || false
    }))
  }));
}

/**
 * Генерує legacy-текст пісні для зворотної сумісності.
 */
function buildLyrics(structure) {
  return structure
    .map(section => {
      const sectionTitle =
        section.type === 'chorus' ? 'Приспів:' : `Куплет ${section.number}:`;
      const lines = section.lines.map(line => line.text).join('\n');
      return `${sectionTitle}\n${lines}`;
    })
    .join('\n\n');
}

async function main() {
  const shouldUpdate = process.argv.includes('--update');
  const scraper = new DetailedSongScraper();

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    console.log('🎼 Скрапінг розділу "Авторські пісні" (avtorski → author)');

    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook'
    );
    console.log('✅ Підключено до MongoDB');

    // Користувач-власник імпортованих пісень
    let importUser = await User.findOne({ email: 'import@plast.org' });
    if (!importUser) {
      importUser = new User({
        email: 'import@plast.org',
        name: 'JSON Import User'
      });
      await importUser.save();
      console.log('👤 Створено користувача для імпорту');
    }

    await scraper.initBrowser();

    // Збираємо посилання на пісні розділу
    const songLinks = await scraper.fetchSectionSongs(SECTION);
    console.log(`🔗 Знайдено ${songLinks.length} пісень у розділі ${SECTION}\n`);

    for (let i = 0; i < songLinks.length; i++) {
      const { url, title } = songLinks[i];

      try {
        // Затримка між піснями, щоб не навантажувати сервер
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 2000));

        // Перевіряємо, чи пісня вже є (за URL джерела або назвою)
        const existing = await Song.findOne({
          $or: [{ sourceUrl: url }, { title }]
        });

        if (existing && !shouldUpdate) {
          console.log(`⏭️  Вже існує, пропускаємо: ${title}`);
          skipped++;
          continue;
        }

        const songData = await scraper.scrapeSong(url, title, CATEGORY);

        if (!songData || !songData.structure || songData.structure.length === 0) {
          console.log(`⚠️  Немає вмісту, пропускаємо: ${title}`);
          errors++;
          continue;
        }

        const structure = buildStructure(songData);
        const lyrics = buildLyrics(structure);

        const doc = {
          title: songData.title || 'Без назви',
          author: songData.author || 'Невідомий',
          lyrics,
          structure,
          youtubeUrl: songData.youtubeUrl || '',
          category: CATEGORY,
          tags: [SECTION, 'author', 'pryvatri.de', 'structured'],
          isPublic: true,
          createdBy: importUser._id,
          sourceUrl: songData.url || url,
          metadata: {
            words: songData.metadata?.words || '',
            music: songData.metadata?.music || '',
            performer: songData.metadata?.performer || ''
          }
        };

        if (existing) {
          await Song.updateOne({ _id: existing._id }, { $set: doc });
          updated++;
          console.log(
            `♻️  Оновлено: ${doc.title} (${structure.length} секцій)`
          );
        } else {
          await new Song(doc).save();
          added++;
          console.log(`✅ Додано: ${doc.title} (${structure.length} секцій)`);
        }
      } catch (error) {
        console.error(`❌ Помилка обробки "${title}":`, error.message);
        errors++;
      }
    }

    console.log('\n🎉 Готово!');
    console.log(`   ✅ Додано:     ${added}`);
    console.log(`   ♻️  Оновлено:   ${updated}`);
    console.log(`   ⏭️  Пропущено:  ${skipped}`);
    console.log(`   ❌ Помилок:    ${errors}`);
    console.log(
      `   📊 Всього "${CATEGORY}" у базі: ${await Song.countDocuments({
        category: CATEGORY
      })}`
    );
  } catch (error) {
    console.error('❌ Скрапінг не вдався:', error);
    process.exitCode = 1;
  } finally {
    await scraper.closeBrowser();
    await mongoose.connection.close();
    console.log('🔌 З’єднання з базою закрито');
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
