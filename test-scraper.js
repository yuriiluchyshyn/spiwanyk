// Простий тест скрапера
const SongScraper = require('./backend/src/scripts/scrapeSongs');

async function testScraper() {
  console.log('🧪 Тестування скрапера...');
  
  const scraper = new SongScraper();
  
  // Тест отримання сторінки
  const html = await scraper.fetchPage('https://pryvatri.de/avtorski');
  if (html) {
    console.log('✅ Успішно отримано головну сторінку');
    console.log(`📄 Розмір HTML: ${html.length} символів`);
  } else {
    console.log('❌ Не вдалося отримати головну сторінку');
  }
}

testScraper().catch(console.error);