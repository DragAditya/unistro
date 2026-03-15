const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const telegramService = require('../services/telegramService');
const { generateShareToken } = require('../utils/helpers');
const supabase = require('../config/supabase');

/**
 * POST /api/share
 * Create a share link for a file
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { file_id, expires_in_hours, max_downloads } = req.body;

    if (!file_id) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Verify file belongs to user
    const { data: file } = await supabase
      .from('files')
      .select('id')
      .eq('id', file_id)
      .eq('user_id', req.user.id)
      .single();

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const token = generateShareToken();
    let expiresAt = null;

    if (expires_in_hours) {
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + parseInt(expires_in_hours));
      expiresAt = expiry.toISOString();
    }

    const { data: shareLink, error } = await supabase
      .from('share_links')
      .insert({
        file_id,
        user_id: req.user.id,
        token,
        expires_at: expiresAt,
        max_downloads: max_downloads || null,
      })
      .select()
      .single();

    if (error) throw error;

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${token}`;

    res.status(201).json({
      shareUrl,
      token: shareLink.token,
      expiresAt: shareLink.expires_at,
      maxDownloads: shareLink.max_downloads,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/share/:token
 * Access a shared file (no auth required)
 */
router.get('/:token', async (req, res, next) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data: shareLink } = await supabase
      .from('share_links')
      .select('*, files(*), users(*)')
      .eq('token', req.params.token)
      .eq('is_active', true)
      .single();

    if (!shareLink) {
      return res.status(404).json({ error: 'Share link not found or has been deactivated' });
    }

    // Check expiry
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This share link has expired' });
    }

    // Check download limit
    if (shareLink.max_downloads && shareLink.download_count >= shareLink.max_downloads) {
      return res.status(410).json({ error: 'This share link has reached its download limit' });
    }

    const file = shareLink.files;
    if (!file) {
      return res.status(404).json({ error: 'File no longer exists' });
    }

    res.json({
      file: {
        name: file.original_name,
        size: file.file_size,
        type: file.file_type,
        mimeType: file.mime_type,
      },
      expiresAt: shareLink.expires_at,
      downloadsRemaining: shareLink.max_downloads
        ? shareLink.max_downloads - shareLink.download_count
        : null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/share/:token/download
 * Download a shared file
 */
router.get('/:token/download', async (req, res, next) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data: shareLink } = await supabase
      .from('share_links')
      .select('*, files(*)')
      .eq('token', req.params.token)
      .eq('is_active', true)
      .single();

    if (!shareLink) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Share link expired' });
    }

    if (shareLink.max_downloads && shareLink.download_count >= shareLink.max_downloads) {
      return res.status(410).json({ error: 'Download limit reached' });
    }

    const file = shareLink.files;
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Download from Telegram
    const client = await telegramService.getClient(shareLink.user_id);
    const { data: user } = await supabase
      .from('users')
      .select('channel_id')
      .eq('id', shareLink.user_id)
      .single();

    const buffer = await telegramService.downloadFile(
      client,
      user.channel_id,
      file.telegram_message_id
    );

    // Increment download count
    await supabase
      .from('share_links')
      .update({ download_count: shareLink.download_count + 1 })
      .eq('id', shareLink.id);

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/share/:token
 * Deactivate a share link
 */
router.delete('/:token', authenticate, async (req, res, next) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { error } = await supabase
      .from('share_links')
      .update({ is_active: false })
      .eq('token', req.params.token)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Share link deactivated' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/share/file/:fileId/links
 * Get all share links for a file
 */
router.get('/file/:fileId/links', authenticate, async (req, res, next) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('file_id', req.params.fileId)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ links: data || [] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
