const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: [true, 'Comment cannot be empty'],
    maxlength: [500, 'Comment too long'],
    trim: true,
  },
  // "Aura" on comments (liked comments glow)
  aura: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  auraCount: { type: Number, default: 0 },

  // Replies reference parent comment
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  repliesCount: { type: Number, default: 0 },

  // Mentions
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  isDeleted: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
}, { timestamps: true });

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
