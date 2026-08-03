/**
 * Canonical default song categories. Seeded into the DB when the Category
 * collection is empty and used as a read-only fallback for the public endpoint.
 */
const DEFAULT_CATEGORIES = [
  { id: 'author', name: 'АВТОРСЬКІ ПІСНІ', icon: '🎵', color: '#8B4513', order: 0 },
  { id: 'plast', name: 'ТАБІРНІ ПІСНІ', icon: '🔱', color: '#D2691E', order: 1 },
  { id: 'uprising', name: 'ПОВСТАНСЬКІ ПІСНІ', icon: '🎩', color: '#8B7355', order: 2 },
  { id: 'cossack', name: 'КОЗАЦЬКІ ПІСНІ', icon: '⚔️', color: '#654321', order: 3 },
  { id: 'lemko', name: 'ЛЕМКІВСЬКІ ПІСНІ', icon: '🏔️', color: '#228B22', order: 4 },
  { id: 'folk', name: 'НАРОДНІ ПІСНІ', icon: '🌾', color: '#6B8E23', order: 5 },
  { id: 'christmas', name: 'НОВАЦЬКІ ПІСНІ', icon: '🔥', color: '#2F4F4F', order: 6 },
  { id: 'carols', name: 'КОЛЯДКИ / ЩЕДРІВКИ', icon: '⭐', color: '#B22222', order: 7 },
  { id: 'hymns', name: 'ГІМНИ / МОЛИТВИ', icon: '🇺🇦', color: '#4682B4', order: 8 }
];

// Legacy static category list kept for the /meta/categories endpoint.
const LEGACY_META_CATEGORIES = [
  { value: 'patriotic', label: 'Патріотичні' },
  { value: 'camp', label: 'Табірні' },
  { value: 'religious', label: 'Релігійні' },
  { value: 'folk', label: 'Народні' },
  { value: 'modern', label: 'Сучасні' },
  { value: 'other', label: 'Інші' }
];

module.exports = { DEFAULT_CATEGORIES, LEGACY_META_CATEGORIES };
