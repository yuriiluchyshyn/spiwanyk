const mongoose = require('mongoose');
const Song = require('../models/Song');
require('dotenv').config();

class FormattingImprover {
  constructor() {
    this.chordPattern = /\b[A-G][#b]?[m]?[0-9]?[sus]?[add]?[dim]?[aug]?\b/g;
  }

  // Покращення форматування тексту пісні
  improveTextFormatting(text) {
    if (!text) return text;
    
    return text
      // Нормалізація розривів рядків
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      
      // Видалення зайвих пробілів, але збереження структури
      .replace(/[ \t]+/g, ' ')
      
      // Покращення розривів між куплетами/приспівами
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      
      // Видалення повторень (2x), (x2) але збереження структури
      .replace(/\s*\(2x\)|\(x2\)\s*/g, '')
      
      // Покращення пунктуації
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/([,.!?;:])\s*/g, '$1 ')
      
      // Видалення зайвих пробілів на початку та в кінці рядків
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      
      // Видалення зайвих порожніх рядків на початку та в кінці
      .replace(/^\n+/, '')
      .replace(/\n+$/, '')
      
      // Забезпечення правильних розривів між секціями
      .replace(/\n([А-ЯІЇЄҐ][а-яіїєґ']*:)/g, '\n\n$1') // Заголовки секцій
      .trim();
  }

  // Розділення тексту з акордами
  separateChordsAndLyrics(text) {
    if (!text) return { lyrics: '', chords: '' };
    
    const lines = text.split('\n');
    const chordLines = [];
    const lyricLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
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
    
    return {
      lyrics: this.improveTextFormatting(lyricLines.join('\n')),
      chords: chordLines.join('\n')
    };
  }

  // Перевірка чи рядок містить тільки акорди
  isChordLine(line) {
    if (!line || !line.trim()) return false;
    
    const words = line.trim().split(/\s+/);
    const chordWords = words.filter(word => 
      /^[A-G][#b]?[m]?[0-9]?[sus]?[add]?[dim]?[aug]?$/.test(word)
    );
    
    // Якщо більше 60% слів - акорди і є принаймні 2 акорди
    return chordWords.length / words.length > 0.6 && chordWords.length >= 2;
  }

  // Покращення структури пісні
  improveStructure(text) {
    if (!text) return text;
    
    const lines = text.split('\n');
    const improvedLines = [];
    let inChorus = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        improvedLines.push('');
        continue;
      }
      
      // Розпізнавання приспіву (повторювані рядки)
      const isRepeated = lines.filter(l => l.trim() === line).length > 1;
      
      if (isRepeated && !inChorus && line.length > 10) {
        // Початок приспіву
        if (improvedLines.length > 0 && improvedLines[improvedLines.length - 1] !== '') {
          improvedLines.push(''); // Додати розрив перед приспівом
        }
        inChorus = true;
      }
      
      improvedLines.push(line);
      
      // Кінець приспіву
      if (inChorus && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !lines.filter(l => l.trim() === nextLine).length > 1) {
          inChorus = false;
          improvedLines.push(''); // Додати розрив після приспіву
        }
      }
    }
    
    return improvedLines.join('\n').replace(/\n\n\n+/g, '\n\n');
  }

  async improveAllSongs() {
    try {
      console.log('📝 Starting formatting improvement process...');
      
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
      console.log('✅ Connected to MongoDB');

      const songs = await Song.find({});
      console.log(`📚 Found ${songs.length} songs to improve`);

      let improvedCount = 0;
      let chordsExtractedCount = 0;

      for (const song of songs) {
        try {
          let wasUpdated = false;
          
          // Покращення форматування тексту
          if (song.lyrics) {
            const originalLyrics = song.lyrics;
            
            // Якщо немає акордів, спробувати витягти їх з тексту
            if (!song.chords) {
              const chordMatches = song.lyrics.match(this.chordPattern);
              if (chordMatches && chordMatches.length > 5) {
                const { lyrics, chords } = this.separateChordsAndLyrics(song.lyrics);
                if (chords.trim()) {
                  song.chords = chords;
                  song.lyrics = lyrics;
                  chordsExtractedCount++;
                  wasUpdated = true;
                  console.log(`🎸 Extracted chords: ${song.title}`);
                }
              }
            }
            
            // Покращення структури тексту
            const improvedLyrics = this.improveStructure(
              this.improveTextFormatting(song.lyrics)
            );
            
            if (improvedLyrics !== originalLyrics) {
              song.lyrics = improvedLyrics;
              wasUpdated = true;
            }
          }
          
          // Покращення форматування акордів
          if (song.chords) {
            const improvedChords = this.improveTextFormatting(song.chords);
            if (improvedChords !== song.chords) {
              song.chords = improvedChords;
              wasUpdated = true;
            }
          }
          
          if (wasUpdated) {
            await song.save();
            improvedCount++;
            console.log(`✅ Improved: ${song.title}`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${song.title}:`, error.message);
        }
      }

      console.log(`\n🎉 Formatting improvement completed!`);
      console.log(`✅ Improved: ${improvedCount} songs`);
      console.log(`🎸 Extracted chords: ${chordsExtractedCount} songs`);
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
  const improver = new FormattingImprover();
  improver.improveAllSongs();
}

module.exports = FormattingImprover;