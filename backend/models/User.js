const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const INTEREST_TAGS = [
  'art', 'music', 'gaming', 'fashion', 'food', 'travel', 'fitness',
  'tech', 'movies', 'books', 'sports', 'comedy', 'dance', 'beauty',
  'pets', 'nature', 'photography', 'anime', 'crypto', 'business'
];

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_.]+$/, 'Username can only contain letters, numbers, dots, underscores'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Invalid email'],
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
    required: function() {
      return this.authProvider === 'local';
    },
  },
  googleId: { type: String, unique: true, sparse: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  displayName: { type: String, trim: true, maxlength: [50, 'Display name too long'] },
  bio: { type: String, maxlength: [160, 'Bio cannot exceed 160 characters'] },
  avatar: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  coverImage: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },

  // Gen-Z personalization
  vibeStatus: { type: String, maxlength: 100, default: '' }, // Daily mood
  interests: {
    type: [String],
    enum: INTEREST_TAGS,
    default: [],
  },

  // Aura system (gamified engagement score)
  auraScore: { type: Number, default: 0 },
  auraLevel: {
    type: String,
    enum: ['newbie', 'rising', 'glowing', 'radiant', 'legendary'],
    default: 'newbie',
  },

  // Social graph
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  postsCount: { type: Number, default: 0 },

  // Badges
  isVerified: { type: Boolean, default: false }, // "No Cap" verified
  isNPC: { type: Boolean, default: false },       // auto-engagement mode
  badges: [{ type: String }],

  // Auth
  refreshToken: { type: String, select: false },
  passwordChangedAt: Date,
  isActive: { type: Boolean, default: true },
  passwordResetOtp: { type: String, select: false },
  passwordResetExpiry: { type: Date, select: false },

  // Push / notifications
  notificationPrefs: {
    aura: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    follows: { type: Boolean, default: true },
  },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Set display name to username if empty
userSchema.pre('save', function (next) {
  if (!this.displayName) this.displayName = this.username;
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Recalculate aura level
userSchema.methods.recalcAuraLevel = function () {
  const score = this.auraScore;
  if (score >= 10000) this.auraLevel = 'legendary';
  else if (score >= 2500) this.auraLevel = 'radiant';
  else if (score >= 500) this.auraLevel = 'glowing';
  else if (score >= 100) this.auraLevel = 'rising';
  else this.auraLevel = 'newbie';
};

// Safe public profile
userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    displayName: this.displayName,
    bio: this.bio,
    avatar: this.avatar,
    coverImage: this.coverImage,
    vibeStatus: this.vibeStatus,
    interests: this.interests,
    auraScore: this.auraScore,
    auraLevel: this.auraLevel,
    followersCount: this.followersCount,
    followingCount: this.followingCount,
    postsCount: this.postsCount,
    isVerified: this.isVerified,
    badges: this.badges,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.INTEREST_TAGS = INTEREST_TAGS;
