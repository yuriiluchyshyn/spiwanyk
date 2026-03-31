const mongoose = require('mongoose');
const Song = require('../models/Song');
const User = require('../models/User');
const Songbook = require('../models/Songbook');
require('dotenv').config();

class DatabaseCleaner {
  async clearDatabase() {
    try {
      console.log('🗑️  Starting database cleanup...');
      
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
      console.log('✅ Connected to MongoDB');

      // Get counts before deletion
      const songCount = await Song.countDocuments();
      const userCount = await User.countDocuments();
      const songbookCount = await Songbook.countDocuments();
      
      console.log(`📊 Current database state:`);
      console.log(`   Songs: ${songCount}`);
      console.log(`   Users: ${userCount}`);
      console.log(`   Songbooks: ${songbookCount}`);

      // Clear all collections
      console.log('\n🗑️  Clearing collections...');
      
      await Song.deleteMany({});
      console.log('✅ Cleared songs collection');
      
      await Songbook.deleteMany({});
      console.log('✅ Cleared songbooks collection');
      
      // Keep admin user but remove others
      const adminUser = await User.findOne({ email: 'admin@plast.org' });
      await User.deleteMany({ email: { $ne: 'admin@plast.org' } });
      console.log('✅ Cleared users collection (kept admin)');

      // Create scraper user if it doesn't exist
      let scraperUser = await User.findOne({ email: 'scraper@plast.org' });
      if (!scraperUser) {
        scraperUser = new User({
          email: 'scraper@plast.org',
          name: 'Pryvatri.de Scraper'
        });
        await scraperUser.save();
        console.log('✅ Created scraper user');
      }

      console.log('\n🎉 Database cleanup completed!');
      console.log('📊 Final state:');
      console.log(`   Songs: ${await Song.countDocuments()}`);
      console.log(`   Users: ${await User.countDocuments()}`);
      console.log(`   Songbooks: ${await Songbook.countDocuments()}`);
      console.log('\n🚀 Ready for fresh data import!');

    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
    } finally {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const cleaner = new DatabaseCleaner();
  cleaner.clearDatabase();
}

module.exports = DatabaseCleaner;