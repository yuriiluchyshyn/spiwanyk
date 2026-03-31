const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const Song = require('../models/Song');
const User = require('../models/User');
require('dotenv').config();

class AdvancedSongScraper {
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
    this.delay = 3000; // 3 second delay between requests
    this.browser = null;
  }

  async initBrowser() {
    console.log('� Launching browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    console.log('✅ Browser launched');
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔌 Browser closed');
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchPageWithAxios(url) {
    try {
      console.log(`📄 Fetching with Axios: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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
    
    // Look for links in the song list table
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

  async fetchSongContentWithPuppeteer(songUrl, title) {
    try {
      console.log(`🎵 Fetching with Puppeteer: ${title}`);
      
      const page = await this.browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1280, height: 720 });
      
      // Navigate to the page
      await page.goto(songUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      let songData = {
        title: title,
        author: '',
        lyrics: '',
        chords: '',
        youtubeUrl: '',
        tags: []
      };

      // Extract author from title if present
      const titleMatch = title.match(/^(.+?)\s*[-–]\s*(.+)$/);
      if (titleMatch) {
        songData.title = titleMatch[1].trim();
        songData.author = titleMatch[2].trim();
      }

      // Wait for page to load completely
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract lyrics from "slova" tab
      console.log('📝 Extracting lyrics...');
      try {
        // Click on lyrics tab if it exists
        const lyricsTabExists = await page.$('#tab-slova');
        if (lyricsTabExists) {
          await page.click('#tab-slova');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Get lyrics content
        const lyricsContent = await page.$eval('#slova', el => el.innerHTML).catch(() => '');
        if (lyricsContent) {
          songData.lyrics = this.extractCleanText(lyricsContent);
        }
      } catch (error) {
        console.log('⚠️  No lyrics tab found');
      }

      // Extract chords from "akordy" tab
      console.log('🎸 Extracting chords...');
      try {
        // Click on chords tab if it exists
        const chordsTabExists = await page.$('#tab-akordy');
        if (chordsTabExists) {
          await page.click('#tab-akordy');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Get chords content
        const chordsContent = await page.$eval('#akordy', el => el.innerHTML).catch(() => '');
        if (chordsContent) {
          songData.chords = this.extractChordsWithPositions(chordsContent);
        }
      } catch (error) {
        console.log('⚠️  No chords tab found');
      }

      // Extract YouTube URL from "video" tab
      console.log('📺 Extracting video...');
      try {
        // Click on video tab if it exists
        const videoTabExists = await page.$('#tab-video');
        if (videoTabExists) {
          await page.click('#tab-video');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Look for YouTube iframe or links
        const youtubeUrl = await page.evaluate(() => {
          const videoTab = document.getElementById('video');
          if (!videoTab) return '';

          // Check for iframe
          const iframe = videoTab.querySelector('iframe[src*="youtube"]');
          if (iframe) {
            return iframe.src;
          }

          // Check for links
          const link = videoTab.querySelector('a[href*="youtube"], a[href*="youtu.be"]');
          if (link) {
            return link.href;
          }

          return '';
        });

        if (youtubeUrl) {
          songData.youtubeUrl = this.cleanYouTubeUrl(youtubeUrl);
        }
      } catch (error) {
        console.log('⚠️  No video tab found');
      }

      await page.close();
      return songData;

    } catch (error) {
      console.error(`❌ Error fetching song content:`, error.message);
      return null;
    }
  }

  // Extract clean text from HTML, preserving structure
  extractCleanText(html) {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style').remove();
    
    // Get text content and clean it up
    let text = $.text();
    
    return text
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive whitespace but preserve structure
      .replace(/[ \t]+/g, ' ')
      // Preserve paragraph breaks
      .replace(/\n\s*\n/g, '\n\n')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      // Remove leading/trailing whitespace
      .trim();
  }

  // Extract chords with their positions relative to lyrics
  extractChordsWithPositions(html) {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style').remove();
    
    // Get the raw HTML content and preserve spacing
    let content = $.html();
    
    // Convert HTML to text while preserving chord positions
    content = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Preserve chord positioning spaces
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return content;
  }

  // Clean and validate YouTube URL
  cleanYouTubeUrl(url) {
    if (!url) return '';
    
    try {
      // Handle different YouTube URL formats
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
      
      if (url.includes('youtube.com/embed/')) {
        const videoId = url.split('youtube.com/embed/')[1].split('?')[0];
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
      
      if (url.includes('youtube.com/watch')) {
        return url.split('&')[0]; // Remove extra parameters
      }
      
      return url;
    } catch (error) {
      console.error('Error cleaning YouTube URL:', error);
      return '';
    }
  }

  async scrapeSongs() {
    try {
      console.log('🎵 Starting advanced song scraping from pryvatri.de...');
      
      // Initialize browser
      await this.initBrowser();
      
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
      console.log('✅ Connected to MongoDB');

      // Get or create default user
      let defaultUser = await User.findOne({ email: 'scraper@plast.org' });
      if (!defaultUser) {
        defaultUser = new User({
          email: 'scraper@plast.org',
          name: 'Pryvatri.de Advanced Scraper'
        });
        await defaultUser.save();
      }

      let totalSuccess = 0;
      let totalErrors = 0;

      // Scrape each section
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

        // Process first 5 songs per section for testing
        for (let i = 0; i < Math.min(songLinks.length, 5); i++) {
          const songLink = songLinks[i];
          
          try {
            // Add delay to be respectful
            if (i > 0) await new Promise(resolve => setTimeout(resolve, this.delay));

            // Check if song already exists
            const existingSong = await Song.findOne({ 
              title: songLink.title
            });

            if (existingSong) {
              console.log(`⏭️  Song already exists: ${songLink.title}`);
              continue;
            }

            console.log(`🎵 Processing: ${songLink.title}`);
            
            const songData = await this.fetchSongContentWithPuppeteer(songLink.url, songLink.title);
            if (!songData) {
              totalErrors++;
              continue;
            }

            // Skip if no meaningful content
            if (!songData.lyrics && !songData.chords) {
              console.log(`⚠️  Skipping song with no content: ${songData.title}`);
              totalErrors++;
              continue;
            }

            // Create new song
            const newSong = new Song({
              title: songData.title,
              author: songData.author || 'Невідомий',
              lyrics: songData.lyrics || '',
              chords: songData.chords || '',
              youtubeUrl: songData.youtubeUrl || '',
              category: category,
              tags: [category, 'pryvatri.de'],
              isPublic: true,
              createdBy: defaultUser._id
            });

            await newSong.save();
            totalSuccess++;
            
            console.log(`✅ Saved: ${songData.title} by ${songData.author || 'Невідомий'}`);

          } catch (error) {
            console.error(`❌ Error processing ${songLink.title}:`, error.message);
            totalErrors++;
          }
        }
      }

      console.log(`\n🎉 Advanced scraping completed!`);
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
}

// Run if called directly
if (require.main === module) {
  const scraper = new AdvancedSongScraper();
  scraper.scrapeSongs();
}

module.exports = AdvancedSongScraper;