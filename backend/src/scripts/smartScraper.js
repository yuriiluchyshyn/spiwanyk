const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const mongoose = require('mongoose');
const Song = require('../models/Song');
const User = require('../models/User');
require('dotenv').config();

class SmartSongScraper {
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
    this.delay = 3000;
    this.browser = null;
  }

  async initBrowser() {
    console.log('🚀 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Browser launched');
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔌 Browser closed');
    }
  }

  // Розумний аналіз HTML структури пісні
  parseStructuredSong(html) {
    const $ = cheerio.load(html);
    
    // Видаляємо заголовки та зайві елементи
    $('h2, script, style').remove();
    
    const structure = [];
    let currentSection = null;
    let verseNumber = 1;
    let chorusNumber = 1;
    
    // Розбираємо по параграфах та br тегах
    $('p').each((i, element) => {
      const $p = $(element);
      const content = $p.html();
      
      if (!content || content.trim().length < 10) return;
      
      // Розділяємо по <br> тегах, зберігаючи &nbsp; як пробіли
      const lines = content.split(/<br\s*\/?>/i);
      
      for (let lineHtml of lines) {
        // Зберігаємо відступи з &nbsp;
        const lineWithSpaces = lineHtml.replace(/&nbsp;/g, ' ');
        const line = this.cleanLinePreserveSpaces(lineWithSpaces);
        
        if (!line || line.trim().length === 0) continue;
        
        // Аналізуємо тип рядка
        const lineAnalysis = this.analyzeLine(line, $);
        
        // Визначаємо чи це новий розділ
        if (this.isNewSection(lineAnalysis, currentSection)) {
          // Зберігаємо попередній розділ
          if (currentSection && currentSection.lines.length > 0) {
            structure.push(currentSection);
          }
          
          // Створюємо новий розділ
          currentSection = {
            type: lineAnalysis.isChorus ? 'chorus' : 'verse',
            number: lineAnalysis.isChorus ? chorusNumber : verseNumber,
            lines: [],
            repeat: 1
          };
          
          if (lineAnalysis.isChorus) {
            chorusNumber++;
          } else {
            verseNumber++;
          }
        }
        
        // Додаємо рядок до поточного розділу
        if (currentSection) {
          currentSection.lines.push({
            text: line.trim(), // Зберігаємо очищений текст
            chords: '',
            isChorus: lineAnalysis.isChorus
          });
        }
      }
    });
    
    // Додаємо останній розділ
    if (currentSection && currentSection.lines.length > 0) {
      structure.push(currentSection);
    }
    
    return structure;
  }

  // Розумний аналіз структури з акордами
  parseStructuredSongWithChords(lyricsHtml, chordsHtml) {
    const lyricsStructure = this.parseStructuredSong(lyricsHtml);
    
    if (!chordsHtml) return lyricsStructure;
    
    // Парсимо акорди
    const chordsLines = this.parseChordsLines(chordsHtml);
    
    // Поєднуємо тексти з акордами
    return this.mergeLyricsWithChords(lyricsStructure, chordsLines);
  }

  // Парсинг акордів з HTML
  parseChordsLines(html) {
    const $ = cheerio.load(html);
    $('h2, script, style').remove();
    
    const chordsLines = [];
    
    $('p').each((i, element) => {
      const $p = $(element);
      const content = $p.html();
      
      if (!content) return;
      
      // Розділяємо по <br> тегах, зберігаючи &nbsp;
      const lines = content.split(/<br\s*\/?>/i);
      
      for (let lineHtml of lines) {
        // Зберігаємо пробіли як індикатори позицій акордів
        const line = lineHtml
          .replace(/&nbsp;/g, ' ')
          .replace(/<[^>]*>/g, '')
          .replace(/\s+$/, ''); // Видаляємо пробіли в кінці
        
        if (line.trim()) {
          chordsLines.push(line);
        }
      }
    });
    
    return chordsLines;
  }

  // Поєднання текстів з акордами
  mergeLyricsWithChords(lyricsStructure, chordsLines) {
    let chordLineIndex = 0;
    
    for (let section of lyricsStructure) {
      for (let line of section.lines) {
        // Шукаємо відповідний рядок з акордами
        while (chordLineIndex < chordsLines.length) {
          const chordLine = chordsLines[chordLineIndex];
          
          // Перевіряємо чи це рядок з акордами
          if (this.isChordLine(chordLine)) {
            // Наступний рядок може бути текстом
            if (chordLineIndex + 1 < chordsLines.length) {
              const nextLine = chordsLines[chordLineIndex + 1];
              if (this.linesMatch(line.text, nextLine)) {
                line.chords = chordLine;
                chordLineIndex += 2; // Пропускаємо обидва рядки
                break;
              }
            }
            chordLineIndex++;
          } else {
            // Перевіряємо чи цей рядок відповідає нашому тексту
            if (this.linesMatch(line.text, chordLine)) {
              chordLineIndex++;
              break;
            }
            chordLineIndex++;
          }
        }
      }
    }
    
    return lyricsStructure;
  }

  // Перевірка чи рядок містить акорди
  isChordLine(line) {
    if (!line || line.trim().length === 0) return false;
    
    const chordPattern = /\b[A-G][#b]?[m]?[0-9]?[sus]?[add]?[dim]?[aug]?\b/g;
    const chords = line.match(chordPattern) || [];
    const words = line.trim().split(/\s+/);
    
    // Якщо більше 50% слів - акорди
    return chords.length > 0 && (chords.length / words.length) > 0.5;
  }

  // Перевірка схожості рядків
  linesMatch(line1, line2) {
    if (!line1 || !line2) return false;
    
    const clean1 = line1.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const clean2 = line2.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    return clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1);
  }

  // Очищення рядка від HTML зі збереженням пробілів
  cleanLinePreserveSpaces(html) {
    if (!html) return '';
    
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+$/, ''); // Видаляємо пробіли тільки в кінці
  }

  // Очищення рядка від HTML
  cleanLine(html) {
    if (!html) return '';
    
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  // Аналіз типу рядка
  analyzeLine(line, $) {
    const analysis = {
      isChorus: false,
      isVerse: true,
      hasIndentation: false,
      isEmpty: false
    };
    
    if (!line || line.trim().length === 0) {
      analysis.isEmpty = true;
      return analysis;
    }
    
    // Перевіряємо на відступи (приспів) - шукаємо багато пробілів на початку
    const leadingSpaces = line.match(/^(\s*)/)[1].length;
    if (leadingSpaces >= 7 || line.startsWith('\t')) {
      analysis.isChorus = true;
      analysis.isVerse = false;
      analysis.hasIndentation = true;
    }
    
    // Перевіряємо на ключові слова
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('приспів') || lowerLine.includes('chorus')) {
      analysis.isChorus = true;
      analysis.isVerse = false;
    }
    
    // Перевіряємо на повторювані рядки (часто приспіви)
    const cleanLine = line.trim().toLowerCase();
    if (cleanLine.includes('117 стаття') && cleanLine.includes('доля')) {
      analysis.isChorus = true;
      analysis.isVerse = false;
    }
    
    return analysis;
  }

  // Перевірка чи потрібен новий розділ
  isNewSection(lineAnalysis, currentSection) {
    if (!currentSection) return true;
    
    // Якщо змінився тип (куплет/приспів)
    if (currentSection.type === 'verse' && lineAnalysis.isChorus) return true;
    if (currentSection.type === 'chorus' && !lineAnalysis.isChorus) return true;
    
    // Якщо куплет став занадто довгим
    if (currentSection.type === 'verse' && currentSection.lines.length >= 6) return true;
    
    return false;
  }

  // Основний метод парсингу пісні
  async fetchStructuredSong(songUrl, title) {
    try {
      console.log(`🎵 Fetching structured song: ${title}`);
      
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      await page.setViewport({ width: 1280, height: 720 });
      
      await page.goto(songUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      let songData = {
        title: title,
        author: '',
        lyrics: '',
        chords: '',
        structure: [],
        youtubeUrl: ''
      };

      // Витягуємо автора з назви
      const titleMatch = title.match(/^(.+?)\s*[-–]\s*(.+)$/);
      if (titleMatch) {
        songData.title = titleMatch[1].trim();
        songData.author = titleMatch[2].trim();
      }

      // Отримуємо HTML слів
      let lyricsHtml = '';
      try {
        const lyricsTab = await page.$('#tab-slova');
        if (lyricsTab) {
          await lyricsTab.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          lyricsHtml = await page.$eval('#slova', el => el.innerHTML).catch(() => '');
        }
      } catch (error) {
        console.log('⚠️  No lyrics tab found');
      }

      // Отримуємо HTML акордів
      let chordsHtml = '';
      try {
        const chordsTab = await page.$('#tab-akordy');
        if (chordsTab) {
          await chordsTab.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          chordsHtml = await page.$eval('#akordy', el => el.innerHTML).catch(() => '');
        }
      } catch (error) {
        console.log('⚠️  No chords tab found');
      }

      // Отримуємо YouTube URL
      try {
        const videoTab = await page.$('#tab-video');
        if (videoTab) {
          await videoTab.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
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
        console.log('⚠️  No video tab found');
      }

      // Парсимо структуру пісні
      if (lyricsHtml) {
        songData.structure = this.parseStructuredSongWithChords(lyricsHtml, chordsHtml);
        
        // Створюємо простий текст для зворотної сумісності
        songData.lyrics = this.structureToPlainText(songData.structure);
        songData.chords = this.structureToChords(songData.structure);
        
        console.log(`📊 Parsed structure: ${songData.structure.length} sections`);
      }

      await page.close();
      return songData;

    } catch (error) {
      console.error(`❌ Error fetching structured song:`, error.message);
      return null;
    }
  }

  // Конвертація структури в простий текст
  structureToPlainText(structure) {
    return structure.map(section => {
      const sectionTitle = section.type === 'chorus' ? 'Приспів:' : `Куплет ${section.number}:`;
      const lines = section.lines.map(line => line.text).join('\n');
      return `${sectionTitle}\n${lines}`;
    }).join('\n\n');
  }

  // Конвертація структури в акорди
  structureToChords(structure) {
    return structure.map(section => {
      const lines = section.lines
        .filter(line => line.chords)
        .map(line => `${line.chords}\n${line.text}`)
        .join('\n');
      return lines;
    }).filter(section => section).join('\n\n');
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
      console.error('Error cleaning YouTube URL:', error);
      return '';
    }
  }

  // Основний метод парсингу всіх пісень
  async scrapeSongs() {
    try {
      console.log('🎵 Starting smart song scraping from pryvatri.de...');
      
      await this.initBrowser();
      
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
      console.log('✅ Connected to MongoDB');

      let defaultUser = await User.findOne({ email: 'scraper@plast.org' });
      if (!defaultUser) {
        defaultUser = new User({
          email: 'scraper@plast.org',
          name: 'Smart Pryvatri.de Scraper'
        });
        await defaultUser.save();
      }

      let totalSuccess = 0;
      let totalErrors = 0;

      // Парсимо кожну секцію
      for (const [sectionName, category] of Object.entries(this.sections)) {
        console.log(`\n📂 Processing section: ${sectionName} (${category})`);
        
        const sectionUrl = `${this.baseUrl}/${sectionName}`;
        const sectionHtml = await this.fetchPageWithAxios(sectionUrl);
        
        if (!sectionHtml) {
          console.log(`❌ Failed to fetch section: ${sectionName}`);
          continue;
        }

        const $ = cheerio.load(sectionHtml);
        const songLinks = this.extractSongLinks($, sectionName);
        
        console.log(`🔗 Found ${songLinks.length} songs in ${sectionName}`);

        // Обробляємо перші 3 пісні з кожної секції для тестування
        for (let i = 0; i < Math.min(songLinks.length, 3); i++) {
          const songLink = songLinks[i];
          
          try {
            if (i > 0) await new Promise(resolve => setTimeout(resolve, this.delay));

            const existingSong = await Song.findOne({ 
              title: songLink.title
            });

            if (existingSong) {
              console.log(`⏭️  Song already exists: ${songLink.title}`);
              continue;
            }

            console.log(`🎵 Processing: ${songLink.title}`);
            
            const songData = await this.fetchStructuredSong(songLink.url, songLink.title);
            if (!songData) {
              totalErrors++;
              continue;
            }

            if (!songData.structure || songData.structure.length === 0) {
              console.log(`⚠️  Skipping song with no structure: ${songData.title}`);
              totalErrors++;
              continue;
            }

            // Створюємо нову пісню з структурою
            const newSong = new Song({
              title: songData.title,
              author: songData.author || 'Невідомий',
              lyrics: songData.lyrics || '',
              chords: songData.chords || '',
              structure: songData.structure,
              youtubeUrl: songData.youtubeUrl || '',
              category: category,
              tags: [category, 'pryvatri.de', 'structured'],
              isPublic: true,
              createdBy: defaultUser._id
            });

            await newSong.save();
            totalSuccess++;
            
            console.log(`✅ Saved: ${songData.title} (${songData.structure.length} sections)`);

          } catch (error) {
            console.error(`❌ Error processing ${songLink.title}:`, error.message);
            totalErrors++;
          }
        }
      }

      console.log(`\n🎉 Smart scraping completed!`);
      console.log(`✅ Successfully added: ${totalSuccess} songs`);
      console.log(`❌ Errors: ${totalErrors}`);

    } catch (error) {
      console.error('❌ Scraping failed:', error);
    } finally {
      await this.closeBrowser();
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }

  // Допоміжний метод для отримання списку пісень
  async fetchPageWithAxios(url) {
    try {
      console.log(`📄 Fetching with Axios: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 15000
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching ${url}:`, error.message);
      return null;
    }
  }

  extractSongLinks($, sectionName) {
    const links = [];
    
    $('a[href*="/' + sectionName + '/"]').each((i, element) => {
      const href = $(element).attr('href');
      const title = $(element).text().trim();
      
      if (href && title && href.includes('/' + sectionName + '/') && !href.endsWith('/' + sectionName)) {
        const fullUrl = href.startsWith('http') ? href : this.baseUrl + href;
        links.push({
          url: fullUrl,
          title: title
        });
      }
    });
    
    return links;
  }

  // Тестування на одній пісні
  async testSingleSong() {
    try {
      await this.initBrowser();
      
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
      console.log('✅ Connected to MongoDB');

      const testUrl = 'https://pryvatri.de/avtorski/433-117-ctattya';
      const testTitle = '117 стаття';
      
      const songData = await this.fetchStructuredSong(testUrl, testTitle);
      
      if (songData) {
        console.log('\n🎉 Parsed song data:');
        console.log('Title:', songData.title);
        console.log('Author:', songData.author);
        console.log('Structure sections:', songData.structure.length);
        
        songData.structure.forEach((section, i) => {
          console.log(`\nSection ${i + 1}: ${section.type} ${section.number}`);
          console.log(`Lines: ${section.lines.length}`);
          section.lines.forEach((line, j) => {
            console.log(`  ${j + 1}: ${line.text.substring(0, 50)}...`);
            if (line.chords) {
              console.log(`     Chords: ${line.chords.substring(0, 30)}...`);
            }
          });
        });
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      await this.closeBrowser();
      await mongoose.connection.close();
    }
  }
}

// Запуск парсингу
if (require.main === module) {
  const scraper = new SmartSongScraper();
  
  // Перевіряємо аргументи командного рядка
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    // Тестування на одній пісні
    scraper.testSingleSong();
  } else {
    // Повний парсинг
    scraper.scrapeSongs();
  }
}

module.exports = SmartSongScraper;