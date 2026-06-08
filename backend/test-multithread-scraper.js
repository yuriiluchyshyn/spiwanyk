#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing multi-threaded scraper...');
console.log('📍 This will run the detailedScraper.js with 10 workers');
console.log('⚠️  Make sure you have enough memory and CPU resources\n');

const scraperPath = path.join(__dirname, 'src/scripts/detailedScraper.js');

const child = spawn('node', [scraperPath], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('error', (error) => {
  console.error('❌ Failed to start scraper:', error);
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n🎉 Scraper completed successfully!');
  } else {
    console.log(`\n💀 Scraper exited with code: ${code}`);
  }
});

// Обробляємо сигнали для graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping scraper...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminating scraper...');
  child.kill('SIGTERM');
});