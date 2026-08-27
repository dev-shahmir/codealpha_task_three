const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── Connect Database ─────────────────────────────────────────────────────────
connectDB();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// Rate limiting
const isDev = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: isDev ? 10000 : 500, message: 'Too many requests, slow down bestie 🐌' });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: isDev ? 5000 : 100, message: 'Too many auth attempts 🔒' });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ─── Static Uploads ──────────────────────────────────────────────────────────
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Attach io to every request ───────────────────────────────────────────────
app.use((req, res, next) => { req.io = io; next(); });

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/messages', require('./routes/messages'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'NEXUS', time: new Date() }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Frequency not found on NEXUS Network' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('💀 NEXUS Error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Transmission anomaly detected' });
});

// ─── Socket.io Handlers ───────────────────────────────────────────────────────
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`⚡ Node connected: ${socket.id}`);

  socket.on('user_online', (userId) => {
    if (!userId) return;
    onlineUsers.set(userId.toString(), socket.id);
    socket.join(userId.toString());
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  // Post comments typing
  socket.on('typing', ({ postId, username }) => {
    socket.to(postId).emit('user_typing', { username });
  });

  socket.on('stop_typing', ({ postId }) => {
    socket.to(postId).emit('user_stop_typing');
  });

  socket.on('join_post', (postId) => socket.join(postId));
  socket.on('leave_post', (postId) => socket.leave(postId));

  // Direct Messaging Socket Events
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on('typing_dm', ({ conversationId, recipientId, username }) => {
    if (conversationId) {
      socket.to(conversationId).emit('user_typing_dm', { conversationId, username });
    } else if (recipientId) {
      socket.to(recipientId).emit('user_typing_dm', { username });
    }
  });

  socket.on('stop_typing_dm', ({ conversationId, recipientId }) => {
    if (conversationId) {
      socket.to(conversationId).emit('user_stop_typing_dm', { conversationId });
    } else if (recipientId) {
      socket.to(recipientId).emit('user_stop_typing_dm');
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.forEach((id, userId) => {
      if (id === socket.id) onlineUsers.delete(userId);
    });
    io.emit('online_users', Array.from(onlineUsers.keys()));
    console.log(`💨 Node disconnected: ${socket.id}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🌌 ◈ NEXUS Core Server running on port ${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV || 'development'}\n`);
});
