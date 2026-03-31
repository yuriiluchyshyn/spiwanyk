const DetailedSongScraper = require('./src/scripts/detailedScraper.js');

async function testChordPositions() {
  const scraper = new DetailedSongScraper();
  
  try {
    await scraper.initBrowser();
    
    // Тестуємо пісню "8-ий колір" яка має акорди
    console.log('🎵 Testing song: 8-ий колір');
    const result = await scraper.scrapeSong('https://pryvatri.de/avtorski/434-8-iy-kolir', '8-ий колір', 'author');
    
    if (result && result.structure) {
      console.log('\n📊 Song structure found with', result.structure.length, 'sections');
      
      // Знаходимо рядки з акордами
      let foundChords = false;
      for (let si = 0; si < result.structure.length; si++) {
        const section = result.structure[si];
        console.log(`\n🎼 Section ${si + 1} (${section.type}):`);
        
        for (let li = 0; li < section.lines.length; li++) {
          const line = section.lines[li];
          if (line.chordPositions && line.chordPositions.length > 0) {
            console.log(`  ✅ Line ${li + 1}: "${line.text}"`);
            console.log(`     Chords:`, line.chordPositions);
            foundChords = true;
          } else if (line.text) {
            console.log(`  📝 Line ${li + 1}: "${line.text}" (no chords)`);
          }
        }
      }
      
      if (!foundChords) {
        console.log('\n❌ No chord positions found in any line');
      }
    } else {
      console.log('❌ No structure found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await scraper.closeBrowser();
  }
}

testChordPositions();