const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadAvatar, uploadCover } = require('../config/cloudinary');

// PUT /api/users/me/update — update profile
router.put('/me/update', protect, async (req, res) => {
  try {
    const { displayName, bio, vibeStatus, interests } = req.body;
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (vibeStatus !== undefined) updates.vibeStatus = vibeStatus;
    if (interests !== undefined) updates.interests = interests;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/users/me/avatar — upload avatar
router.put('/me/avatar', protect, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const avatarUrl = req.file.path.startsWith('http') ? req.file.path : `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: { url: avatarUrl, publicId: req.file.filename } },
      { new: true }
    );
    res.json({ success: true, avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/me/cover — upload cover banner
router.put('/me/cover', protect, uploadCover.single('cover'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const coverUrl = req.file.path.startsWith('http') ? req.file.path : `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { coverImage: { url: coverUrl, publicId: req.file.filename } },
      { new: true }
    );
    res.json({ success: true, coverImage: user.coverImage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/me/interests — update interests for personalized feed
router.put('/me/interests', protect, async (req, res) => {
  try {
    const { interests } = req.body;
    if (!Array.isArray(interests)) return res.status(400).json({ success: false, message: 'Interests must be an array' });
    const user = await User.findByIdAndUpdate(req.user._id, { interests }, { new: true });
    res.json({ success: true, interests: user.interests, message: 'Vibe updated ✨' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/:id/follow — lock in / ghost
router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Can't lock in on yourself bestie" });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    const isFollowing = target.followers.includes(req.user._id);

    if (isFollowing) {
      // Unfollow (ghost)
      await User.findByIdAndUpdate(req.params.id, {
        $pull: { followers: req.user._id },
        $inc: { followersCount: -1 },
      });
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { following: req.params.id },
        $inc: { followingCount: -1 },
      });
      res.json({ success: true, action: 'ghosted', message: `Ghosted @${target.username} 👻` });
    } else {
      // Follow (lock in)
      await User.findByIdAndUpdate(req.params.id, {
        $addToSet: { followers: req.user._id },
        $inc: { followersCount: 1 },
      });
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { following: req.params.id },
        $inc: { followingCount: 1 },
      });

      // Notification
      await Notification.create({
        recipient: req.params.id,
        sender: req.user._id,
        type: 'follow',
        message: `@${req.user.username} locked in on you 🔒`,
      });

      // Emit real-time notification
      if (req.io) {
        req.io.to(req.params.id).emit('notification', {
          type: 'follow',
          sender: { username: req.user.username, avatar: req.user.avatar },
        });
      }

      // Aura boost for the followed user
      await User.findByIdAndUpdate(req.params.id, { $inc: { auraScore: 5 } });

      res.json({ success: true, action: 'locked_in', message: `Locked in on @${target.username} 🔒` });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/:id/followers
router.get('/:id/followers', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.params.id)
      .populate({ path: 'followers', select: 'username displayName avatar auraLevel isVerified', options: { limit: +limit, skip: (+page - 1) * +limit } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, followers: user.followers, total: user.followersCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/:id/following
router.get('/:id/following', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.params.id)
      .populate({ path: 'following', select: 'username displayName avatar auraLevel isVerified', options: { limit: +limit, skip: (+page - 1) * +limit } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, following: user.following, total: user.followingCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/search?q=query
router.get('/search/people', optionalAuth, async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    if (!q) return res.json({ success: true, users: [] });

    const users = await User.find({
      isActive: true,
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
      ],
    })
      .select('username displayName avatar auraLevel auraScore isVerified followersCount')
      .limit(+limit)
      .skip((+page - 1) * +limit)
      .sort({ followersCount: -1 });

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/me/notifications
router.get('/me/notifications', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(+limit)
      .skip((+page - 1) * +limit)
      .populate('sender', 'username displayName avatar')
      .populate('post', 'media caption type');

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

    // Mark as read
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });

    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/leaderboard/resonance — Top synced creators
router.get('/leaderboard/resonance', optionalAuth, async (req, res) => {
  try {
    const { limit = 25 } = req.query;
    const leaders = await User.find({ isActive: true })
      .sort({ auraScore: -1, followersCount: -1 })
      .limit(+limit)
      .select('username displayName avatar auraLevel auraScore isVerified bio followersCount postsCount');

    const formatted = leaders.map((u) => {
      const isFollowing = req.user ? u.followers?.includes(req.user._id) : false;
      return {
        ...u.toObject(),
        isFollowing,
      };
    });

    res.json({ success: true, leaders: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/suggestions/nodes — Recommended users to follow
router.get('/suggestions/nodes', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const excludeIds = [currentUser._id, ...(currentUser.following || [])];

    const suggested = await User.find({
      _id: { $nin: excludeIds },
      isActive: true,
    })
      .sort({ auraScore: -1, followersCount: -1 })
      .limit(6)
      .select('username displayName avatar auraLevel auraScore isVerified bio followersCount');

    res.json({ success: true, users: suggested });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/me/avatar — remove profile picture
router.delete('/me/avatar', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { avatar: { url: '', publicId: '' } });
    res.json({ success: true, message: 'Profile picture removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/me/cover — remove banner/cover image
router.delete('/me/cover', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { coverImage: { url: '', publicId: '' } });
    res.json({ success: true, message: 'Cover image removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/users/me/deactivate — temporarily deactivate account
router.patch('/me/deactivate', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false, refreshToken: null });
    res.json({ success: true, message: 'Account deactivated. You can reactivate by logging in again.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/me — permanently delete account and all data
router.delete('/me', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const Post = require('../models/Post');
    const Notification = require('../models/Notification');

    // Remove user's posts
    await Post.deleteMany({ author: userId });

    // Remove notifications involving this user
    await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });

    // Remove from followers/following lists of other users
    await User.updateMany({ followers: userId }, { $pull: { followers: userId }, $inc: { followersCount: -1 } });
    await User.updateMany({ following: userId }, { $pull: { following: userId }, $inc: { followingCount: -1 } });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: 'Account permanently deleted. Goodbye 👋' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/:username — public profile. Keep this after named GET routes.
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username, isActive: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found, they ghosted 👻' });

    const profile = user.toPublicProfile();
    if (req.user) {
      profile.isFollowing = user.followers.includes(req.user._id);
      profile.isFollowedBy = user.following.includes(req.user._id);
    }
    res.json({ success: true, user: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
