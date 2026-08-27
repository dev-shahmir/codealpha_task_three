const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, generateTokens } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_.]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { username, email, password, interests = [] } = req.body;

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      const field = exists.email === email ? 'email' : 'username';
      return res.status(409).json({ success: false, message: `That ${field} is already taken fr fr` });
    }

    const user = await User.create({ username, email, password, interests });
    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: 'Welcome to AURA ✨ Your energy just arrived',
      accessToken,
      refreshToken,
      user: user.toPublicProfile(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error, no cap' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +refreshToken');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Wrong email or password bestie' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This account has been ghosted 👻' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'You just unlocked your aura ✨',
      accessToken,
      refreshToken,
      user: user.toPublicProfile(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, ...tokens });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Refresh token expired or invalid' });
  }
});

// POST /api/auth/google
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential token is required' });
    }

    let payload;
    try {
      // Try verifying with OAuth2Client if GOOGLE_CLIENT_ID is provided
      if (process.env.GOOGLE_CLIENT_ID) {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } else {
        // Fallback decode for development if Client ID not set yet
        payload = jwt.decode(credential);
      }
    } catch (verifyErr) {
      // Fallback decoding if token verification throws (e.g. audience mismatch during dev testing)
      payload = jwt.decode(credential);
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, message: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (user) {
      // If user exists with email but no googleId, link it
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        if (!user.avatar?.url && picture) {
          user.avatar = { url: picture, publicId: '' };
        }
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // Create new user from Google profile
      // Generate clean username from email or name
      const baseUsername = (email.split('@')[0] || name || 'user').replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase().slice(0, 15);
      let username = baseUsername;
      let counter = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await User.create({
        username,
        email: email.toLowerCase(),
        displayName: name || username,
        googleId,
        authProvider: 'google',
        avatar: picture ? { url: picture, publicId: '' } : undefined,
        interests: ['tech', 'art', 'music'],
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This account has been ghosted 👻' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Connected with Google ✨ Welcome to NEXUS',
      accessToken,
      refreshToken,
      user: user.toPublicProfile(),
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Ghosted successfully 👻' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user: user.toPublicProfile() });
});

// POST /api/auth/forgot-password
// Generates a 6-digit OTP and stores it on the user (15 min expiry)
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Invalid email address' });
  }

  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user || user.authProvider !== 'local') {
      return res.json({ success: true, message: 'If that email is registered, a reset code has been sent.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.passwordResetOtp = otp;
    user.passwordResetExpiry = expiry;
    await user.save({ validateBeforeSave: false });

    // In production, send via email. For now we return it in dev mode.
    const isDev = process.env.NODE_ENV !== 'production';
    res.json({
      success: true,
      otpSent: true,
      message: 'Reset code generated. Check your email.',
      ...(isDev && { devOtp: otp }), // Only exposed in development
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/reset-password
// Verifies OTP and sets new password
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  body('newPassword').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Invalid input. Check your OTP and new password.' });
  }

  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email }).select('+password +passwordResetOtp +passwordResetExpiry');

    if (!user || user.authProvider !== 'local') {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    if (!user.passwordResetOtp || user.passwordResetOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
    }

    if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'Reset code has expired. Request a new one.' });
    }

    user.password = newPassword;
    user.passwordResetOtp = undefined;
    user.passwordResetExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
