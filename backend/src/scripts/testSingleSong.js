const axios = require('axios');
const cheerio = require('cheerio');

async function testSingleSong() {
  const songUrl = 'https://pryvatri.de/avtorski/433-117-ctattya';
  
  console.log('🧪 Testing single song scraping...');
  console.log(`📄 URL: ${songUrl}`);
  
  try {
    // Test different tab URLs
    const tabs = ['', '?tab=slova', '?tab=akordy', '?tab=info', '?tab=video'];
    
    for (const tab of tabs) {
      const testUrl = songUrl + tab;
      console.log(`\n🔍 Testing: ${testUrl}`);
      
      const response = await axios.get(testUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      console.log(`📊 Page title: ${$('title').text()}`);
      console.log(`📊 Content length: ${response.data.length} chars`);
      
      // Look for content in various selectors
      const selectors = ['h1', 'h2', '.content', '.lyrics', '.text', 'pre', 'p'];
      selectors.forEach(selector => {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`📊 Found ${elements.length} ${selector} elements`);
          elements.each((i, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 10) {
              console.log(`   ${selector}[${i}]: ${text.substring(0, 100)}...`);
            }
          });
        }
      });
      
      // Look for links
      const links = $('a[href]');
      console.log(`📊 Found ${links.length} links`);
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSingleSong();