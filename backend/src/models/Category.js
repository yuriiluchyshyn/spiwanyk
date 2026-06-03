const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    default: '🎵'
  },
  color: {
    type: String,
    default: '#8B4513'
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

categorySchema.index({ order: 1 });

module.exports = mongoose.model('Category', categorySchema);
