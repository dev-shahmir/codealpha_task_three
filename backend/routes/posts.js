const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadImage, uploadVideo } = require('../config/cloudinary');
const multer = require('multer');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildPersonalizedFeed = async (userId) => {
  const user = await User.findById(userId);
  const followingIds = user.following;
  const interests = user.interests;

  return {
    $or: [
      { author: { $in: followingIds } },
      { categories: { $in: interests } },
      { tags: { $in: interests } },
    ],
  };
};

const populatePost = (query) =>
  query
    .populate('author', 'username displayName avatar auraLevel isVerified')
    .populate('sharedFrom', 'caption media author');

// ─── CREATE POST ─────────────────────────────────────────────────────────────

// ─── CREATE POST ─────────────────────────────────────────────────────────────

router.post('/', protect, (req, res, next) => {
  uploadImage.array('images', 4)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { caption, tags, categories, type = 'post' } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const media = (req.files || []).map((f) => ({
      url: f.path.startsWith('http') ? f.path : `${baseUrl}/uploads/${f.filename}`,
      publicId: f.filename,
      type: 'image',
    }));

    const post = await Post.create({
      author: req.user._id,
      caption,
      media,
      type,
      tags: tags ? JSON.parse(tags) : [],
      categories: categories ? JSON.parse(categories) : [],
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1, auraScore: 10 } });
    const populated = await populatePost(Post.findById(post._id));
    res.status(201).json({ success: true, post: populated, message: 'Dropped ✨' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CREATE CLIP (short video) ────────────────────────────────────────────────

router.post('/clips', protect, (req, res, next) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { caption, tags, categories, audioName, audioArtist } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'Video file required' });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const videoUrl = req.file.path.startsWith('http') ? req.file.path : `${baseUrl}/uploads/${req.file.filename}`;

    const media = [{
      url: videoUrl,
      publicId: req.file.filename,
      type: 'video',
      thumbnail: videoUrl,
    }];

    const post = await Post.create({
      author: req.user._id,
      caption,
      media,
      type: 'clip',
      tags: tags ? JSON.parse(tags) : [],
      categories: categories ? JSON.parse(categories) : [],
      audio: audioName ? { name: audioName, artist: audioArtist || 'Original' } : undefined,
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1, auraScore: 15 } });
    const populated = await populatePost(Post.findById(post._id));
    res.status(201).json({ success: true, post: populated, message: 'Clip dropped 🎬' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PERSONALIZED FEED ────────────────────────────────────────────────────────

router.get('/feed', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const filter = await buildPersonalizedFeed(req.user._id);
    filter.isDeleted = false;
    filter.isPublic = true;
    filter.type = 'post';

    const posts = await populatePost(
      Post.find(filter)
        .sort({ createdAt: -1 })
        .limit(+limit)
        .skip((+page - 1) * +limit)
    );

    // Fallback: if not enough posts, pad with trending
    let finalPosts = posts;
    if (posts.length < 5) {
      const trending = await populatePost(
        Post.find({ isDeleted: false, isPublic: true, type: 'post' })
          .sort({ auraCount: -1, createdAt: -1 })
          .limit(+limit - posts.length)
      );
      const existingIds = new Set(posts.map((p) => p._id.toString()));
      finalPosts = [...posts, ...trending.filter((p) => !existingIds.has(p._id.toString()))];
    }

    const withMeta = finalPosts.map((p) => ({
      ...p.toObject(),
      hasAura: p.aura.includes(req.user._id),
      hasSaved: p.saves.includes(req.user._id),
    }));

    res.json({ success: true, posts: withMeta, page: +page, hasMore: posts.length === +limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CLIPS FEED (Reels - STRICTLY VIDEOS ONLY) ───────────────────────────────

router.get('/clips/feed', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = await User.findById(req.user._id);
    const interests = user?.interests || [];
    const followingIds = user?.following || [];

    // Query strictly for posts where type is 'clip' OR media has type 'video' and media url exists
    const videoFilter = {
      isDeleted: false,
      isPublic: true,
      $or: [
        { type: 'clip' },
        { 'media.type': 'video' },
      ],
      'media.0': { $exists: true },
    };

    let clips = await populatePost(
      Post.find(videoFilter)
        .sort({ createdAt: -1 })
        .limit(+limit)
        .skip((+page - 1) * +limit)
    );

    // Double check to strictly remove any post that doesn't actually have a video media file
    clips = clips.filter((p) => {
      const firstMedia = p.media?.[0];
      return firstMedia && (firstMedia.type === 'video' || /\.(mp4|mov|webm|avi|mkv|m4v)(\?.*)?$/i.test(firstMedia.url || ''));
    });

    const withMeta = clips.map((p) => ({
      ...p.toObject(),
      hasAura: (p.aura || []).includes(req.user._id),
      hasSaved: (p.saves || []).includes(req.user._id),
    }));

    res.json({ success: true, clips: withMeta, page: +page, hasMore: clips.length === +limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── EXPLORE / TRENDING ───────────────────────────────────────────────────────

router.get('/explore', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12, tag } = req.query;
    const filter = { isDeleted: false, isPublic: true };
    if (tag) filter.tags = tag;

    const posts = await populatePost(
      Post.find(filter)
        .sort({ auraCount: -1, createdAt: -1 })
        .limit(+limit)
        .skip((+page - 1) * +limit)
    );

    const withMeta = posts.map((p) => ({
      ...p.toObject(),
      hasAura: req.user ? (p.aura || []).includes(req.user._id) : false,
      hasSaved: req.user ? (p.saves || []).includes(req.user._id) : false,
    }));

    res.json({ success: true, posts: withMeta, page: +page, hasMore: posts.length === +limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── USER POSTS ───────────────────────────────────────────────────────────────

router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12, type } = req.query;
    const filter = { author: req.params.userId, isDeleted: false, isPublic: true };
    if (type) filter.type = type;

    const posts = await populatePost(
      Post.find(filter)
        .sort({ createdAt: -1 })
        .limit(+limit)
        .skip((+page - 1) * +limit)
    );

    const withMeta = posts.map((p) => ({
      ...p.toObject(),
      hasAura: req.user ? (p.aura || []).includes(req.user._id) : false,
      hasSaved: req.user ? (p.saves || []).includes(req.user._id) : false,
    }));

    res.json({ success: true, posts: withMeta, page: +page, hasMore: posts.length === +limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET SAVED POSTS ─────────────────────────────────────────────────────────

router.get('/saved', protect, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const posts = await populatePost(
      Post.find({ saves: req.user._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(+limit)
        .skip((+page - 1) * +limit)
    );

    const withMeta = posts.map((p) => ({
      ...p.toObject(),
      hasAura: p.aura.includes(req.user._id),
      hasSaved: true,
    }));

    res.json({ success: true, posts: withMeta, page: +page, hasMore: posts.length === +limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── SINGLE POST ──────────────────────────────────────────────────────────────

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await populatePost(Post.findById(req.params.id));
    if (!post || post.isDeleted) return res.status(404).json({ success: false, message: 'Post not found' });

    // Increment view
    await Post.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });

    const obj = post.toObject();
    if (req.user) {
      obj.hasAura = post.aura.includes(req.user._id);
      obj.hasSaved = post.saves.includes(req.user._id);
    }

    res.json({ success: true, post: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GIVE/REMOVE AURA (like) ──────────────────────────────────────────────────

router.post('/:id/aura', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const hasAura = post.aura.includes(req.user._id);

    if (hasAura) {
      await Post.findByIdAndUpdate(req.params.id, {
        $pull: { aura: req.user._id },
        $inc: { auraCount: -1 },
      });
      // Remove aura score from author
      await User.findByIdAndUpdate(post.author, { $inc: { auraScore: -2 } });
      res.json({ success: true, action: 'removed', message: 'Aura taken back 😤' });
    } else {
      await Post.findByIdAndUpdate(req.params.id, {
        $addToSet: { aura: req.user._id },
        $inc: { auraCount: 1 },
      });
      // Boost author aura score
      await User.findByIdAndUpdate(post.author, { $inc: { auraScore: 2 } });

      // Notification (don't notify self)
      if (post.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: 'aura',
          post: post._id,
          message: `@${req.user.username} gave your post aura ✨`,
        });
        if (req.io) req.io.to(post.author.toString()).emit('notification', { type: 'aura' });
      }

      res.json({ success: true, action: 'given', message: 'Aura given ✨' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── REACT: BASED or CRINGE ───────────────────────────────────────────────────

router.post('/:id/react', protect, async (req, res) => {
  try {
    const { reaction } = req.body; // 'based' | 'cringe'
    if (!['based', 'cringe'].includes(reaction)) {
      return res.status(400).json({ success: false, message: 'Reaction must be based or cringe' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const opposite = reaction === 'based' ? 'cringe' : 'based';
    const hasReacted = post.reactions[reaction].includes(req.user._id);
    const hasOpposite = post.reactions[opposite].includes(req.user._id);

    const update = {};
    if (hasReacted) {
      update.$pull = { [`reactions.${reaction}`]: req.user._id };
      update.$inc = { [`${reaction}Count`]: -1 };
    } else {
      update.$addToSet = { [`reactions.${reaction}`]: req.user._id };
      update.$inc = { [`${reaction}Count`]: 1 };
      if (hasOpposite) {
        update.$pull = { [`reactions.${opposite}`]: req.user._id };
        update.$inc[`${opposite}Count`] = -1;
      }
    }

    await Post.findByIdAndUpdate(req.params.id, update);
    res.json({ success: true, action: hasReacted ? 'removed' : 'added', reaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── SHARE POST ───────────────────────────────────────────────────────────────

router.post('/:id/share', protect, async (req, res) => {
  try {
    const original = await Post.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Post not found' });

    const { caption } = req.body;

    const shared = await Post.create({
      author: req.user._id,
      caption: caption || '',
      type: original.type,
      sharedFrom: original._id,
      shareChain: (original.shareChain || 0) + 1,
      categories: original.categories,
      tags: original.tags,
    });

    await Post.findByIdAndUpdate(req.params.id, { $inc: { sharesCount: 1 } });
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } });
    await User.findByIdAndUpdate(original.author, { $inc: { auraScore: 5 } });

    const populated = await populatePost(Post.findById(shared._id));
    res.status(201).json({ success: true, post: populated, message: 'Vibe passed on 🔁' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── SAVE POST ────────────────────────────────────────────────────────────────

router.post('/:id/save', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const hasSaved = post.saves.includes(req.user._id);
    if (hasSaved) {
      await Post.findByIdAndUpdate(req.params.id, { $pull: { saves: req.user._id }, $inc: { savesCount: -1 } });
      res.json({ success: true, action: 'unsaved' });
    } else {
      await Post.findByIdAndUpdate(req.params.id, { $addToSet: { saves: req.user._id }, $inc: { savesCount: 1 } });
      res.json({ success: true, action: 'saved', message: 'Saved to your collection 📌' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE POST ──────────────────────────────────────────────────────────────

router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your post to delete' });
    }
    post.isDeleted = true;
    await post.save();
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: -1 } });
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
