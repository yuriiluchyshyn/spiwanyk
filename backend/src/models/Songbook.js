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
    type: String,
    enum: ['view', 'edit'],
    default: 'view'
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
      type: String,
      enum: ['view', 'edit'],
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
    return { canAccess: true, permissions: 'edit' };
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

songbookSchema.statics.findNearby = async function(longitude, latitude, maxDistance = 500, excludeUserId = null) {
  const User = mongoose.model('User');
  
  // Step 1: Find users nearby (exclude coordinates [0,0] - not set)
  const userQuery = {
    'location.coordinates': { $ne: [0, 0] },
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

  const nearbyUsers = await User.find(userQuery).select('_id email');

  if (nearbyUsers.length === 0) {
    return [];
  }

  const userIds = nearbyUsers.map(u => u._id);

  // Step 2: Find songbooks with privacy 'nearby' owned by those users
  const songbookQuery = {
    owner: { $in: userIds },
    privacy: 'nearby',
    isActive: true
  };

  // Exclude own songbooks if userId provided
  if (excludeUserId) {
    songbookQuery.owner.$nin = [excludeUserId];
    // Rebuild query to properly combine $in and $nin
    songbookQuery.owner = { 
      $in: userIds.filter(id => id.toString() !== excludeUserId.toString()) 
    };
  }

  const songbooks = await this.find(songbookQuery)
    .populate('owner', 'email')
    .populate('songs.song', 'title author')
    .sort({ createdAt: -1 });

  return songbooks;
};

module.exports = mongoose.model('Songbook', songbookSchema);