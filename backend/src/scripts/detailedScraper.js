const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class DetailedSongScraper {
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

  parseChordsLine(chordsStr) {
    if (!chordsStr || !chordsStr.trim()) return [];

    const positions = [];
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

  selectOptimalContent(lyricsHtml, chordsHtml) {
    const lyricsLines = this.extractLinesFromHtml(lyricsHtml);
    const chordsLines = this.extractLinesFromHtml(chordsHtml);

    const hasChords = chordsLines.some(line => this.isChordLine(line));

    if (hasChords && chordsLines.length > 0) {
      console.log('   ✅ Found chords - using chords content');
      return { content: chordsHtml, type: 'chords', hasChords: true };
    } else if (lyricsLines.length > 0) {
      console.log('   📝 No chords - using lyrics content');
      return { content: lyricsHtml, type: 'lyrics', hasChords: false };
    } else {
      console.log('   ⚠️  No content found');
      return { content: '', type: 'empty', hasChords: false };
    }
  }

  async analyzeStructure(page, contentHtml, hasChords) {
    if (!contentHtml) return [];
    const lines = this.extractLinesFromHtml(contentHtml);
    if (lines.length === 0) return [];

    if (hasChords) {
      return await this.parseContentWithChords(page, lines);
    } else {
      return this.parseContentWithoutChords(lines);
    }
  }

  async parseContentWithChords(page, lines) {
    const combinedLines = [];
    let i = 0;

    while (i < lines.length) {
      const currentLine = lines[i];
      
      if (!currentLine.trim()) {
        i++;
        continue;
      }

      if (this.isChordLine(currentLine)) {
        const chordPositions = this.parseChordsLine(currentLine);
        
        if (i + 1 < lines.length) {
          const textLine = lines[i + 1];
          if (textLine.trim() && !this.isChordLine(textLine)) {
            const syncedChords = await this.synchronizeChordPositions(page, currentLine, textLine, chordPositions);
            
            combinedLines.push({
              text: textLine,
              chords: syncedChords
            });
            i += 2;
            continue;
          }
        }
        
        combinedLines.push({
          text: '',
          chords: chordPositions.map(cp => ({
            chord: cp.chord,
            charIndex: cp.position
          }))
        });
        i++;
      } else {
        combinedLines.push({
          text: currentLine,
          chords: []
        });
        i++;
      }
    }

    return this.groupIntoSections(combinedLines);
  }

  async synchronizeChordPositions(page, chordLine, textLine, chordPositions) {
    if (chordPositions.length === 0) return [];
    
    const measureChordLine = chordLine.replace(/ /g, '\u00A0');
    const measureTextLine = textLine.replace(/ /g, '\u00A0');
    
    const resultIndices = await page.evaluate((chords, text, positions) => {
      const container = document.querySelector('#akordy') || document.body;
      const computedStyle = window.getComputedStyle(container);
      const font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.font = font;
      
      const getWidth = (str) => ctx.measureText(str).width;
      const results = [];
      
      for (const cp of positions) {
        const chordSubstr = chords.substring(0, cp.position);
        const chordPixelPosition = getWidth(chordSubstr);
        
        let remainingPixels = chordPixelPosition;
        let charIndex = 0; 
        
        for (let i = 0; i < text.length; i++) {
          const charWidth = getWidth(text[i]);
          
          if (remainingPixels <= charWidth / 2) {
            charIndex = i;
            break;
          }
          
          remainingPixels -= charWidth;
          charIndex = i + 1; 
        }
        
        if (charIndex >= text.length) charIndex = text.length - 1;
        if (charIndex < 0) charIndex = 0;
        
        results.push({
          chord: cp.chord,
          charIndex: charIndex
        });
      }
      
      return results;
    }, measureChordLine, measureTextLine, chordPositions);
    
    return resultIndices;
  }

  parseContentWithoutChords(lines) {
    const combinedLines = lines
      .filter(line => line.trim())
      .map(line => ({
        text: line,
        chords: []
      }));

    return this.groupIntoSections(combinedLines);
  }

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
        let line = lineHtml
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&nbsp;/g, ' '); 
        
        line = line.replace(/[\r\n]+/g, '').replace(/\s+$/, '');
        
        if (line.trim().length > 0) {
          lines.push(line);
        }
      }
    });

    return lines;
  }

  isChordLine(line) {
    if (!line || line.trim().length === 0) return false;
    const chordPattern = /\b[A-G][#b]?[m]?[0-9]?[sus]?[add]?[dim]?[aug]?\b/g;
    const chords = line.match(chordPattern) || [];
    const words = line.trim().split(/\s+/);
    return chords.length > 0 && (chords.length / words.length) > 0.4;
  }

  groupIntoSections(lines) {
    if (!lines.length) return [];

    const sections = [];
    let currentSection = null;
    let verseNumber = 1;
    let chorusNumber = 1;

    const repeatNumberRegex = /\s*(?:\(|\[)?(?:x|х)?\s*(\d+)\s*(?:рази?|разів|р\.)?(?:\)|\])?$/i;
    const dvichiRegex = /\s*(?:\(|\[)?двічі(?:\)|\])?$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let rawText = line.text;
      let lineRepeat = 1;

      if (dvichiRegex.test(rawText)) {
        lineRepeat = 2;
        rawText = rawText.replace(dvichiRegex, '');
      } else {
        const match = rawText.match(repeatNumberRegex);
        if (match) {
          lineRepeat = parseInt(match[1], 10);
          rawText = rawText.replace(repeatNumberRegex, '');
        }
      }

      const isChorusMarkerOnly = /^\[?(приспів|п-в):?\]?$/i.test(rawText.trim());
      const isChorusLine = this.isChorusLine(line.text); 
      
      if (!currentSection || 
          (currentSection.type === 'verse' && isChorusLine) ||
          (currentSection.type === 'chorus' && !isChorusLine) ||
          (currentSection.lines.length >= 6 && currentSection.type === 'verse')) {
        
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
      
      if (!isChorusMarkerOnly) {
        const safeChords = line.chords.map(cp => {
           return {
             chord: cp.chord,
             charIndex: Math.min(cp.charIndex, Math.max(0, rawText.length - 1))
           };
        });

        currentSection.lines.push({
          text: rawText, 
          chordPositions: safeChords,
          metadata: {
            isChorus: isChorusLine,
            repeat: lineRepeat
          }
        });
      }
    }

    if (currentSection && currentSection.lines.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }

  isChorusLine(text) {
    const lowerText = text.toLowerCase().trim();
    
    if (lowerText.startsWith('приспів') || 
        lowerText.startsWith('п-в') || 
        lowerText.includes('[приспів]') ||
        lowerText.includes('(приспів)')) {
      return true;
    }

    if (lowerText.includes('гей, гей') ||
        lowerText.includes('117 стаття') ||
        lowerText.includes('доля молодьожная')) {
      return true;
    }

    if (text.startsWith('    ') || text.startsWith('\t') || text.startsWith('\u00A0\u00A0\u00A0')) {
      return true;
    }

    return false;
  }

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
      return '';
    }
  }

  async scrapeSong(songUrl, title, category) {
    try {
      console.log(`🎵 Scraping: ${title}`);
      
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      await page.setViewport({ width: 1280, height: 720 });
      
      await page.goto(songUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

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
        structure: []
      };

      const titleMatch = title.match(/^(.+?)\s+[-–]\s+(.+)$/);
      if (titleMatch) {
        songData.author = titleMatch[1].trim();
        songData.title = titleMatch[2].trim();
      } else {
        songData.title = title;
      }

      let lyricsHtml = '';
      try {
        const lyricsTab = await page.$('#tab-slova');
        if (lyricsTab) {
          await lyricsTab.click();
          await new Promise(resolve => setTimeout(resolve, 1500));
          lyricsHtml = await page.$eval('#slova', el => el.innerHTML).catch(() => '');
        }
      } catch (error) {}

      let chordsHtml = '';
      try {
        const chordsTab = await page.$('#tab-akordy');
        if (chordsTab) {
          await chordsTab.click();
          await new Promise(resolve => setTimeout(resolve, 1500));
          chordsHtml = await page.$eval('#akordy', el => el.innerHTML).catch(() => '');
        }
      } catch (error) {}

      // Отримуємо Інфо про авторів
      try {
        const infoTab = await page.$('#tab-info');
        if (infoTab) {
          await infoTab.click();
          await new Promise(resolve => setTimeout(resolve, 1500));
          
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
              
              if (lowerLine === 'виконання:' || lowerLine === 'виконує:' || lowerLine === 'виконавець:') {
                if (i + 1 < lines.length) result.performer = lines[i + 1];
              } else if (lowerLine.match(/^(виконання|виконує|виконавець):/)) {
                result.performer = lines[i].substring(lines[i].indexOf(':') + 1).trim();
              }
            }
            return result;
          });
          
          if (infoData.words || infoData.music || infoData.performer) {
             songData.metadata = {
               words: infoData.words,
               music: infoData.music,
               performer: infoData.performer
             };
             console.log(`   ℹ️  Found Info - Words: ${infoData.words || '-'}, Music: ${infoData.music || '-'}, Performer: ${infoData.performer || '-'}`);
          }
        }
      } catch (error) {
        console.log('⚠️  No info tab or error parsing it');
      }

      try {
        const videoTab = await page.$('#tab-video');
        if (videoTab) {
          await videoTab.click();
          await new Promise(resolve => setTimeout(resolve, 1500));
          
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
      } catch (error) {}

      if (lyricsHtml || chordsHtml) {
        const optimalContent = this.selectOptimalContent(lyricsHtml, chordsHtml);
        songData.structure = await this.analyzeStructure(page, optimalContent.content, optimalContent.hasChords);
        console.log(`📊 Parsed ${songData.structure.length} sections using ${optimalContent.type}`);
      }

      await page.close();
      return songData;

    } catch (error) {
      console.error(`❌ Error scraping ${title}:`, error.message);
      return null;
    }
  }

  async fetchSectionSongs(sectionName) {
    try {
      const sectionUrl = `${this.baseUrl}/${sectionName}`;
      console.log(`📂 Fetching section: ${sectionName}`);
      
      const response = await axios.get(sectionUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const songLinks = [];
      
      $('a[href*="/' + sectionName + '/"]').each((i, element) => {
        const href = $(element).attr('href');
        const title = $(element).text().trim();
        
        if (href && title && href.includes('/' + sectionName + '/') && !href.endsWith('/' + sectionName)) {
          const fullUrl = href.startsWith('http') ? href : this.baseUrl + href;
          songLinks.push({ url: fullUrl, title: title });
        }
      });
      
      return songLinks;
    } catch (error) {
      return [];
    }
  }

  async scrapeAllSongs() {
    try {
      console.log('🎵 Starting detailed song scraping...');
      await this.initBrowser();
      
      let totalScraped = 0;
      const maxSongs = 5; // Збільш або прибери цей ліміт, коли будеш готовий скрепити все
      
      for (const [sectionName, category] of Object.entries(this.sections)) {
        if (totalScraped >= maxSongs) break;
        
        console.log(`\n📂 Processing section: ${sectionName} (${category})`);
        const songLinks = await this.fetchSectionSongs(sectionName);
        
        for (let i = 0; i < songLinks.length && totalScraped < maxSongs; i++) {
          const songLink = songLinks[i];
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 2000));

          const songData = await this.scrapeSong(songLink.url, songLink.title, category);
          if (songData && songData.structure.length > 0) {
            this.scrapedSongs.push(songData);
            totalScraped++;
            console.log(`✅ Added: ${songData.title} (${totalScraped}/${maxSongs})`);
          }
        }
      }

      console.log(`\n🎉 Scraping completed! Total songs: ${this.scrapedSongs.length}`);
    } catch (error) {
      console.error('❌ Scraping failed:', error);
    } finally {
      await this.closeBrowser();
    }
  }

  async saveToJson() {
    try {
      const dataDir = path.join(__dirname, '../../data');
      await fs.mkdir(dataDir, { recursive: true });
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `scraped-songs-${timestamp}.json`;
      const filepath = path.join(dataDir, filename);
      
      const output = {
        metadata: {
          scrapedAt: new Date().toISOString(),
          totalSongs: this.scrapedSongs.length,
          sections: Object.keys(this.sections),
          version: '1.0.5'
        },
        songs: this.scrapedSongs
      };

      await fs.writeFile(filepath, JSON.stringify(output, null, 2), 'utf8');
      console.log(`💾 Saved to: ${filepath}`);
      
      const latestPath = path.join(dataDir, 'latest-songs.json');
      await fs.writeFile(latestPath, JSON.stringify(output, null, 2), 'utf8');
      console.log(`💾 Also saved as: ${latestPath}`);
    } catch (error) {
      console.error('❌ Error saving JSON:', error);
    }
  }
}

async function main() {
  const scraper = new DetailedSongScraper();
  await scraper.scrapeAllSongs();
  await scraper.saveToJson();
}

if (require.main === module) {
  main();
}

module.exports = DetailedSongScraper;