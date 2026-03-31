const mongoose = require('mongoose');
const Song = require('../models/Song');
const User = require('../models/User');
require('dotenv').config();

const sampleSongs = [
  {
    title: "Ще не вмерла України",
    author: "Павло Чубинський",
    lyrics: `Ще не вмерла України і слава, і воля,
Ще нам, браття молодії, усміхнеться доля.
Згинуть наші воріженьки, як роса на сонці.
Запануєм і ми, браття, у своїй сторонці.

Душу й тіло ми положим за нашу свободу,
І покажем, що ми, браття, козацького роду.`,
    category: "hymns",
    difficulty: "easy",
    tags: ["гімн", "патріотична", "україна"],
    isPublic: true
  },
  {
    title: "Червона рута",
    author: "Володимир Івасюк",
    lyrics: `Ти признайся мені, звідки в тебе ті очі,
Ніби вишні розцвіли в них дві,
Ти признайся мені, де ти бачила ночі,
Повні зір і печалі такі.

Червона рута, рута, рута,
Де ти зросла, де ти зросла?
Кого ти любиш, молода?
Червона рута, рута, рута,
Нащо мені, нащо мені
Бридкі ці сни, бридкі ці сни?`,
    category: "author",
    difficulty: "medium",
    tags: ["народна", "любов", "рута"],
    youtubeUrl: "https://www.youtube.com/watch?v=example",
    isPublic: true
  },
  {
    title: "Пливе кача по Тисині",
    author: "Народна",
    lyrics: `Пливе кача по Тисині,
А за нею качурята.
Пливи, пливи, качечко,
Не забудь качурята.

Ой у полі три криниці,
Три криниці-сестриці.
Одна мутна, друга чиста,
А третя найчистіша.`,
    category: "folk",
    difficulty: "easy",
    tags: ["народна", "дитяча", "традиційна"],
    isPublic: true
  },
  {
    title: "Їхав козак за Дунай",
    author: "Народна",
    lyrics: `Їхав козак за Дунай,
Сказав дівчині: "Прощай!
Ти не журися, не плач,
Я повернуся, хоч плач."

Ой, чого ж мені не плакать?
Чого мені не журиться?
Мій миленький за Дунай,
А я маю розлучиться.`,
    category: "cossack",
    difficulty: "medium",
    tags: ["козацька", "народна", "історична"],
    chords: "Am Dm G C F",
    isPublic: true
  },
  {
    title: "Ой у лузі червона калина",
    author: "Степан Чарнецький",
    lyrics: `Ой у лузі червона калина похилилася,
Чогось наша славна Україна зажурилася.
А додому, а додому, та й до рідної сторонки,
Та й до рідної сторонки скоріш би повернутись.

Ой у лузі червона калина зав'ялилася,
Чогось наша славна Україна зажурилася.`,
    category: "uprising",
    difficulty: "medium",
    tags: ["патріотична", "калина", "україна"],
    chords: "Em Am D G",
    isPublic: true
  },
  {
    title: "Пластовий марш",
    author: "Пластова",
    lyrics: `Ми йдемо вперед, завжди вперед,
Пластовий гурт, пластовий рід.
Під синьо-жовтим прапором
Ідемо в похід.

Будь готов! - наш клич завжди,
Будь готов! - у всі часи.
Пласт веде нас до перемог,
Слава Україні!`,
    category: "plast",
    difficulty: "easy",
    tags: ["пластова", "марш", "організація"],
    isPublic: true
  },
  {
    title: "Щедрик-ведрик",
    author: "Народна",
    lyrics: `Щедрик-ведрик, дайте вареник,
Грудочку кашки, кільце ковбаски.
Будете давать - будем співать,
Не будете давать - будем мовчать.

Щедрий вечір, добрий вечір,
Добрим людям на здоров'я!`,
    category: "carols",
    difficulty: "easy",
    tags: ["щедрівка", "різдво", "традиційна"],
    isPublic: true
  },
  {
    title: "Ой на горі та женці жнуть",
    author: "Лемківська народна",
    lyrics: `Ой на горі та женці жнуть,
А попід горов косарі косят.
Ой чого ж ви, женці, плачете?
Чи вас косарі не просят?

Та не плачем ми, женці,
Що нас косарі не просят.
Плачем ми, що літо минає,
А зима настає.`,
    category: "lemko",
    difficulty: "medium",
    tags: ["лемківська", "гірська", "народна"],
    isPublic: true
  },
  {
    title: "Різдвяна колядка",
    author: "Традиційна",
    lyrics: `Нова радість стала,
Яка не бувала:
Над вертепом звізда ясна
Світло засіяла.

Слава в вишніх Богу,
А на землі мир,
В чоловіцех благовоління
Христос ся родив.`,
    category: "carols",
    difficulty: "easy",
    tags: ["колядка", "різдво", "релігійна"],
    chords: "G D Em C",
    isPublic: true
  },
  {
    title: "Молитва за Україну",
    author: "Олександр Кониський",
    lyrics: `Боже великий, єдиний,
Нам Україну храни,
Волі і світу промінням
Ти її осіни.

Молимось, Боже, єдиний,
Нам Україну храни,
Дай їй, Господь, благословення,
Дай їй, Господь, сили.`,
    category: "hymns",
    difficulty: "medium",
    tags: ["молитва", "патріотична", "релігійна"],
    isPublic: true
  }
];

async function seedData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook');
    console.log('✅ Connected to MongoDB');

    // Clear existing songs
    await Song.deleteMany({});
    console.log('🗑️  Cleared existing songs');

    // Create a default user if none exists
    let defaultUser = await User.findOne({ email: 'admin@plast.org' });
    if (!defaultUser) {
      defaultUser = new User({
        email: 'admin@plast.org',
        name: 'Admin'
      });
      await defaultUser.save();
      console.log('👤 Created default user');
    }

    // Add createdBy to all songs
    const songsWithUser = sampleSongs.map(song => ({
      ...song,
      createdBy: defaultUser._id
    }));

    // Insert sample songs
    const insertedSongs = await Song.insertMany(songsWithUser);
    console.log(`🎵 Inserted ${insertedSongs.length} sample songs`);

    console.log('✅ Seed data completed successfully');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;