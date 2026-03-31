const SongScraper = require('./scrapeSongs');

async function testParser() {
  console.log('🧪 Testing updated parser...');
  
  const scraper = new SongScraper();
  
  // Test with the specific song
  const songData = await scraper.fetchSongContent(
    'https://pryvatri.de/avtorski/433-117-ctattya',
    '117 стаття'
  );
  
  if (songData) {
    console.log('✅ Successfully parsed song:');
    console.log(`📝 Title: ${songData.title}`);
    console.log(`👤 Author: ${songData.author || 'Невідомий'}`);
    console.log(`🎵 Lyrics length: ${songData.lyrics.length} chars`);
    console.log(`🎸 Chords length: ${songData.chords.length} chars`);
    console.log(`📺 YouTube: ${songData.youtubeUrl || 'None'}`);
    
    if (songData.lyrics) {
      console.log(`\n📄 Lyrics preview:\n${songData.lyrics.substring(0, 200)}...`);
    }
    
    if (songData.chords) {
      console.log(`\n🎸 Chords preview:\n${songData.chords.substring(0, 200)}...`);
    }
  } else {
    console.log('❌ Failed to parse song');
  }
}

testParser().catch(console.error);