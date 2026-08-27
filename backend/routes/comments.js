const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, optionalAuth } = require('../middleware/auth');

// GET /api/comments/:postId — get comments for a post
router.get('/:postId', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, parentId } = req.query;

    const filter = {
      post: req.params.postId,
      isDeleted: false,
      parentComment: parentId || null,
    };

    const comments = await Comment.find(filter)
      .sort({ isPinned: -1, auraCount: -1, createdAt: -1 })
      .limit(+limit)
      .skip((+page - 1) * +limit)
      .populate('author', 'username displayName avatar auraLevel isVerified');

    const withMeta = comments.map((c) => ({
      ...c.toObject(),
      hasAura: req.user ? c.aura.includes(req.user._id) : false,
    }));

    res.json({ success: true, comments: withMeta, page: +page, hasMore: comments.length === +limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/comments/:postId — drop a comment
router.post('/:postId', protect, async (req, res) => {
  try {
    const { text, parentCommentId } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment cannot be empty bestie' });

    const post = await Post.findById(req.params.postId);
    if (!post || post.isDeleted) return res.status(404).json({ success: false, message: 'Post not found' });

    // Parse mentions (@username)
    const mentionRegex = /@(\w+)/g;
    const mentionedUsernames = [...text.matchAll(mentionRegex)].map((m) => m[1]);
    const mentionedUsers = mentionedUsernames.length
      ? await User.find({ username: { $in: mentionedUsernames } }).select('_id')
      : [];

    const comment = await Comment.create({
      post: req.params.postId,
      author: req.user._id,
      text: text.trim(),
      parentComment: parentCommentId || null,
      mentions: mentionedUsers.map((u) => u._id),
    });

    await comment.populate('author', 'username displayName avatar auraLevel isVerified');

    // Increment counts
    await Post.findByIdAndUpdate(req.params.postId, { $inc: { commentsCount: 1 } });
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, { $inc: { repliesCount: 1 } });
    }

    // Aura boost for commenter
    await User.findByIdAndUpdate(req.user._id, { $inc: { auraScore: 1 } });

    // Notification to post author
    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: parentCommentId ? 'reply' : 'comment',
        post: post._id,
        comment: comment._id,
        message: `@${req.user.username} dropped: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`,
      });
      if (req.io) req.io.to(post.author.toString()).emit('notification', { type: 'comment' });
    }

    // Notifications to mentioned users
    for (const mentionedUser of mentionedUsers) {
      if (mentionedUser._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: mentionedUser._id,
          sender: req.user._id,
          type: 'mention',
          post: post._id,
          comment: comment._id,
          message: `@${req.user.username} mentioned you`,
        });
      }
    }

    res.status(201).json({ success: true, comment, message: 'Dropped 💧' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/comments/:commentId/aura — give aura to a comment
router.post('/:commentId/aura', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment || comment.isDeleted) return res.status(404).json({ success: false, message: 'Comment not found' });

    const hasAura = comment.aura.includes(req.user._id);

    if (hasAura) {
      await Comment.findByIdAndUpdate(req.params.commentId, {
        $pull: { aura: req.user._id },
        $inc: { auraCount: -1 },
      });
      res.json({ success: true, action: 'removed' });
    } else {
      await Comment.findByIdAndUpdate(req.params.commentId, {
        $addToSet: { aura: req.user._id },
        $inc: { auraCount: 1 },
      });
      res.json({ success: true, action: 'given', message: '✨' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/comments/:commentId
router.delete('/:commentId', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId).populate('post', 'author');
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isPostAuthor = comment.post?.author?.toString() === req.user._id.toString();

    if (!isAuthor && !isPostAuthor) {
      return res.status(403).json({ success: false, message: 'Not your comment to delete' });
    }

    comment.isDeleted = true;
    await comment.save();
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });

    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
