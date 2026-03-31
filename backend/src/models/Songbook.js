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
  // Check if song already exists
  const existingSong = this.songs.find(s => s.song.toString() === songId.toString());
  if (existingSong) {
    throw new Error('Пісня вже додана до співаника');
  }

  const newSong = {
    song: songId,
    section: sectionId,
    order: this.songs.length,
    addedBy: userId
  };

  this.songs.push(newSong);
  return this.save();
};

songbookSchema.methods.removeSong = function(songId) {
  this.songs = this.songs.filter(s => s.song.toString() !== songId.toString());
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
  // Owner can always access
  const ownerId = this.owner._id ? this.owner._id.toString() : this.owner.toString();
  if (ownerId === user._id.toString()) {
    return { canAccess: true, permissions: 'edit' };
  }

  // Public songbooks
  if (this.privacy === 'public') {
    return { canAccess: true, permissions: 'view' };
  }

  // Shared songbooks
  if (this.privacy === 'shared') {
    const sharedEntry = this.sharedWith.find(s => s.email === user.email.toLowerCase());
    if (sharedEntry) {
      return { canAccess: true, permissions: sharedEntry.permissions };
    }
  }

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

songbookSchema.statics.findNearby = function(longitude, latitude, maxDistance = 500) {
  return this.aggregate([
    {
      $match: {
        privacy: 'nearby',
        isActive: true
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'ownerData'
      }
    },
    {
      $unwind: '$ownerData'
    },
    {
      $match: {
        'ownerData.location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: maxDistance
          }
        }
      }
    },
    {
      $addFields: {
        distance: {
          $round: [{
            $multiply: [
              {
                $acos: {
                  $add: [
                    {
                      $multiply: [
                        { $sin: { $degreesToRadians: latitude } },
                        { $sin: { $degreesToRadians: { $arrayElemAt: ['$ownerData.location.coordinates', 1] } } }
                      ]
                    },
                    {
                      $multiply: [
                        { $cos: { $degreesToRadians: latitude } },
                        { $cos: { $degreesToRadians: { $arrayElemAt: ['$ownerData.location.coordinates', 1] } } },
                        { $cos: { $degreesToRadians: { $subtract: [longitude, { $arrayElemAt: ['$ownerData.location.coordinates', 0] }] } } }
                      ]
                    }
                  ]
                }
              },
              6371000
            ]
          }, 0]
        }
      }
    },
    {
      $project: {
        title: 1,
        description: 1,
        owner: '$ownerData.email',
        songs: 1,
        sections: 1,
        distance: 1,
        createdAt: 1
      }
    },
    {
      $sort: { distance: 1 }
    }
  ]);
};

module.exports = mongoose.model('Songbook', songbookSchema);