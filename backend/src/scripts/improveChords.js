const mongoose = require('mongoose');
const Song = require('../models/Song');
require('dotenv').config();

class ChordImprover {
  constructor() {
    this.chordPattern = /\b[A-G][#b]?[m]?[0-9]?[sus]?[add]?[dim]?[aug]?\b/g;
  }

  // Розпізнавання рядків з акордами
  isChordLine(line) {
    if (!line || !line.trim()) return false;
    
    const words = line.trim().split(/\s+/);
    const chordWords = words.filter(word => 
      /^[A-G][#b]?[m]?[0-9]?[sus]?[add]?[dim]?[aug]?$/.test(word)
    );
    
    // Якщо більше 50% слів - акорди
    return chordWords.length / words.length > 0.5 && chordWords.length > 1;
  }

  // Витягування акордів з тексту
  extractChords(lyrics) {
    if (!lyrics) return { cleanLyrics: '', chords: '' };
    
    const lines = lyrics.split('\n');
    const chordLines = [];
    const lyricLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (this.isChordLine(line)) {
        chordLines.push(line);
        // Наступний рядок може бути текстом для цих акордів
        if (i + 1 < lines.length && !this.isChordLine(lines[i + 1])) {
          lyricLines.push(lines[i + 1]);
          i++; // Пропустити наступний рядок
        } else {
          lyricLines.push(''); // Порожній рядок для акордів без тексту
        }
      } else {
        lyricLines.push(line);
        chordLines.push(''); // Порожній рядок акордів для тексту
      }
    }
    
    // Видалити акорди з тексту
    const cleanLyrics = lyrics.replace(this.chordPattern, '').replace(/\s+/g, ' ').trim();
    
    return {
      cleanLyrics: lyricLines.join('\n'),
      chords: chordLines.join('\n')
    };
  }

  // Покращення існуючої пісні
  async improveSong(song) {
    let updated = false;
    
    // Якщо немає акордів, але є в тексті
    if (!song.chords && song.lyrics) {
      const chordMatches = song.lyrics.match(this.chordPattern);
      if (chordMatches && chordMatches.length > 3) {
        const { cleanLyrics, chords } = this.extractChords(song.lyrics);
        
        if (chords.trim()) {
          song.chords = chords;
          song.lyrics = cleanLyrics;
          updated = true;
          console.log(`✅ Extracted chords for: ${song.title}`);
        }
      }
    }
    
    // Покращення форматування тексту
    if (song.lyrics) {
      const improvedLyrics = this.improveFormatting(song.lyrics);
      if (improvedLyrics !== song.lyrics) {
        song.lyrics = improvedLyrics;
        updated = true;
        console.log(`📝 Improved formatting for: ${song.title}`);
      }
    }
    
    return updated;
  }

  // Покращення форматування тексту
  improveFormatting(lyrics) {
    if (!lyrics) return lyrics;
    
    return lyrics
      // Видалити зайві пробіли
      .replace(/\s+/g, ' ')
      // Додати розриви рядків після речень
      .replace(/\.\s+/g, '.\n')
      // Видалити повторення (2x), (x2)
      .replace(/\s*\(2x\)|\(x2\)\s*/g, '')
      // Нормалізувати розриви рядків
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  async processAllSongs() {
    try {
      console.log('🎵 Starting chord improvement process...');
      
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
      console.log('✅ Connected to MongoDB');

      const songs = await Song.find({});
      console.log(`📚 Found ${songs.length} songs to process`);

      let improvedCount = 0;

      for (const song of songs) {
        try {
          const wasUpdated = await this.improveSong(song);
          
          if (wasUpdated) {
            await song.save();
            improvedCount++;
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${song.title}:`, error.message);
        }
      }

      console.log(`\n🎉 Improvement completed!`);
      console.log(`✅ Improved: ${improvedCount} songs`);
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
  const improver = new ChordImprover();
  improver.processAllSongs();
}

module.exports = ChordImprover;