const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');

// POST /api/stories — Create new pulse / story
router.post('/', protect, uploadImage.single('image'), async (req, res) => {
  try {
    const { caption } = req.body;
    let mediaUrl = '';
    let publicId = '';

    if (req.file) {
      mediaUrl = req.file.path.startsWith('http') ? req.file.path : `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      publicId = req.file.filename;
    } else if (req.body.imageUrl) {
      mediaUrl = req.body.imageUrl;
    } else {
      return res.status(400).json({ success: false, message: 'Media is required for a transmission pulse' });
    }

    const story = await Story.create({
      author: req.user._id,
      media: {
        url: mediaUrl,
        publicId,
        type: 'image',
      },
      caption: caption || '',
    });

    const populatedStory = await Story.findById(story._id).populate('author', 'username displayName avatar auraLevel isVerified');

    // Notify followers via Socket.io
    if (req.io) {
      const authorDoc = await User.findById(req.user._id).select('followers');
      if (authorDoc && authorDoc.followers && Array.isArray(authorDoc.followers)) {
        authorDoc.followers.forEach((followerId) => {
          req.io.to(followerId.toString()).emit('new_story', {
            story: populatedStory,
          });
        });
      }
    }

    res.status(201).json({ success: true, story: populatedStory, message: 'Pulse broadcasted to Nexus ✨' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/stories — Fetch active stories grouped by user
router.get('/', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const followingIds = currentUser.following || [];
    
    // Include user's own stories and following users' stories
    const targetUserIds = [currentUser._id, ...followingIds];

    const stories = await Story.find({
      author: { $in: targetUserIds },
    })
      .sort({ createdAt: 1 })
      .populate('author', 'username displayName avatar auraLevel isVerified');

    // Group stories by author
    const userStoriesMap = {};

    stories.forEach((story) => {
      const authorId = story.author._id.toString();
      if (!userStoriesMap[authorId]) {
        userStoriesMap[authorId] = {
          author: story.author,
          isOwn: authorId === currentUser._id.toString(),
          stories: [],
          hasUnseen: false,
        };
      }

      const hasViewed = story.viewers.some(
        (v) => v.user && v.user.toString() === currentUser._id.toString()
      );

      if (!hasViewed && authorId !== currentUser._id.toString()) {
        userStoriesMap[authorId].hasUnseen = true;
      }

      userStoriesMap[authorId].stories.push({
        _id: story._id,
        media: story.media,
        caption: story.caption,
        createdAt: story.createdAt,
        hasViewed,
        viewersCount: story.viewers.length,
      });
    });

    // Convert map to sorted array (own story first, then unseen stories, then seen)
    const groupedStories = Object.values(userStoriesMap).sort((a, b) => {
      if (a.isOwn) return -1;
      if (b.isOwn) return 1;
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      return 0;
    });

    res.json({ success: true, stories: groupedStories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/stories/:id/view — Mark story as viewed
router.post('/:id/view', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Pulse expired or not found' });

    const alreadyViewed = story.viewers.some(
      (v) => v.user && v.user.toString() === req.user._id.toString()
    );

    if (!alreadyViewed && story.author.toString() !== req.user._id.toString()) {
      story.viewers.push({ user: req.user._id });
      await story.save();
    }

    res.json({ success: true, message: 'Pulse synchronized' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/stories/:id — Delete pulse
router.delete('/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Pulse not found' });

    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to purge this pulse' });
    }

    await Story.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Pulse terminated from Nexus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
