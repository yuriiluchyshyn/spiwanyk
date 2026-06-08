const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  author: {
    type: String,
    trim: true,
    maxlength: 100
  },
  lyrics: {
    type: String,
    trim: true
  },
  chords: {
    type: String,
    trim: true
  },
  // Структурована версія пісні з JSON
  structure: [{
    type: {
      type: String,
      enum: ['verse', 'chorus', 'bridge', 'intro', 'outro'],
      default: 'verse'
    },
    number: {
      type: Number,
      default: 1
    },
    repeat: {
      type: Number,
      default: 1
    },
    lines: [{
      text: String,
      chords: String, // Legacy підтримка
      // Позиційні акорди з JSON: [{chord: "Em", charIndex: 0}]
      chordPositions: [{
        chord: String,
        charIndex: Number
      }],
      isChorus: {
        type: Boolean,
        default: false
      }
    }]
  }],
  notes: {
    type: String,
    trim: true
  },
  youtubeUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)/.test(v);
      },
      message: 'Невірний формат YouTube URL'
    }
  },
  category: {
    type: String,
    default: 'folk'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  playCount: {
    type: Number,
    default: 0
  },
  lastPlayed: {
    type: Date
  },
  // Метадані з JSON
  sourceUrl: String, // URL з якого скрепили
  importedAt: {
    type: Date,
    default: Date.now
  },
  // Додаткова метаінформація
  metadata: {
    words: String,      // Автор слів
    music: String,      // Автор музики
    performer: String   // Виконавець
  }
}, {
  timestamps: true
});

// Indexes for search
songSchema.index({ title: 1 });
songSchema.index({ author: 1 });
songSchema.index({ category: 1 });
songSchema.index({ tags: 1 });
songSchema.index({ isPublic: 1 });

// Virtual properties
songSchema.virtual('hasChords').get(function() {
  if (this.chords && this.chords.trim().length > 0) return true;
  
  if (this.structure && this.structure.length > 0) {
    return this.structure.some(section => 
      section.lines.some(line => 
        (line.chordPositions && line.chordPositions.length > 0)
      )
    );
  }
  
  return false;
});

songSchema.virtual('hasStructure').get(function() {
  return !!(this.structure && this.structure.length > 0);
});

songSchema.virtual('hasNotes').get(function() {
  return !!(this.notes && this.notes.trim().length > 0);
});

songSchema.virtual('hasYoutube').get(function() {
  return !!(this.youtubeUrl && this.youtubeUrl.trim().length > 0);
});

// Ensure virtuals are included in JSON
songSchema.set('toJSON', { virtuals: true });
songSchema.set('toObject', { virtuals: true });

// Methods
songSchema.methods.incrementPlayCount = function() {
  this.playCount += 1;
  this.lastPlayed = new Date();
  return this.save();
};

// Static methods
songSchema.statics.search = function(query, options = {}) {
  const {
    category,
    tags,
    difficulty,
    limit,
    skip = 0
  } = options;

  let searchQuery = { isPublic: true };

  // Simple text search using regex
  if (query && query.trim()) {
    const regex = new RegExp(query.trim(), 'i');
    searchQuery.$or = [
      { title: regex },
      { lyrics: regex },
      { author: regex }
    ];
  }

  // Filters
  if (category) searchQuery.category = category;
  if (difficulty) searchQuery.difficulty = difficulty;
  if (tags && tags.length > 0) searchQuery.tags = { $in: tags };

  let dbQuery = this.find(searchQuery)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'email');

  // Застосовуємо пагінацію тільки якщо є параметри
  if (skip > 0) dbQuery = dbQuery.skip(skip);
  if (limit) dbQuery = dbQuery.limit(limit);

  return dbQuery;
};

songSchema.statics.getPopular = function(limit) {
  let query = this.find({ isPublic: true })
    .sort({ playCount: -1, createdAt: -1 });
  
  if (limit) query = query.limit(limit);
  
  return query;
};

module.exports = mongoose.model('Song', songSchema);