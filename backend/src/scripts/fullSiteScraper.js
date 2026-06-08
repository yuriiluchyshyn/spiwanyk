#!/usr/bin/env node

/**
 * Повний скрипт для скрапінгу ВСІХ пісень з сайту pryvatri.de
 * Збереже всі пісні в JSON файл для подальшого використання
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class FullSiteScraper {
  constructor() {
    this.baseUrl = 'https://pryvatri.de';
    this.sections = {
      'avtorski': 'author',
      'plastovi': 'plast', 
      'povstanski': 'uprising',
      'narodni': 'folk',
      'lemkivski': 'lemko',
      'novacki': 'christmas'
    };
    this.browser = null;
    this.scrapedSongs = [];
    this.errors = [];
    this.skippedSongs = [];
    this.delay = 2000; // 2 секунди між запитами
    this.maxRetries = 3;
    this.totalProcessed = 0;
  }

  async initBrowser() {
    console.log('🚀 Запуск браузера...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security'
      ]
    });
    console.log('✅ Браузер запущено');
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔌 Браузер закрито');
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Отримання списку пісень з розділу
  async fetchSectionSongs(sectionName) {
    try {
      const sectionUrl = `${this.baseUrl}/${sectionName}`;
      console.log(`📂 Сканування розділу: ${sectionName} - ${sectionUrl}`);
      
      const response = await axios.get(sectionUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'uk,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const songLinks = [];
      
      // Шукаємо всі посилання на пісні в цьому розділі
      $('a[href*="/' + sectionName + '/"]').each((i, element) => {
        const href = $(element).attr('href');
        const title = $(element).text().trim();
        
        if (href && title && 
            href.includes('/' + sectionName + '/') && 
            !href.endsWith('/' + sectionName) &&
            title.length > 1) {
          
          const fullUrl = href.startsWith('http') ? href : this.baseUrl + href;
          songLinks.push({ 
            url: fullUrl, 
            title: title,
            section: sectionName 
          });
        }
      });
      
      // Видаляємо дублікати
      const uniqueLinks = songLinks.filter((link, index, self) => 
        index === self.findIndex(l => l.url === link.url)
      );
      
      console.log(`🔗 Знайдено ${uniqueLinks.length} унікальних пісень у ${sectionName}`);
      return uniqueLinks;
      
    } catch (error) {
      console.error(`❌ Помилка отримання списку пісень з ${sectionName}:`, error.message);
      return [];
    }
  }

  // Парсинг окремої пісні
  async scrapeSong(songUrl, title, category, retryCount = 0) {
    try {
      console.log(`🎵 [${this.totalProcessed + 1}] Обробка: ${title}`);
      
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      await page.setViewport({ width: 1280, height: 720 });
      
      // Налаштування timeout і обробка помилок
      await page.goto(songUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      await this.delay(1500); // Чекаємо завантаження

      let songData = {
        title: title,
        author: '',
        category: category,
        url: songUrl,
        youtubeUrl: '',
        metadata: {
          words: '',
          music: '',
          performer: ''
        },
        structure: [],
        rawLyrics: '',
        rawChords: '',
        scrapedAt: new Date().toISOString()
      };

      // Парсимо автора з назви
      const titleMatch = title.match(/^(.+?)\s+[-–]\s+(.+)$/);
      if (titleMatch) {
        songData.author = titleMatch[1].trim();
        songData.title = titleMatch[2].trim();
      }

      // Отримуємо текст пісні
      let lyricsHtml = '';
      try {
        const lyricsTab = await page.$('#tab-slova');
        if (lyricsTab) {
          await lyricsTab.click();
          await this.delay(1000);
          lyricsHtml = await page.$eval('#slova', el => el.innerHTML).catch(() => '');
        }
      } catch (error) {
        console.log('   ⚠️  Немає вкладки з текстом');
      }

      // Отримуємо акорди
      let chordsHtml = '';
      try {
        const chordsTab = await page.$('#tab-akordy');
        if (chordsTab) {
          await chordsTab.click();
          await this.delay(1000);
          chordsHtml = await page.$eval('#akordy', el => el.innerHTML).catch(() => '');
        }
      } catch (error) {
        console.log('   ⚠️  Немає вкладки з акордами');
      }

      // Отримуємо метадані
      try {
        const infoTab = await page.$('#tab-info');
        if (infoTab) {
          await infoTab.click();
          await this.delay(1000);
          
          const infoData = await page.evaluate(() => {
            const infoDiv = document.getElementById('info');
            if (!infoDiv) return { words: '', music: '', performer: '' };
            
            const text = infoDiv.innerText || '';
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            const result = { words: '', music: '', performer: '' };
            
            for (let i = 0; i < lines.length; i++) {
              const lowerLine = lines[i].toLowerCase();
              
              if (lowerLine === 'слова:' || lowerLine === 'слова') {
                if (i + 1 < lines.length) result.words = lines[i + 1];
              } else if (lowerLine.startsWith('слова:')) {
                result.words = lines[i].substring(6).trim();
              }
              
              if (lowerLine === 'музика:' || lowerLine === 'музика') {
                if (i + 1 < lines.length) result.music = lines[i + 1];
              } else if (lowerLine.startsWith('музика:')) {
                result.music = lines[i].substring(7).trim();
              }
              
              if (lowerLine.match(/^(виконання|виконує|виконавець):/)) {
                const colonIndex = lines[i].indexOf(':');
                if (colonIndex !== -1) {
                  result.performer = lines[i].substring(colonIndex + 1).trim();
                }
              } else if (lowerLine === 'виконання:' || lowerLine === 'виконує:' || lowerLine === 'виконавець:') {
                if (i + 1 < lines.length) result.performer = lines[i + 1];
              }
            }
            return result;
          });
          
          songData.metadata = infoData;
        }
      } catch (error) {
        console.log('   ⚠️  Немає вкладки з інформацією');
      }

      // Отримуємо YouTube посилання
      try {
        const videoTab = await page.$('#tab-video');
        if (videoTab) {
          await videoTab.click();
          await this.delay(1000);
          
          const youtubeUrl = await page.evaluate(() => {
            const videoTab = document.getElementById('video');
            if (!videoTab) return '';
            
            const iframe = videoTab.querySelector('iframe[src*="youtube"]');
            if (iframe) return iframe.src;
            
            const link = videoTab.querySelector('a[href*="youtube"], a[href*="youtu.be"]');
            if (link) return link.href;
            
            return '';
          });

          if (youtubeUrl) {
            songData.youtubeUrl = this.cleanYouTubeUrl(youtubeUrl);
          }
        }
      } catch (error) {
        console.log('   ⚠️  Немає вкладки з відео');
      }

      // Обробляємо структуру пісні
      if (lyricsHtml || chordsHtml) {
        const optimalContent = this.selectOptimalContent(lyricsHtml, chordsHtml);
        songData.structure = await this.parseStructure(optimalContent.content, optimalContent.hasChords);
        songData.rawLyrics = this.extractCleanText(lyricsHtml);
        songData.rawChords = this.extractCleanText(chordsHtml);
        
        console.log(`   📊 Розбито на ${songData.structure.length} секцій`);
      }

      await page.close();
      this.totalProcessed++;
      
      console.log(`   ✅ Успішно: ${songData.title} (${this.totalProcessed})`);
      return songData;

    } catch (error) {
      console.error(`   ❌ Помилка обробки ${title}:`, error.message);
      
      // Retry логіка
      if (retryCount < this.maxRetries) {
        console.log(`   🔄 Спроба ${retryCount + 1}/${this.maxRetries} для ${title}`);
        await this.delay(this.delay * 2); // Подвоюємо затримку
        return await this.scrapeSong(songUrl, title, category, retryCount + 1);
      }
      
      this.errors.push({
        url: songUrl,
        title: title,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return null;
    }
  }

  // Вибір оптимального контенту (тексту чи акордів)
  selectOptimalContent(lyricsHtml, chordsHtml) {
    const lyricsLines = this.extractLinesFromHtml(lyricsHtml);
    const chordsLines = this.extractLinesFromHtml(chordsHtml);

    const hasChords = chordsLines.some(line => this.isChordLine(line));

    if (hasChords && chordsLines.length > 0) {
      console.log('   🎸 Використовуємо версію з акордами');
      return { content: chordsHtml, type: 'chords', hasChords: true };
    } else if (lyricsLines.length > 0) {
      console.log('   📝 Використовуємо версію тільки з текстом');
      return { content: lyricsHtml, type: 'lyrics', hasChords: false };
    } else {
      console.log('   ⚠️  Контент не знайдено');
      return { content: '', type: 'empty', hasChords: false };
    }
  }

  // Парсинг структури пісні
  async parseStructure(html, hasChords) {
    if (!html) return [];
    
    const lines = this.extractLinesFromHtml(html);
    if (lines.length === 0) return [];

    const sections = [];
    let currentSection = null;
    let verseNumber = 1;
    let chorusNumber = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const isChorusLine = this.isChorusLine(line);
      
      // Визначаємо чи потрібна нова секція
      if (!currentSection || 
          (currentSection.type === 'verse' && isChorusLine) ||
          (currentSection.type === 'chorus' && !isChorusLine) ||
          (currentSection.lines.length >= 8)) {
        
        if (currentSection && currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        
        const sectionType = isChorusLine ? 'chorus' : 'verse';
        currentSection = {
          type: sectionType,
          number: sectionType === 'chorus' ? chorusNumber++ : verseNumber++,
          repeat: 1,
          lines: []
        };
      }
      
      // Додаємо рядок до секції
      currentSection.lines.push({
        text: line,
        chords: '',
        chordPositions: [],
        isChorus: isChorusLine
      });
    }

    if (currentSection && currentSection.lines.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }

  // Витягування рядків з HTML
  extractLinesFromHtml(html) {
    if (!html) return [];

    const $ = cheerio.load(html);
    $('h2, script, style').remove();

    const lines = [];
    
    $('p').each((i, element) => {
      const $p = $(element);
      const content = $p.html();
      
      if (!content) return;
      
      const htmlLines = content.split(/<br\s*\/?>/i);
      for (let lineHtml of htmlLines) {
        const line = lineHtml
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&nbsp;/g, ' ')
          .replace(/[\r\n]+/g, '')
          .trim();
        
        if (line.length > 0) {
          lines.push(line);
        }
      }
    });

    return lines;
  }

  // Перевірка чи рядок містить акорди
  isChordLine(line) {
    if (!line || line.trim().length === 0) return false;
    const chordPattern = /\b[A-G][#b]?[m]?[0-9]?[sus]?[add]?[dim]?[aug]?\b/g;
    const chords = line.match(chordPattern) || [];
    const words = line.trim().split(/\s+/);
    return chords.length > 0 && (chords.length / words.length) > 0.4;
  }

  // Перевірка чи це приспів
  isChorusLine(text) {
    const lowerText = text.toLowerCase().trim();
    
    if (lowerText.startsWith('приспів') || 
        lowerText.startsWith('п-в') || 
        lowerText.includes('[приспів]') ||
        lowerText.includes('(приспів)')) {
      return true;
    }

    if (text.startsWith('    ') || text.startsWith('\t')) {
      return true;
    }

    return false;
  }

  // Витягування чистого тексту
  extractCleanText(html) {
    if (!html) return '';
    
    const $ = cheerio.load(html);
    $('script, style').remove();
    
    let text = $.text();
    
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/\s+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim();
  }

  // Очищення YouTube URL
  cleanYouTubeUrl(url) {
    if (!url) return '';
    
    try {
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
      
      if (url.includes('youtube.com/embed/')) {
        const videoId = url.split('youtube.com/embed/')[1].split('?')[0];
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
      
      if (url.includes('youtube.com/watch')) {
        return url.split('&')[0];
      }
      
      return url;
    } catch (error) {
      console.error('Помилка очищення YouTube URL:', error);
      return '';
    }
  }

  // Збереження результатів у JSON
  async saveToJson() {
    try {
      const dataDir = path.join(__dirname, '../../data');
      await fs.mkdir(dataDir, { recursive: true });
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `full-site-scrape-${timestamp}.json`;
      const filepath = path.join(dataDir, filename);
      
      const output = {
        metadata: {
          scrapedAt: new Date().toISOString(),
          totalSongs: this.scrapedSongs.length,
          totalErrors: this.errors.length,
          totalSkipped: this.skippedSongs.length,
          sections: Object.keys(this.sections),
          version: '2.0.0',
          scraper: 'FullSiteScraper'
        },
        statistics: {
          byCategory: {},
          withYouTube: 0,
          withChords: 0,
          withStructure: 0,
          withMetadata: 0
        },
        songs: this.scrapedSongs,
        errors: this.errors,
        skipped: this.skippedSongs
      };

      // Рахуємо статистику
      this.scrapedSongs.forEach(song => {
        // За категоріями
        output.statistics.byCategory[song.category] = 
          (output.statistics.byCategory[song.category] || 0) + 1;
        
        // З YouTube
        if (song.youtubeUrl) output.statistics.withYouTube++;
        
        // З акордами
        if (song.rawChords) output.statistics.withChords++;
        
        // Зі структурою
        if (song.structure && song.structure.length > 0) output.statistics.withStructure++;
        
        // З метаданими
        if (song.metadata.words || song.metadata.music || song.metadata.performer) {
          output.statistics.withMetadata++;
        }
      });

      await fs.writeFile(filepath, JSON.stringify(output, null, 2), 'utf8');
      console.log(`💾 Збережено у файл: ${filepath}`);
      
      // Також зберігаємо як останню версію
      const latestPath = path.join(dataDir, 'full-site-latest.json');
      await fs.writeFile(latestPath, JSON.stringify(output, null, 2), 'utf8');
      console.log(`💾 Остання версія: ${latestPath}`);
      
      return filepath;
      
    } catch (error) {
      console.error('❌ Помилка збереження JSON:', error);
      throw error;
    }
  }

  // Основний метод скрапінгу
  async scrapeFullSite() {
    try {
      console.log('🎵 Початок повного скрапінгу сайту pryvatri.de...');
      console.log(`📂 Розділи для обробки: ${Object.keys(this.sections).join(', ')}`);
      
      await this.initBrowser();
      
      const startTime = Date.now();
      let totalSongs = 0;

      // Обробляємо кожен розділ
      for (const [sectionName, category] of Object.entries(this.sections)) {
        console.log(`\n📂 === РОЗДІЛ: ${sectionName.toUpperCase()} (${category}) ===`);
        
        const songLinks = await this.fetchSectionSongs(sectionName);
        totalSongs += songLinks.length;
        
        if (songLinks.length === 0) {
          console.log(`⚠️  Не знайдено пісень у розділі ${sectionName}`);
          continue;
        }

        console.log(`🎯 Обробляємо ${songLinks.length} пісень...`);
        
        // Обробляємо пісні з цього розділу
        for (let i = 0; i < songLinks.length; i++) {
          const songLink = songLinks[i];
          
          // Додаємо затримку між запитами
          if (i > 0) await this.delay(this.delay);
          
          const songData = await this.scrapeSong(songLink.url, songLink.title, category);
          
          if (songData) {
            // Перевіряємо чи не дублікат
            const existing = this.scrapedSongs.find(s => 
              s.title === songData.title && s.author === songData.author
            );
            
            if (!existing) {
              this.scrapedSongs.push(songData);
            } else {
              this.skippedSongs.push({
                url: songLink.url,
                title: songLink.title,
                reason: 'Дублікат',
                timestamp: new Date().toISOString()
              });
            }
          }
        }
        
        console.log(`✅ Розділ ${sectionName} завершено. Знайдено: ${songLinks.length}, Оброблено: ${this.scrapedSongs.filter(s => s.category === category).length}`);
      }

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.log('\n🎉 === СКРАПІНГ ЗАВЕРШЕНО ===');
      console.log(`⏱️  Час виконання: ${Math.floor(duration / 60)}хв ${duration % 60}с`);
      console.log(`📊 Загальна статистика:`);
      console.log(`   🔍 Знайдено пісень: ${totalSongs}`);
      console.log(`   ✅ Успішно оброблено: ${this.scrapedSongs.length}`);
      console.log(`   ❌ Помилок: ${this.errors.length}`);
      console.log(`   ⏭️  Пропущено: ${this.skippedSongs.length}`);
      
      // Статистика по розділах
      console.log(`\n📂 По розділах:`);
      Object.values(this.sections).forEach(category => {
        const count = this.scrapedSongs.filter(s => s.category === category).length;
        console.log(`   ${category}: ${count} пісень`);
      });

    } catch (error) {
      console.error('❌ Критична помилка скрапінгу:', error);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

  // Показати довідку
  static showHelp() {
    console.log(`
🎵 Повний скрапер сайту pryvatri.de

Використання:
  node src/scripts/fullSiteScraper.js [опції]

Опції:
  --help          Показати цю довідку
  --test          Тестовий режим (тільки 2 пісні з кожного розділу)
  --section name  Обробити тільки один розділ (avtorski, plastovi, povstanski, narodni, lemkivski, novacki)

Приклади:
  node src/scripts/fullSiteScraper.js
  node src/scripts/fullSiteScraper.js --test  
  node src/scripts/fullSiteScraper.js --section plastovi

Результат зберігається у папці backend/data/
    `);
  }
}

// Запуск скрипта
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      FullSiteScraper.showHelp();
      return;
    }
    
    const scraper = new FullSiteScraper();
    
    // Тестовий режим - обмеження кількості пісень
    if (args.includes('--test')) {
      console.log('🧪 ТЕСТОВИЙ РЕЖИМ - обробляються тільки перші 2 пісні з кожного розділу');
      const originalScrapeFullSite = scraper.scrapeFullSite;
      scraper.scrapeFullSite = async function() {
        // Переписуємо метод для тестування
        await this.initBrowser();
        
        for (const [sectionName, category] of Object.entries(this.sections)) {
          console.log(`\n📂 ТЕСТ: ${sectionName} (${category})`);
          
          const songLinks = await this.fetchSectionSongs(sectionName);
          const testLinks = songLinks.slice(0, 2); // Тільки перші 2
          
          for (let i = 0; i < testLinks.length; i++) {
            if (i > 0) await this.delay(1000);
            const songData = await this.scrapeSong(testLinks[i].url, testLinks[i].title, category);
            if (songData) {
              this.scrapedSongs.push(songData);
            }
          }
        }
        
        await this.closeBrowser();
      };
    }
    
    // Режим одного розділу
    const sectionIndex = args.findIndex(arg => arg === '--section');
    if (sectionIndex !== -1 && args[sectionIndex + 1]) {
      const singleSection = args[sectionIndex + 1];
      if (scraper.sections[singleSection]) {
        console.log(`🎯 Обробка тільки розділу: ${singleSection}`);
        scraper.sections = { [singleSection]: scraper.sections[singleSection] };
      } else {
        console.error(`❌ Невірний розділ: ${singleSection}`);
        console.log(`Доступні розділи: ${Object.keys(scraper.sections).join(', ')}`);
        return;
      }
    }
    
    await scraper.scrapeFullSite();
    const filepath = await scraper.saveToJson();
    
    console.log(`\n🎉 Скрапінг успішно завершено!`);
    console.log(`📁 Файл збережено: ${filepath}`);
    
  } catch (error) {
    console.error('💥 Критична помилка:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = FullSiteScraper;