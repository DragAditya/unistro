const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const authenticate = require('../middleware/auth');
const supabase = require('../config/supabase');
const { downloadFileFromTelegram } = require('../services/fileService');

// Create a share link
router.post('/create/:fileId', authenticate, async (req, res, next) => {
  try {
    const { expires_at, max_downloads } = req.body;

    // Verify file ownership
    const { data: file, error: fileErr } = await supabase
      .from('files')
      .select('id')
      .eq('id', req.params.fileId)
      .eq('user_id', req.user.id)
      .single();

    if (fileErr || !file) return res.status(404).json({ error: 'File not found' });

    // Generate unique un-guessable token
    const token = crypto.randomBytes(16).toString('hex');

    const { data: share, error } = await supabase
      .from('shared_links')
      .insert({
        file_id: req.params.fileId,
        token: token,
        created_by: req.user.id,
        expires_at: expires_at,
        max_downloads: parseInt(max_downloads) || null
      })
      .select()
      .single();

    if (error) throw error;
    
    // Construct full share URL to return to frontend
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${share.token}`;
    res.json({ share_link: share, url: shareUrl });
  } catch (error) {
    next(error);
  }
});

// View share info (Public Route)
router.get('/:token', async (req, res, next) => {
  try {
    const { data: share, error } = await supabase
      .from('shared_links')
      .select('*, files(id, original_name, mime_type, file_size, file_type)')
      .eq('token', req.params.token)
      .single();

    if (error || !share) return res.status(404).json({ error: 'Link invalid or expired' });

    // Enforce limits
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Link has expired' });
    }
    if (share.max_downloads !== null && share.downloads >= share.max_downloads) {
      return res.status(403).json({ error: 'Download limit reached' });
    }

    res.json({
      file: {
        name: share.files.original_name,
        size: share.files.file_size,
        type: share.files.file_type,
        mime: share.files.mime_type
      },
      expiresAt: share.expires_at,
      downloadsRemaining: share.max_downloads ? share.max_downloads - share.downloads : null
    });
  } catch (error) {
    next(error);
  }
});

// Download from share link (Public Route)
router.get('/:token/download', async (req, res, next) => {
  try {
    // 1. Fetch link info
    const { data: share, error } = await supabase
      .from('shared_links')
      .select('*, files(*), users:created_by (id, storage_channel_id, telegram_session)')
      .eq('token', req.params.token)
      .single();

    if (error || !share) return res.status(404).json({ error: 'Link invalid' });

    // 2. Validate limits
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Link expired' });
    }
    if (share.max_downloads !== null && share.downloads >= share.max_downloads) {
      return res.status(403).json({ error: 'Download limit reached' });
    }

    // 3. Download from Telegram using the owner's session (which we fetch directly since it's an unauthenticated request)
    const fileOwner = share.users;
    const file = share.files;

    // A hack for downloadFileFromTelegram parameter requirement which expects { id, storage_channel_id, telegram_session }
    const fileBuffer = await downloadFileFromTelegram(fileOwner, file.telegram_message_id);

    // 4. Increment download counter asynchronously
    supabase.rpc('increment_download_count', { link_id: share.id }).then();

    // 5. Pipe to response
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.file_size);
    res.send(fileBuffer);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
