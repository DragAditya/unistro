const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticate, generateToken } = require('../middleware/auth');
const telegramService = require('../services/telegramService');
const { encryptSession } = require('../services/encryptionService');
const supabase = require('../config/supabase');

// Temporary session store (in-memory, for OTP flow)
const tempSessions = new Map();

/**
 * POST /api/auth/send-otp
 * Send OTP to phone number
 */
router.post('/send-otp', authLimiter, async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const { phoneCodeHash, sessionString } = await telegramService.sendOTP(phoneNumber);

    // Store temp session
    const tempSessionId = require('crypto').randomBytes(16).toString('hex');
    tempSessions.set(tempSessionId, {
      sessionString,
      phoneNumber,
      phoneCodeHash,
      createdAt: Date.now(),
    });

    // Clean up old sessions after 10 minutes
    setTimeout(() => tempSessions.delete(tempSessionId), 10 * 60 * 1000);

    res.json({
      phoneCodeHash,
      tempSessionId,
      message: 'OTP sent successfully',
    });
  } catch (err) {
    if (err.message && err.message.includes('PHONE_NUMBER_INVALID')) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    next(err);
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and complete login
 */
router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { phoneNumber, phoneCodeHash, code, tempSessionId, password } = req.body;

    if (!code || !tempSessionId) {
      return res.status(400).json({ error: 'Code and session ID are required' });
    }

    const tempSession = tempSessions.get(tempSessionId);
    if (!tempSession) {
      return res.status(400).json({ error: 'Session expired. Please request a new OTP.' });
    }

    const result = await telegramService.verifyOTP(
      tempSession.phoneNumber,
      tempSession.phoneCodeHash,
      code,
      tempSession.sessionString,
      password
    );

    // Handle 2FA required
    if (result.requiresPassword) {
      return res.json({
        requiresPassword: true,
        message: 'Two-factor authentication required',
      });
    }

    const { telegramUser, sessionString } = result;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Upsert user in database
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone', telegramUser.phone)
      .single();

    if (!user) {
      // Create new user
      const { data: newUser, error: createErr } = await supabase
        .from('users')
        .insert({
          phone: telegramUser.phone,
          telegram_user_id: telegramUser.id,
          first_name: telegramUser.firstName,
          last_name: telegramUser.lastName,
          username: telegramUser.username,
          avatar_url: telegramUser.avatarUrl,
        })
        .select()
        .single();

      if (createErr) throw createErr;
      user = newUser;

      // Create storage channel for new user
      try {
        const client = await telegramService.getClient(user.id);
        // We need the client from the verify step instead
      } catch (e) {
        console.log('Will create channel after session is saved');
      }
    } else {
      // Update existing user info
      await supabase
        .from('users')
        .update({
          first_name: telegramUser.firstName,
          last_name: telegramUser.lastName,
          username: telegramUser.username,
          avatar_url: telegramUser.avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    // Save encrypted session
    const encryptedSession = encryptSession(sessionString);
    await supabase
      .from('sessions')
      .upsert({
        user_id: user.id,
        encrypted_session: encryptedSession,
        last_used: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      });

    // Create storage channel if user doesn't have one
    if (!user.channel_id) {
      try {
        const client = await telegramService.getClient(user.id);
        const channel = await telegramService.createStorageChannel(client);

        await supabase
          .from('users')
          .update({
            channel_id: channel.channelId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        user.channel_id = channel.channelId;
      } catch (e) {
        console.error('Failed to create storage channel:', e.message);
      }
    }

    // Clean up temp session
    tempSessions.delete(tempSessionId);

    // Generate JWT
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        avatarUrl: user.avatar_url,
        channelId: user.channel_id,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    if (err.message && err.message.includes('PHONE_CODE_INVALID')) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    if (err.message && err.message.includes('PHONE_CODE_EXPIRED')) {
      return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
    }
    if (err.message && err.message.includes('PASSWORD_HASH_INVALID')) {
      return res.status(400).json({ error: 'Invalid two-factor password' });
    }
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Invalidate session
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    if (supabase) {
      await supabase
        .from('sessions')
        .delete()
        .eq('user_id', req.user.id);
    }

    telegramService.disconnectClient(req.user.id);

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res) => {
  const { fileService } = require('../services/fileService');
  const user = req.user;

  let stats = { totalFiles: 0, totalFolders: 0 };
  try {
    const fileServiceModule = require('../services/fileService');
    stats = await fileServiceModule.getFileStats(user.id);
  } catch (e) {}

  res.json({
    user: {
      id: user.id,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      avatarUrl: user.avatar_url,
      channelId: user.channel_id,
      createdAt: user.created_at,
      ...stats,
    },
  });
});

module.exports = router;
