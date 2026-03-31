const mongoose = require('mongoose');
const Song = require('../models/Song');
require('dotenv').config();

class YouTubeUrlFixer {
  constructor() {
    this.validUrlPattern = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)/;
  }

  // Clean and validate YouTube URL
  cleanYouTubeUrl(url) {
    if (!url || url === 'undefined' || url === 'null') return '';
    
    try {
      // Handle different YouTube URL formats
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
        if (videoId && videoId.length === 11) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
      }
      
      if (url.includes('youtube.com/embed/')) {
        const videoId = url.split('youtube.com/embed/')[1].split('?')[0].split('&')[0];
        if (videoId && videoId.length === 11) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
      }
      
      if (url.includes('youtube.com/watch')) {
        // Extract video ID and rebuild clean URL
        const match = url.match(/[?&]v=([^&]+)/);
        if (match && match[1] && match[1].length === 11) {
          return `https://www.youtube.com/watch?v=${match[1]}`;
        }
      }
      
      // If it starts with // add https:
      if (url.startsWith('//')) {
        const fullUrl = 'https:' + url;
        if (this.validUrlPattern.test(fullUrl)) {
          return this.cleanYouTubeUrl(fullUrl); // Recursive clean
        }
      }
      
      // If it's already a valid YouTube URL, return as is
      if (this.validUrlPattern.test(url)) {
        return url;
      }
      
      return '';
    } catch (error) {
      console.error('Error cleaning YouTube URL:', error);
      return '';
    }
  }

  async fixAllUrls() {
    try {
      console.log('🔧 Starting YouTube URL fixing process...');
      
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
      console.log('✅ Connected to MongoDB');

      // Find all songs with YouTube URLs
      const songs = await Song.find({
        $or: [
          { youtubeUrl: { $ne: '' } },
          { youtubeUrl: { $exists: true } }
        ]
      });

      console.log(`📚 Found ${songs.length} songs with YouTube URLs to check`);

      let fixedCount = 0;
      let removedCount = 0;

      for (const song of songs) {
        try {
          const originalUrl = song.youtubeUrl;
          const cleanedUrl = this.cleanYouTubeUrl(originalUrl);
          
          if (cleanedUrl !== originalUrl) {
            song.youtubeUrl = cleanedUrl;
            await song.save();
            
            if (cleanedUrl) {
              console.log(`✅ Fixed: ${song.title}`);
              console.log(`   From: ${originalUrl}`);
              console.log(`   To: ${cleanedUrl}`);
              fixedCount++;
            } else {
              console.log(`🗑️  Removed invalid URL: ${song.title} (${originalUrl})`);
              removedCount++;
            }
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${song.title}:`, error.message);
        }
      }

      console.log(`\n🎉 YouTube URL fixing completed!`);
      console.log(`✅ Fixed: ${fixedCount} URLs`);
      console.log(`🗑️  Removed: ${removedCount} invalid URLs`);
      console.log(`📊 Total processed: ${songs.length} songs`);

    } catch (error) {
      console.error('❌ Process failed:', error);
    } finally {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const fixer = new YouTubeUrlFixer();
  fixer.fixAllUrls();
}

module.exports = YouTubeUrlFixer;