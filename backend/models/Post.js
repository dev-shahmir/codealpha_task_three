const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  type: { type: String, enum: ['image', 'video'], required: true },
  width: Number,
  height: Number,
  duration: Number, // video duration in seconds
  thumbnail: String, // video thumbnail URL
});

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  caption: {
    type: String,
    maxlength: [2200, 'Caption too long'],
    default: '',
  },
  media: [mediaSchema],

  // "post" = regular feed post, "clip" = short video reel
  type: {
    type: String,
    enum: ['post', 'clip'],
    required: true,
    default: 'post',
    index: true,
  },

  // Tags/hashtags for discovery
  tags: [{ type: String, lowercase: true, trim: true }],

  // Interest categories for personalized feed
  categories: [{ type: String }],

  // Audio track for clips
  audio: {
    name: String,
    artist: String,
    url: String,
  },

  // Engagement — "Aura" instead of likes
  aura: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  auraCount: { type: Number, default: 0, index: true },

  // Reactions: based | cringe (unique AURA feature)
  reactions: {
    based: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    cringe: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  basedCount: { type: Number, default: 0 },
  cringeCount: { type: Number, default: 0 },

  commentsCount: { type: Number, default: 0, index: true },
  sharesCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  savesCount: { type: Number, default: 0 },
  saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Clip-specific
  clipDuration: Number, // seconds
  isLoop: { type: Boolean, default: false },

  // Visibility
  isPublic: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },

  // Share tracking
  sharedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  shareChain: { type: Number, default: 0 },

  // Location (optional)
  location: { name: String, lat: Number, lng: Number },

}, { timestamps: true });

// Compound index for feed queries
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ type: 1, createdAt: -1 });
postSchema.index({ tags: 1, createdAt: -1 });
postSchema.index({ categories: 1, auraCount: -1 });
postSchema.index({ isDeleted: 1, isPublic: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
