const DetailedSongScraper = require('./src/scripts/detailedScraper.js');

async function testSingleSong() {
  const scraper = new DetailedSongScraper();
  
  try {
    await scraper.initBrowser();
    
    // Тестуємо пісню "8-ий колір"
    console.log('🎵 Testing song: 8-ий колір');
    const result = await scraper.scrapeSong('https://pryvatri.de/avtorski/434-8-iy-kolir', '8-ий колір', 'author');
    
    console.log('\n📊 Full result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await scraper.closeBrowser();
  }
}

testSingleSong();