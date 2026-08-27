const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  media: {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
  },
  caption: {
    type: String,
    maxlength: 300,
    default: '',
  },
  viewers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now }
  }],
  // Auto-expire after 24 hours (86400 seconds)
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // MongoDB TTL index
  },
});

module.exports = mongoose.model('Story', storySchema);
