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
  // id (string) батьківської категорії; null для кореневих розділів
  parentId: {
    type: String,
    default: null,
    trim: true,
    lowercase: true
  },
  order: {
    type: Number,
    default: 0
  },
  // Власник приватного розділу. null → глобальний (публічний) розділ, видимий
  // усім. Заданий → приватний розділ конкретного користувача.
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

categorySchema.index({ order: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ owner: 1 });

module.exports = mongoose.model('Category', categorySchema);
