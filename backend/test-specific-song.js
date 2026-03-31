const DetailedSongScraper = require('./src/scripts/detailedScraper.js');

async function testSpecificSong() {
  const scraper = new DetailedSongScraper();
  
  try {
    await scraper.initBrowser();
    
    // Тестуємо пісню, яка точно має акорди
    console.log('🎵 Testing song with chords');
    const result = await scraper.scrapeSong('https://pryvatri.de/avtorski/433-117-ctattya', '117 стаття', 'author');
    
    if (result) {
      console.log('\n📊 Song result:');
      console.log('Title:', result.title);
      console.log('Author:', result.author);
      console.log('Structure sections:', result.structure.length);
      
      if (result.structure.length > 0) {
        console.log('\n🎼 First section:');
        const firstSection = result.structure[0];
        console.log('Type:', firstSection.type);
        console.log('Lines:', firstSection.lines.length);
        
        if (firstSection.lines.length > 0) {
          const firstLine = firstSection.lines[0];
          console.log('\n📝 First line:');
          console.log('Text:', JSON.stringify(firstLine.text));
          console.log('Chord positions:', firstLine.chordPositions);
        }
      }
    } else {
      console.log('❌ No result returned');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await scraper.closeBrowser();
  }
}

testSpecificSong();