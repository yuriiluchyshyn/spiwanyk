#!/usr/bin/env node

/**
 * Скрапер розділу "Пташата" з сайту https://plastzv.org.ua/songs
 *
 * Сайт — SPA, тому дані беремо через Puppeteer: відкриваємо сторінку,
 * клікаємо фільтр "Пташата", по черзі розгортаємо кожну пісню й читаємо
 * згенерований HTML (назва, загальні акорди, текст).
 *
 * Модель акордів на джерелі — це загальний НАБІР акордів пісні (напр. C G F C),
 * без прив'язки до символів. За побажанням ці акорди рівномірно розставляються
 * над кожним рядком тексту.
 *
 * Категорія: ptashatski-pisni (ПТАШАЦЬКІ ПІСНІ)
 * Зберігає НАПРЯМУ в MongoDB, не видаляючи наявних пісень.
 *
 * Запуск:
 *   node src/scripts/scrapePtashata.js            # додати нові, пропустити наявні
 *   node src/scripts/scrapePtashata.js --update    # також оновити наявні
 */

const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const Song = require('../models/Song');
const User = require('../models/User');
require('dotenv').config();

const PAGE_URL = 'https://plastzv.org.ua/songs';
const FILTER_LABEL = 'Пташата';
const CATEGORY = 'ptashatski-pisni';

// Рівномірно розставляє список акордів над символами одного рядка.
// chord j → charIndex ≈ round(j * len / n), з гарантією зростання позицій.
function distributeChords(text, chords) {
  const len = (text || '').length;
  const n = chords.length;
  if (!n || !len) return [];
  const positions = [];
  let prev = -1;
  for (let j = 0; j < n; j++) {
    let idx = Math.round((j * len) / n);
    if (idx <= prev) idx = prev + 1;
    if (idx > len - 1) idx = len - 1;
    positions.push({ chord: chords[j], charIndex: idx });
    prev = idx;
  }
  return positions;
}

// Текст пісні → структура секцій. Порожній рядок розділяє куплети.
// Загальні акорди рівномірно розставляються над кожним рядком.
function buildStructure(lyrics, chords) {
  const blocks = (lyrics || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/);

  const sections = [];
  let number = 1;

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map(l => l.replace(/\s+$/, ''))
      .filter(l => l.trim().length > 0);

    if (!lines.length) continue;

    sections.push({
      type: 'verse',
      number: number++,
      repeat: 1,
      lines: lines.map(text => ({
        text,
        chordPositions: distributeChords(text, chords),
        isChorus: false
      }))
    });
  }

  return sections;
}

function buildLyrics(structure) {
  return structure
    .map(section => {
      const title = `Куплет ${section.number}:`;
      return `${title}\n${section.lines.map(l => l.text).join('\n')}`;
    })
    .join('\n\n');
}

// Витягує всі пісні розділу через браузер.
async function fetchSongs() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    console.log(`🌐 Відкриваю ${PAGE_URL}`);
    await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 2500));

    // Клік на фільтр "Пташата"
    const clicked = await page.evaluate((label) => {
      const b = Array.from(document.querySelectorAll('button'))
        .find(el => el.textContent.trim() === label);
      if (b) { b.click(); return true; }
      return false;
    }, FILTER_LABEL);
    if (!clicked) throw new Error(`Не знайдено кнопку фільтра "${FILTER_LABEL}"`);
    await new Promise(r => setTimeout(r, 2000));

    const triggerIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button[data-radix-collection-item]')).map(t => t.id)
    );
    console.log(`🔗 Знайдено ${triggerIds.length} пісень у розділі "${FILTER_LABEL}"`);

    const songs = [];
    for (const id of triggerIds) {
      // eslint-disable-next-line no-await-in-loop
      const data = await page.evaluate(async (triggerId) => {
        const trigger = document.getElementById(triggerId);
        if (!trigger) return null;
        if (trigger.getAttribute('data-state') !== 'open') trigger.click();
        await new Promise(r => setTimeout(r, 400));

        const controls = trigger.getAttribute('aria-controls');
        const region = controls ? document.getElementById(controls) : null;
        const scope = region || document;

        const title = (trigger.querySelector('h3')?.textContent || '').trim();

        // Блок загальних акордів: items-center + gap-3 + flex-wrap
        const chordsEl = Array.from(scope.querySelectorAll('div')).find(d =>
          d.className && d.className.includes('items-center') &&
          d.className.includes('gap-3') && d.className.includes('flex-wrap'));

        let chords = [];
        if (chordsEl) {
          chords = chordsEl.innerText
            .split(/\s+/)
            .map(s => s.trim())
            .filter(s => s && !/акорд/i.test(s) && s !== ':');
        }

        const pre = scope.querySelector('.bg-muted\\/50 pre') || scope.querySelector('pre');
        const lyrics = pre ? pre.textContent : '';

        return { title, chords, lyrics };
      }, id);

      if (data && data.title && data.lyrics.trim()) {
        songs.push(data);
      }
    }

    return songs;
  } finally {
    await browser.close();
  }
}

async function main() {
  const shouldUpdate = process.argv.includes('--update');

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    console.log('🐣 Скрапінг розділу "Пташата" (plastzv.org.ua → ptashatski-pisni)');

    const songs = await fetchSongs();

    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook'
    );
    console.log('✅ Підключено до MongoDB');

    let importUser = await User.findOne({ email: 'import@plast.org' });
    if (!importUser) {
      importUser = new User({ email: 'import@plast.org', name: 'JSON Import User' });
      await importUser.save();
    }

    for (const song of songs) {
      try {
        const sourceUrl = `${PAGE_URL}#${encodeURIComponent(song.title)}`;
        const existing = await Song.findOne({
          $or: [{ sourceUrl }, { title: song.title, category: CATEGORY }]
        });

        if (existing && !shouldUpdate) {
          console.log(`⏭️  Вже існує, пропускаємо: ${song.title}`);
          skipped++;
          continue;
        }

        const structure = buildStructure(song.lyrics, song.chords);
        if (structure.length === 0) {
          console.log(`⚠️  Немає тексту, пропускаємо: ${song.title}`);
          errors++;
          continue;
        }

        const doc = {
          title: song.title,
          author: 'Невідомий',
          lyrics: buildLyrics(structure),
          structure,
          youtubeUrl: '',
          category: CATEGORY,
          tags: ['ptashata', 'plastzv.org.ua', 'structured'],
          isPublic: true,
          createdBy: importUser._id,
          sourceUrl,
          metadata: { words: '', music: '', performer: '' }
        };

        if (existing) {
          await Song.updateOne({ _id: existing._id }, { $set: doc });
          updated++;
          console.log(`♻️  Оновлено: ${song.title} (акордів: ${song.chords.length})`);
        } else {
          await new Song(doc).save();
          added++;
          console.log(`✅ Додано: ${song.title} (акордів: ${song.chords.length})`);
        }
      } catch (error) {
        console.error(`❌ Помилка "${song.title}":`, error.message);
        errors++;
      }
    }

    console.log('\n🎉 Готово!');
    console.log(`   ✅ Додано:     ${added}`);
    console.log(`   ♻️  Оновлено:   ${updated}`);
    console.log(`   ⏭️  Пропущено:  ${skipped}`);
    console.log(`   ❌ Помилок:    ${errors}`);
    console.log(
      `   📊 Всього "${CATEGORY}" у базі: ${await Song.countDocuments({ category: CATEGORY })}`
    );
  } catch (error) {
    console.error('❌ Скрапінг не вдався:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 З’єднання з базою закрито');
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, buildStructure, distributeChords };
