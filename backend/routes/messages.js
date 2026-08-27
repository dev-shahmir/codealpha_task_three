const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/messages/conversations — Get all active user conversations
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username displayName avatar auraLevel isVerified')
      .populate('lastMessage.sender', 'username displayName');

    // Attach unread count for current user
    const formatted = conversations.map((c) => {
      const otherParticipant = c.participants.find(
        (p) => p._id.toString() !== req.user._id.toString()
      ) || c.participants[0];

      const unread = (c.unreadCount && c.unreadCount.get(req.user._id.toString())) || 0;

      return {
        _id: c._id,
        participant: otherParticipant,
        lastMessage: c.lastMessage,
        unreadCount: unread,
        updatedAt: c.updatedAt,
      };
    });

    res.json({ success: true, conversations: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/messages/c/:conversationId — Get conversation message history
router.get('/c/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Frequency not found or unauthorized' });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('sender', 'username displayName avatar');

    // Reset unread count for this user
    if (conversation.unreadCount) {
      conversation.unreadCount.set(req.user._id.toString(), 0);
      await conversation.save();
    }

    await Message.updateMany(
      { conversationId, recipient: req.user._id, read: false },
      { read: true }
    );

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/messages — Send direct message
router.post('/', protect, async (req, res) => {
  try {
    const { recipientId, conversationId, text, media } = req.body;

    if (!text && !media) {
      return res.status(400).json({ success: false, message: 'Transmission content required' });
    }

    let convId = conversationId;

    // If no conversationId provided, find or create conversation
    if (!convId) {
      if (!recipientId) {
        return res.status(400).json({ success: false, message: 'Recipient node is required' });
      }

      let conv = await Conversation.findOne({
        participants: { $all: [req.user._id, recipientId] },
      });

      if (!conv) {
        conv = await Conversation.create({
          participants: [req.user._id, recipientId],
          unreadCount: { [recipientId]: 0, [req.user._id.toString()]: 0 },
        });
      }
      convId = conv._id;
    }

    const targetConv = await Conversation.findById(convId);
    if (!targetConv) {
      return res.status(404).json({ success: false, message: 'Frequency expired or unavailable' });
    }

    const recipientUserId = targetConv.participants.find(
      (p) => p.toString() !== req.user._id.toString()
    );

    const message = await Message.create({
      conversationId: convId,
      sender: req.user._id,
      recipient: recipientUserId,
      text: text || '',
      media: media || undefined,
    });

    // Update conversation last message & unread
    let currentUnread = 0;
    if (targetConv.unreadCount) {
      if (typeof targetConv.unreadCount.get === 'function') {
        currentUnread = targetConv.unreadCount.get(recipientUserId.toString()) || 0;
      } else {
        currentUnread = targetConv.unreadCount[recipientUserId.toString()] || 0;
      }
    } else {
      targetConv.unreadCount = new Map();
    }

    targetConv.lastMessage = {
      text: text || (media ? 'Sent an attachment 📎' : ''),
      sender: req.user._id,
      createdAt: new Date(),
    };

    if (targetConv.unreadCount) {
      if (typeof targetConv.unreadCount.set === 'function') {
        targetConv.unreadCount.set(recipientUserId.toString(), currentUnread + 1);
      } else {
        targetConv.unreadCount[recipientUserId.toString()] = currentUnread + 1;
      }
    }
    await targetConv.save();

    const populatedMsg = await Message.findById(message._id).populate('sender', 'username displayName avatar');

    // Emit real-time message via Socket.io
    if (req.io) {
      req.io.to(recipientUserId.toString()).emit('receive_message', {
        message: populatedMsg,
        conversationId: convId,
      });

      req.io.to(recipientUserId.toString()).emit('conversation_updated', {
        conversationId: convId,
        lastMessage: targetConv.lastMessage,
      });
    }

    res.status(201).json({ success: true, message: populatedMsg, conversationId: convId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/messages/initiate/:username — Start conversation with a user by username
router.post('/initiate/:username', protect, async (req, res) => {
  try {
    const targetUser = await User.findOne({
      username: { $regex: new RegExp(`^${req.params.username}$`, 'i') },
    });
    if (!targetUser) return res.status(404).json({ success: false, message: 'User node not found' });

    let conv = await Conversation.findOne({
      participants: { $all: [req.user._id, targetUser._id] },
    }).populate('participants', 'username displayName avatar auraLevel isVerified');

    if (!conv) {
      conv = await Conversation.create({
        participants: [req.user._id, targetUser._id],
        unreadCount: { [targetUser._id.toString()]: 0, [req.user._id.toString()]: 0 },
      });
      conv = await Conversation.findById(conv._id).populate('participants', 'username displayName avatar auraLevel isVerified');
    }

    const other = conv.participants.find((p) => p._id.toString() !== req.user._id.toString()) || targetUser;

    res.json({
      success: true,
      conversation: {
        _id: conv._id,
        participant: other,
        lastMessage: conv.lastMessage,
        unreadCount: 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
