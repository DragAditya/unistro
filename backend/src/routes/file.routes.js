const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticate = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { uploadFileToTelegram, downloadFileFromTelegram, deleteFileFromTelegram } = require('../services/fileService');
const supabase = require('../config/supabase');
const { generateThumbnail } = require('../utils/thumbnailGenerator');

// Memory storage for simple buffers (for production, use streaming to disk/telegram directly)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 * 1024 } }); // 2GB limit

// Upload a generic file
router.post('/upload', authenticate, uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    
    let { folder_id, is_starred } = req.body;
    const { originalname, mimetype, size, buffer } = req.file;

    // Detect general file type
    let fileType = 'other';
    if (mimetype.startsWith('image/')) fileType = 'image';
    else if (mimetype.startsWith('video/')) fileType = 'video';
    else if (mimetype.startsWith('audio/')) fileType = 'audio';
    else if (mimetype.includes('pdf') || mimetype.includes('document')) fileType = 'document';

    // 1. Upload to Telegram
    const telegramMessageId = await uploadFileToTelegram(req.user, buffer, originalname, mimetype);

    // 2. Generate Thumbnail immediately if possible
    let thumbnailBuffer = null;
    if (fileType === 'image' || fileType === 'video') {
      try {
        thumbnailBuffer = await generateThumbnail(buffer, mimetype);
      } catch (err) {
        console.warn('Silent thumbnail failure:', err.message);
      }
    }

    // 3. Upload Thumbnail to Supabase Storage (for fast retrieval on UI)
    let thumbnailUrl = null;
    if (thumbnailBuffer) {
      const thumbFileName = `thumb_${req.user.id}_${Date.now()}.jpg`;
      const { data: thumbData, error: thumbError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbFileName, thumbnailBuffer, { contentType: 'image/jpeg' });
        
      if (!thumbError) thumbnailUrl = thumbFileName;
    }

    // 4. Save metadata in DB
    const { data: fileDoc, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: req.user.id,
        folder_id: folder_id || null,
        original_name: originalname,
        telegram_message_id: telegramMessageId,
        file_size: size,
        mime_type: mimetype,
        file_type: fileType,
        thumbnail_url: thumbnailUrl,
        is_starred: is_starred === 'true'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    res.status(201).json({ message: 'Upload successful', file: fileDoc });
  } catch (error) {
    next(error);
  }
});

// List files with pagination & filters
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { folder_id, type, starred, deleted, page = 1, limit = 50, q } = req.query;
    
    let query = supabase
      .from('files')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id);

    // Filters
    if (deleted === 'true') {
      query = query.not('deleted_at', 'is', null);
    } else {
      query = query.is('deleted_at', null); // Default exclude trash
      
      if (folder_id === 'root' || !folder_id) query = query.is('folder_id', null);
      else query = query.eq('folder_id', folder_id);
      
      if (type) query = query.eq('file_type', type);
      if (starred === 'true') query = query.eq('is_starred', true);
      if (q) query = query.ilike('original_name', `%${q}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: files, error, count } = await query;
    if (error) throw error;

    res.json({
      files,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    next(error);
  }
});

// Get a thumbnail (proxy through Express or redirect to Supabase public URL)
router.get('/:id/thumbnail', authenticate, async (req, res, next) => {
  try {
    const { data: file, error } = await supabase
      .from('files')
      .select('thumbnail_url')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !file?.thumbnail_url) {
      return res.redirect('/placeholder-thumbnail.png'); // Need to handle fallback
    }

    const { data: pubData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(file.thumbnail_url);

    res.redirect(pubData.publicUrl);
  } catch (error) {
    next(error);
  }
});

// Download actual file from Telegram
router.get('/:id/download', authenticate, async (req, res, next) => {
  try {
    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .single();

    if (error || !file) return res.status(404).json({ error: 'File not found' });

    const buffer = await downloadFileFromTelegram(req.user, file.telegram_message_id);

    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.file_size);
    
    // In production we should stream instead of sending full buffer
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// Soft Delete (Move to trash)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'File moved to trash' });
  } catch (error) {
    next(error);
  }
});

// Hard Delete (Permanent)
router.delete('/:id/permanent', authenticate, async (req, res, next) => {
  try {
    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .not('deleted_at', 'is', null)
      .single();

    if (error || !file) return res.status(404).json({ error: 'File not found in trash' });

    // Delete from Telegram
    await deleteFileFromTelegram(req.user, file.telegram_message_id);

    // Delete thumbnail from Supabase
    if (file.thumbnail_url) {
      await supabase.storage.from('thumbnails').remove([file.thumbnail_url]);
    }

    // Delete from DB
    await supabase.from('files').delete().eq('id', file.id);

    res.json({ message: 'File permanently deleted' });
  } catch (error) {
    next(error);
  }
});

// Restore from Trash
router.post('/:id/restore', authenticate, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('files')
      .update({ deleted_at: null })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'File restored' });
  } catch (error) {
    next(error);
  }
});

// Update metadata (rename, star, folder move)
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { original_name, is_starred, folder_id } = req.body;
    
    const updates = {};
    if (original_name !== undefined) updates.original_name = original_name;
    if (is_starred !== undefined) updates.is_starred = is_starred;
    if (folder_id !== undefined) updates.folder_id = folder_id; // null for root

    const { data, error } = await supabase
      .from('files')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
