const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const authenticate = require('../middleware/auth');
const { sendOTP, verifyOTP } = require('../services/telegramAuth');

// Send Telegram OTP
router.post('/send-otp', authLimiter, async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

    const result = await sendOTP(phoneNumber);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Verify OTP (and optional 2FA password)
router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { tempSessionId, code, password } = req.body;
    if (!tempSessionId || !code) {
      return res.status(400).json({ error: 'Missing verification parameters' });
    }

    const result = await verifyOTP(tempSessionId, code, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Fetch Current User
router.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
});

// Logout User
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // In a full implementation, you'd invalidate the token or clear active Telegram clients
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
