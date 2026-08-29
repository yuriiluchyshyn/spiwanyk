#!/usr/bin/env node

/**
 * Скрапер розділу "Пластові пісні" з сайту pisennyk.com.ua.
 *
 * Особливості сайту:
 *   - Список пісень на сторінці розділу віддається лише частково (~57),
 *     тому повний перелік беремо із sitemap (усі канонічні сторінки пісень).
 *   - Текст з акордами лежить у <div class="interpretation-content">, де акорди
 *     вбудовані інлайн як <code class="an" data-local="Em">Em</code> на точній
 *     позиції над літерою. Назва пісні — у <h1><strong>…</strong></h1>.
 *   - Весь потрібний контент є у статичному HTML, тож використовуємо
 *     axios + cheerio (без браузера) і скануємо в 10 паралельних потоках.
 *
 * Логіка збереження:
 *   - Перед збереженням перевіряємо, чи вже є така пісня в базі (за назвою або
 *     sourceUrl). Якщо є — НЕ зберігаємо.
 *   - Наприкінці виводимо: скільки знайдено, скільки збережено та список
 *     пісень, які не збережено (з причиною).
 *
 * Джерело:   https://pisennyk.com.ua/plastovi-pisni
 * Категорія: plast (ТАБІРНІ / ПЛАСТОВІ ПІСНІ)
 *
 * Запуск:
 *   node src/scripts/scrapePlastPisennyk.js
 */

const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const Song = require('../models/Song');
const User = require('../models/User');
require('dotenv').config();

const BASE_URL = 'https://pisennyk.com.ua';
const SECTION_PATH = 'plastovi-pisni';
const CATEGORY = 'plast';
const CONCURRENCY = 10;

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

const http = axios.create({
  headers: { 'User-Agent': UA, 'Accept-Language': 'uk,en;q=0.8' },
  timeout: 25000
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * GET з повторними спробами та експоненційним backoff на 429/5xx.
 * Поважає заголовок Retry-After, якщо він є.
 */
async function getWithRetry(url, maxRetries = 6) {
  let attempt = 0;
  // невеликий випадковий старт-джитер, щоб 10 воркерів не били синхронно
  await sleep(Math.floor(Math.random() * 400));
  for (;;) {
    try {
      return await http.get(url);
    } catch (error) {
      const status = error.response?.status;
      const retriable = status === 429 || (status >= 500 && status <= 599);
      if (!retriable || attempt >= maxRetries) throw error;
      attempt++;
      const retryAfter = parseInt(error.response?.headers?.['retry-after'], 10);
      const wait = Number.isFinite(retryAfter)
        ? retryAfter * 1000
        : Math.min(30000, 1500 * 2 ** attempt) + Math.floor(Math.random() * 800);
      await sleep(wait);
    }
  }
}

/**
 * Збирає повний список канонічних URL пісень розділу із sitemap-файлів.
 * Канонічна сторінка пісні: /plastovi-pisni/<slug> (без додаткового /<number>
 * та без службової сторінки /teksty).
 */
async function collectSongUrls() {
  const indexRes = await http.get(`${BASE_URL}/sitemap.xml`);
  const sitemapFiles = [...indexRes.data.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1])
    .filter((u) => /sitemap-interpretations-\d+\.xml$/.test(u));

  const urls = new Set();
  await Promise.all(
    sitemapFiles.map(async (file) => {
      try {
        const res = await http.get(file);
        for (const m of res.data.matchAll(/<loc>([^<]+)<\/loc>/g)) {
          const u = m[1];
          if (
            new RegExp(`/${SECTION_PATH}/[a-z0-9-]+$`).test(u) &&
            !/\/teksty$/.test(u)
          ) {
            urls.add(u);
          }
        }
      } catch (e) {
        // Пропускаємо недоступний sitemap-файл
      }
    })
  );

  return [...urls].sort();
}

/**
 * Парсить сторінку пісні: назву та рядки тексту з позиційними акордами.
 */
function parseSongHtml(html) {
  const $ = cheerio.load(html);
  const title = $('h1 strong').first().text().trim();

  const container = $('.interpretation-content').first();
  if (!container.length) return { title, lines: [] };

  // 1) Розкладаємо DOM у впорядкований потік токенів: text / chord / br
  const tokens = [];
  const walk = (node) => {
    if (!node || !node.children) return;
    node.children.forEach((child) => {
      if (child.type === 'text') {
        tokens.push({ t: 'text', v: child.data });
      } else if (child.name === 'br') {
        tokens.push({ t: 'br' });
      } else if (
        child.name === 'code' &&
        ($(child).attr('class') || '').includes('an')
      ) {
        tokens.push({
          t: 'chord',
          v: ($(child).attr('data-local') || $(child).text() || '').trim()
        });
      } else {
        walk(child);
      }
    });
  };
  walk(container.get(0));

  // 2) Складаємо рядки
  const rawLines = [];
  let cur = { text: '', chords: [] };
  for (const tok of tokens) {
    if (tok.t === 'br') {
      rawLines.push(cur);
      cur = { text: '', chords: [] };
    } else if (tok.t === 'text') {
      cur.text += (tok.v || '').replace(/\u00A0/g, ' ');
    } else if (tok.t === 'chord' && tok.v) {
      cur.chords.push({ chord: tok.v, charIndex: cur.text.length });
    }
  }
  rawLines.push(cur);

  // 3) Нормалізуємо: обрізаємо хвостові пробіли, зсуваємо індекси за відступ,
  //    визначаємо приспів за відступом.
  const lines = rawLines.map((l) => {
    let text = l.text.replace(/\s+$/, '');
    const lead = text.length - text.replace(/^\s+/, '').length;
    text = text.slice(lead);
    const chords = l.chords
      .map((c) => ({ chord: c.chord, charIndex: Math.max(0, c.charIndex - lead) }))
      .filter((c) => c.chord);
    return { text, chordPositions: chords, isChorus: lead >= 2 };
  });

  return { title, lines };
}

/**
 * Групує рядки у секції (structure) за порожніми рядками-роздільниками.
 */
function buildStructure(lines) {
  const blocks = [];
  let block = [];
  for (const line of lines) {
    const empty = !line.text && line.chordPositions.length === 0;
    if (empty) {
      if (block.length) blocks.push(block);
      block = [];
    } else {
      block.push(line);
    }
  }
  if (block.length) blocks.push(block);

  let verseNo = 0;
  let chorusNo = 0;
  return blocks.map((blk) => {
    const chorusMarker = /^\[?(приспів|п-в)\]?:?/i.test(blk[0].text.trim());
    const indented = blk.filter((l) => l.isChorus).length > blk.length / 2;
    const isChorus = chorusMarker || indented;
    const type = isChorus ? 'chorus' : 'verse';
    const number = isChorus ? ++chorusNo : ++verseNo;
    return {
      type,
      number,
      repeat: 1,
      lines: blk.map((l) => ({
        text: l.text,
        chordPositions: l.chordPositions,
        isChorus
      }))
    };
  });
}

/**
 * Legacy-текст для зворотної сумісності.
 */
function buildLyrics(structure) {
  return structure
    .map((section) => {
      const sectionTitle =
        section.type === 'chorus' ? 'Приспів:' : `Куплет ${section.number}:`;
      const body = section.lines.map((l) => l.text).join('\n');
      return `${sectionTitle}\n${body}`;
    })
    .join('\n\n');
}

/**
 * Черга із фіксованою кількістю паралельних воркерів.
 */
async function runPool(items, size, worker) {
  let idx = 0;
  const runNext = async () => {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: size }, runNext));
}

async function main() {
  const stats = {
    found: 0,
    saved: 0,
    notSaved: [] // { title, url, reason }
  };

  try {
    console.log('🔱 Скрапінг "Пластові пісні" з pisennyk.com.ua (→ plast)');

    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook'
    );
    console.log('✅ Підключено до MongoDB');

    let importUser = await User.findOne({ email: 'import@plast.org' });
    if (!importUser) {
      importUser = await new User({
        email: 'import@plast.org',
        name: 'JSON Import User'
      }).save();
      console.log('👤 Створено користувача для імпорту');
    }

    console.log('🗺️  Збираю список пісень із sitemap...');
    const urls = await collectSongUrls();
    stats.found = urls.length;
    console.log(`🔗 Знайдено пісень: ${stats.found}\n`);

    await runPool(urls, CONCURRENCY, async (url) => {
      let title = url.split('/').pop();
      try {
        // Дешева перевірка ще до мережі: якщо цей URL уже збережено — пропускаємо
        const bySource = await Song.findOne({ sourceUrl: url }).select('_id');
        if (bySource) {
          stats.notSaved.push({ title, url, reason: 'вже існує в базі' });
          console.log(`⏭️  Вже існує (URL): ${title}`);
          return;
        }

        const res = await getWithRetry(url);
        const parsed = parseSongHtml(res.data);
        title = parsed.title || title;

        if (!parsed.lines.some((l) => l.text)) {
          stats.notSaved.push({ title, url, reason: 'немає тексту' });
          console.log(`⚠️  Немає тексту: ${title}`);
          return;
        }

        // Перевірка дубліката за назвою або URL джерела
        const existing = await Song.findOne({
          $or: [{ sourceUrl: url }, { title }]
        });
        if (existing) {
          stats.notSaved.push({ title, url, reason: 'вже існує в базі' });
          console.log(`⏭️  Вже існує: ${title}`);
          return;
        }

        const structure = buildStructure(parsed.lines);
        const lyrics = buildLyrics(structure);

        await new Song({
          title,
          author: 'Невідомий',
          lyrics,
          structure,
          youtubeUrl: '',
          category: CATEGORY,
          tags: [SECTION_PATH, 'plast', 'pisennyk.com.ua', 'structured'],
          isPublic: true,
          createdBy: importUser._id,
          sourceUrl: url,
          metadata: { words: '', music: '', performer: '' }
        }).save();

        stats.saved++;
        console.log(`✅ Збережено: ${title} (${structure.length} секцій)`);
      } catch (error) {
        stats.notSaved.push({ title, url, reason: `помилка: ${error.message}` });
        console.log(`❌ Помилка: ${title} — ${error.message}`);
      }
    });

    // ----- Підсумок -----
    console.log('\n========== ПІДСУМОК ==========');
    console.log(`🔍 Знайдено пісень:   ${stats.found}`);
    console.log(`✅ Збережено:         ${stats.saved}`);
    console.log(`🚫 Не збережено:      ${stats.notSaved.length}`);
    if (stats.notSaved.length) {
      console.log('\nСписок пісень, які НЕ збережено:');
      stats.notSaved.forEach((s, i) =>
        console.log(`  ${i + 1}. ${s.title}  —  ${s.reason}`)
      );
    }
    console.log(
      `\n📊 Всього "${CATEGORY}" у базі: ${await Song.countDocuments({
        category: CATEGORY
      })}`
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

module.exports = { main, parseSongHtml, buildStructure };
