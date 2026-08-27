const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const songbookSongSchema = new mongoose.Schema({
  song: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: true
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  order: {
    type: Number,
    default: 0
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Transient "who is singing what right now" state, shared across everyone who
// has the songbook open. Denormalises the song title and the initiator's email
// so list endpoints can render the indicator without extra population.
const nowSingingSchema = new mongoose.Schema({
  songId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    default: null
  },
  songTitle: {
    type: String,
    default: null
  },
  startedByEmail: {
    type: String,
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const songbookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  privacy: {
    type: String,
    enum: ['private', 'public', 'shared', 'nearby'],
    default: 'private'
  },
  defaultPermissions: {
    // Rights granted to everyone who can reach the songbook (public / nearby).
    // 'full' means any such user can also delete it and manage sharing — only
    // the creator is ever protected.
    type: String,
    enum: ['view', 'edit', 'full'],
    default: 'view'
  },
  // Visibility to people physically nearby. Independent of `privacy` so a
  // songbook can be shared by email AND discoverable at the campfire at the
  // same time. `privacy: 'nearby'` is treated as implying this for legacy data.
  shareNearby: {
    type: Boolean,
    default: false
  },
  // Як відображати пісні в межах кожного розділу:
  //  'manual' — ручний порядок (drag&drop),
  //  'alpha'  — за алфавітом (назва пісні)
  songSort: {
    type: String,
    enum: ['manual', 'alpha'],
    default: 'manual'
  },
  sections: [sectionSchema],
  songs: [songbookSongSchema],
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    permissions: {
      // view  - read only
      // edit  - can modify songs/content
      // full  - can edit, delete the songbook and manage other users' access
      //         (but never the owner/creator)
      type: String,
      enum: ['view', 'edit', 'full'],
      default: 'view'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  accessCount: {
    type: Number,
    default: 0
  },
  // Shared "singing now" state (null when nobody is leading a song).
  nowSinging: {
    type: nowSingingSchema,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
songbookSchema.index({ owner: 1 });
songbookSchema.index({ privacy: 1 });
songbookSchema.index({ 'sharedWith.email': 1 });
songbookSchema.index({ tags: 1 });
songbookSchema.index({ title: 'text', description: 'text' });

// Virtual properties
songbookSchema.virtual('songCount').get(function() {
  return this.songs.length;
});

songbookSchema.virtual('sectionCount').get(function() {
  return this.sections.length;
});

// Ensure virtuals are included in JSON
songbookSchema.set('toJSON', { virtuals: true });
songbookSchema.set('toObject', { virtuals: true });

// Methods
songbookSchema.methods.addSong = function(songId, sectionId, userId) {
  // Clean up null songs first
  this.songs = this.songs.filter(s => s.song !== null && s.song !== undefined);
  
  // Check if song already exists
  const existingSong = this.songs.find(s => s.song && s.song.toString() === songId.toString());
  if (existingSong) {
    throw new Error('Пісня вже додана до співаника');
  }

  // Compute next order within target section
  const sectionKey = sectionId ? sectionId.toString() : null;
  const sameSectionSongs = this.songs.filter(s => {
    if (!s.song) return false; // Skip null songs
    const sKey = s.section ? s.section.toString() : null;
    return sKey === sectionKey;
  });
  const maxOrder = sameSectionSongs.reduce((max, s) => Math.max(max, s.order || 0), -1);

  const newSong = {
    song: songId,
    order: maxOrder + 1,
    addedBy: userId
  };

  // Only set section if sectionId is provided and valid
  if (sectionId && sectionId.toString().trim()) {
    newSong.section = sectionId;
  }

  this.songs.push(newSong);
  return this.save();
};

songbookSchema.methods.reorderSongs = function(sectionId, orderedSongIds) {
  // Clean up null songs first
  this.songs = this.songs.filter(s => s.song !== null && s.song !== undefined);
  
  // sectionId can be null/undefined for "no section"
  const sectionKey = sectionId ? sectionId.toString() : null;

  // Build a quick lookup of new order indexes
  const orderMap = new Map();
  orderedSongIds.forEach((songId, index) => {
    orderMap.set(songId.toString(), index);
  });

  // Apply new order values to songs in the target section
  this.songs.forEach(entry => {
    if (!entry.song) return; // Skip null songs
    
    const entrySectionKey = entry.section ? entry.section.toString() : null;
    if (entrySectionKey !== sectionKey) return;

    const songIdStr = entry.song.toString();
    if (orderMap.has(songIdStr)) {
      entry.order = orderMap.get(songIdStr);
    }
  });

  return this.save();
};

songbookSchema.methods.moveSong = function(songId, targetSectionId, targetIndex) {
  // Clean up null songs first
  this.songs = this.songs.filter(s => s.song !== null && s.song !== undefined);
  
  const songIdStr = songId.toString();
  const targetSectionKey = targetSectionId ? targetSectionId.toString() : null;

  const entry = this.songs.find(s => s.song && s.song.toString() === songIdStr);
  if (!entry) {
    throw new Error('Пісню не знайдено у співанику');
  }

  // Update section - only set if targetSectionId is valid, otherwise remove field
  if (targetSectionId && targetSectionId.toString().trim()) {
    entry.section = targetSectionId;
  } else {
    entry.section = undefined;
  }

  // Re-number songs in the target section so the moved song lands at targetIndex
  const sectionEntries = this.songs
    .filter(s => {
      if (!s.song) return false; // Skip null songs
      const sKey = s.section ? s.section.toString() : null;
      return sKey === targetSectionKey;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Remove the moved entry from list, then insert at desired index
  const without = sectionEntries.filter(s => s.song && s.song.toString() !== songIdStr);
  const insertAt = Math.max(0, Math.min(targetIndex, without.length));
  without.splice(insertAt, 0, entry);

  without.forEach((s, idx) => {
    s.order = idx;
  });

  return this.save();
};

songbookSchema.methods.removeSong = function(songId) {
  // Clean up null songs and remove the target song
  this.songs = this.songs.filter(s => s.song && s.song.toString() !== songId.toString());
  return this.save();
};

songbookSchema.methods.addSection = function(name, description) {
  const newSection = {
    name,
    description,
    order: this.sections.length
  };
  this.sections.push(newSection);
  return this.save();
};

songbookSchema.methods.removeSection = function(sectionId) {
  // Remove section
  this.sections = this.sections.filter(s => s._id.toString() !== sectionId.toString());
  
  // Remove section reference from songs
  this.songs.forEach(song => {
    if (song.section && song.section.toString() === sectionId.toString()) {
      song.section = undefined;
    }
  });
  
  return this.save();
};

songbookSchema.methods.shareWith = function(email, permissions = 'view') {
  // Check if already shared
  const existingShare = this.sharedWith.find(s => s.email === email.toLowerCase());
  if (existingShare) {
    existingShare.permissions = permissions;
    existingShare.sharedAt = new Date();
  } else {
    this.sharedWith.push({
      email: email.toLowerCase(),
      permissions,
      sharedAt: new Date()
    });
  }
  return this.save();
};

songbookSchema.methods.unshareWith = function(email) {
  this.sharedWith = this.sharedWith.filter(s => s.email !== email.toLowerCase());
  return this.save();
};

songbookSchema.methods.canAccess = function(user) {
  console.log('canAccess called with:', {
    songbookPrivacy: this.privacy,
    songbookOwner: this.owner,
    userId: user._id,
    userEmail: user.email,
    sharedWithCount: this.sharedWith?.length || 0
  });

  // Owner can always access
  const ownerId = this.owner._id ? this.owner._id.toString() : this.owner.toString();
  console.log('Owner check:', { ownerId, userId: user._id.toString() });
  
  if (ownerId === user._id.toString()) {
    console.log('Access granted: owner');
    // The creator always has full rights and can never be restricted.
    return { canAccess: true, permissions: 'full', isOwner: true };
  }

  // Check if user is explicitly shared with (applies to all privacy types)
  const sharedEntry = this.sharedWith?.find(s => s.email === user.email.toLowerCase());
  if (sharedEntry) {
    console.log('Access granted: explicitly shared with user', { permissions: sharedEntry.permissions });
    return { canAccess: true, permissions: sharedEntry.permissions };
  }

  // Private songbooks - only owner and explicitly shared users
  if (this.privacy === 'private') {
    console.log('Access denied: private, not owner, not explicitly shared');
    return { canAccess: false, permissions: null };
  }

  // Opted into nearby discovery: same reach as privacy 'nearby'. Proximity is
  // enforced by findNearby when listing; this only gates opening a known id.
  if (this.shareNearby) {
    console.log('Access granted: shareNearby');
    return { canAccess: true, permissions: this.defaultPermissions || 'view' };
  }

  // Public songbooks - available to all authenticated users
  if (this.privacy === 'public') {
    console.log('Access granted: public');
    return { canAccess: true, permissions: this.defaultPermissions || 'view' };
  }

  // Shared songbooks - only explicitly shared users (legacy behavior)
  if (this.privacy === 'shared') {
    console.log('Access denied: shared privacy but not explicitly shared with user');
    return { canAccess: false, permissions: null };
  }

  // Nearby songbooks - available to all authenticated users in proximity
  if (this.privacy === 'nearby') {
    console.log('Access granted: nearby');
    return { canAccess: true, permissions: this.defaultPermissions || 'view' };
  }

  console.log('Access denied: unknown privacy setting');
  return { canAccess: false, permissions: null };
};

songbookSchema.methods.incrementAccess = function() {
  this.accessCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

// A "singing now" marker older than this is treated as "nobody is singing" when
// read, so it disappears for everyone ~10 min after it was started.
songbookSchema.statics.NOW_SINGING_WINDOW_MINUTES = 10;

// Set the shared "singing now" song. `song` must be a loaded Song doc.
songbookSchema.methods.setNowSinging = function(song, user) {
  this.nowSinging = {
    songId: song._id,
    songTitle: song.title,
    startedByEmail: user.email,
    startedAt: new Date()
  };
  return this.save();
};

songbookSchema.methods.clearNowSinging = function() {
  this.nowSinging = null;
  return this.save();
};

// Static methods
songbookSchema.statics.findPublic = function(options = {}) {
  const { limit = 20, skip = 0, tags } = options;
  
  let query = { privacy: 'public', isActive: true };
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  return this.find(query)
    .populate('owner', 'email')
    .populate('songs.song', 'title author')
    .sort({ accessCount: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Only users whose location was updated within this window are considered
// physically "present". This prevents stale locations (someone who was here
// days ago) from leaking their 'nearby' songbooks forever.
songbookSchema.statics.PRESENCE_WINDOW_MINUTES = 60;

songbookSchema.statics.findNearby = async function(
  longitude,
  latitude,
  maxDistance = 500,
  excludeUserId = null,
  freshnessMinutes = songbookSchema.statics.PRESENCE_WINDOW_MINUTES
) {
  const User = mongoose.model('User');

  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 findNearby: lng=${longitude}, lat=${latitude}, maxDistance=${maxDistance}, excludeUserId=${excludeUserId}`);
  }

  const freshnessThreshold = new Date(Date.now() - freshnessMinutes * 60 * 1000);
  if (process.env.NODE_ENV === 'development') {
    console.log(`⏰ Freshness threshold: ${freshnessThreshold.toISOString()}`);
  }

  // Step 1: Find users who are physically nearby AND recently present.
  //  - $near: within maxDistance metres of the search point (needs 2dsphere index)
  //  - location.coordinates $ne [0,0]: skip users who never set a real location
  //  - location.updatedAt >= threshold: skip stale locations (not here right now)
  const userQuery = {
    'location.coordinates': { $ne: [0, 0] },
    'location.updatedAt': { $gte: freshnessThreshold },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  };

  // Exclude the requesting user so they don't match themselves.
  if (excludeUserId) {
    userQuery._id = { $ne: excludeUserId };
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('👥 User query:', JSON.stringify(userQuery, null, 2));
  }
  const nearbyUsers = await User.find(userQuery).select('_id email');
  if (process.env.NODE_ENV === 'development') {
    console.log(`👥 Found ${nearbyUsers.length} nearby users:`, nearbyUsers.map(u => u.email));
  }

  if (nearbyUsers.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ No nearby users found');
    }
    return [];
  }

  const userIds = nearbyUsers.map(u => u._id);

  // Step 2: Find nearby-visible songbooks owned by those present users.
  // A songbook opts in either via the explicit `shareNearby` flag or by having
  // `privacy: 'nearby'` (legacy). Private books never leak.
  const songbookQuery = {
    owner: { $in: userIds },
    isActive: true,
    privacy: { $ne: 'private' },
    $or: [{ shareNearby: true }, { privacy: 'nearby' }]
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('📚 Songbook query:', JSON.stringify(songbookQuery, null, 2));
  }
  const songbooks = await this.find(songbookQuery)
    .populate('owner', 'email')
    .populate('songs.song', 'title author')
    .sort({ createdAt: -1 });

  if (process.env.NODE_ENV === 'development') {
    console.log(`📚 Found ${songbooks.length} songbooks:`, songbooks.map(s => `"${s.title}" by ${s.owner.email}`));
  }

  return songbooks;
};

module.exports = mongoose.model('Songbook', songbookSchema);