const fs = require('fs').promises;
const path = require('path');
const Song = require('../models/Song');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Bulk import of scraped songs from a JSON payload (or the bundled
 * latest-songs.json fallback). Kept separate from ordinary song CRUD because
 * it is an admin/maintenance concern with its own data-shaping rules.
 */

const CATEGORY_MAP = {
  author: 'author',
  plast: 'plast',
  uprising: 'uprising',
  cossack: 'cossack',
  lemko: 'lemko',
  folk: 'folk',
  christmas: 'christmas',
  carols: 'carols',
  hymns: 'hymns'
};

const FALLBACK_JSON_PATH = path.join(__dirname, '../../data/latest-songs.json');

// Resolve the import source: an inline { songs: [...] } payload wins, otherwise
// read the bundled latest-songs.json file.
const resolveImportData = async (body) => {
  if (body && body.songs && Array.isArray(body.songs)) {
    return body;
  }
  const jsonData = await fs.readFile(FALLBACK_JSON_PATH, 'utf8');
  return JSON.parse(jsonData);
};

// Dedicated user that owns imported songs.
const getOrCreateImportUser = async () => {
  let importUser = await User.findOne({ email: 'import@plast.org' });
  if (!importUser) {
    importUser = new User({ email: 'import@plast.org', name: 'JSON Import User' });
    await importUser.save();
  }
  return importUser;
};

// Normalize a scraped song's positional-chord structure into the Song schema.
const buildStructure = (songData) =>
  (songData.structure || []).map((section) => ({
    type: section.type,
    number: section.number,
    repeat: section.repeat || 1,
    lines: (section.lines || []).map((line) => ({
      text: line.text,
      chordPositions: (line.chordPositions || line.chords || []).map((chord) => ({
        chord: chord.chord,
        charIndex:
          chord.charIndex != null ? chord.charIndex : chord.position != null ? chord.position : 0
      })),
      isChorus: line.metadata?.isChorus || false
    }))
  }));

// Flatten structured sections into a plain-text lyrics blob.
const buildLyrics = (structure) =>
  structure
    .map((section) => {
      const sectionTitle = section.type === 'chorus' ? 'Приспів:' : `Куплет ${section.number}:`;
      const lines = section.lines.map((line) => line.text).join('\n');
      return `${sectionTitle}\n${lines}`;
    })
    .join('\n\n');

const buildSongDocument = (songData, importUserId) => {
  const structure = buildStructure(songData);
  return new Song({
    title: songData.title || 'Без назви',
    author: songData.author || 'Невідомий',
    lyrics: buildLyrics(structure),
    chords: '',
    structure,
    youtubeUrl: songData.youtubeUrl || '',
    category: CATEGORY_MAP[songData.category] || 'folk',
    tags: [songData.category, 'imported', 'structured'].filter(Boolean),
    isPublic: true,
    createdBy: importUserId,
    sourceUrl: songData.url || '',
    metadata: {
      words: songData.metadata?.words || '',
      music: songData.metadata?.music || '',
      performer: songData.metadata?.performer || ''
    }
  });
};

/**
 * Import songs from the given request body (or fallback file). Existing songs
 * (matched by title) are skipped. Returns an aggregate results summary.
 */
const importFromJson = async (body) => {
  const data = await resolveImportData(body);

  if (!data.songs || !Array.isArray(data.songs)) {
    throw ApiError.badRequest('Невірний формат JSON файлу');
  }

  const importUser = await getOrCreateImportUser();

  let imported = 0;
  const skippedTitles = [];
  const errors = [];

  for (const songData of data.songs) {
    try {
      const existingSong = await Song.findOne({ title: songData.title });
      if (existingSong) {
        skippedTitles.push(songData.title || 'Без назви');
        continue;
      }

      const newSong = buildSongDocument(songData, importUser._id);
      await newSong.save();
      imported++;
    } catch (err) {
      errors.push({ title: songData.title || 'Без назви', error: err.message });
    }
  }

  const totalInDatabase = await Song.countDocuments();

  return {
    totalInFile: data.songs.length,
    imported,
    skipped: skippedTitles.length,
    skippedTitles,
    totalInDatabase,
    errors
  };
};

// Reshape a stored Song document back into the "scraped" import format so the
// exported file can be re-imported through importFromJson on another instance.
const toImportShape = (song) => ({
  title: song.title,
  author: song.author || 'Невідомий',
  category: song.category,
  url: song.sourceUrl || '',
  youtubeUrl: song.youtubeUrl || '',
  metadata: {
    words: song.metadata?.words || '',
    music: song.metadata?.music || '',
    performer: song.metadata?.performer || ''
  },
  structure: (song.structure || []).map((section) => ({
    type: section.type,
    number: section.number,
    repeat: section.repeat || 1,
    lines: (section.lines || []).map((line) => ({
      text: line.text,
      chordPositions: (line.chordPositions || []).map((cp) => ({
        chord: cp.chord,
        charIndex: cp.charIndex != null ? cp.charIndex : 0
      })),
      // importFromJson reads the chorus flag from line.metadata.isChorus
      metadata: { isChorus: line.isChorus || false }
    }))
  }))
});

/**
 * Export songs (optionally filtered by category ids) as an import-ready
 * payload: { metadata, songs: [...] }. Passing an empty/undefined list
 * exports every song.
 */
const exportForImport = async (categories) => {
  const filter =
    Array.isArray(categories) && categories.length > 0
      ? { category: { $in: categories } }
      : {};

  const songs = await Song.find(filter).sort({ category: 1, title: 1 }).lean();

  return {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalSongs: songs.length,
      categories:
        Array.isArray(categories) && categories.length > 0 ? categories : 'all',
      format: 'import-from-json'
    },
    songs: songs.map(toImportShape)
  };
};

module.exports = { importFromJson, exportForImport };
