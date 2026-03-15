const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const telegramService = require('../services/telegramService');
const fileService = require('../services/fileService');
const thumbnailService = require('../services/thumbnailService');
const { detectFileType, getMimeType, sanitizeFileName, generateUniqueFileName } = require('../utils/helpers');

// Multer config — store in memory, max 2GB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

/**
 * GET /api/files
 * List files with pagination and filters
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { folder_id, type, starred, deleted, page, limit, sort, order } = req.query;

    const result = await fileService.getFiles(req.user.id, {
      folderId: folder_id,
      type,
      isStarred: starred === 'true' ? true : undefined,
      isDeleted: deleted === 'true' ? true : (deleted === 'false' ? false : undefined),
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sort: sort || 'created_at',
      order: order || 'desc',
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/files/upload
 * Upload a file
 */
router.post('/upload', authenticate, uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { folder_id, caption } = req.body;
    const user = req.user;

    if (!user.channel_id) {
      return res.status(400).json({ error: 'Storage not initialized. Please re-login.' });
    }

    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype || getMimeType(originalName);
    const fileType = detectFileType(mimeType);
    const fileName = generateUniqueFileName(originalName);

    // Get Telegram client and upload
    const client = await telegramService.getClient(user.id);
    const uploadResult = await telegramService.uploadFile(
      client,
      user.channel_id,
      req.file.buffer,
      fileName,
      mimeType
    );

    // Generate thumbnail for images
    let thumbnailMessageId = null;
    let width = null;
    let height = null;

    if (fileType === 'image') {
      const metadata = await thumbnailService.getImageMetadata(req.file.buffer);
      if (metadata) {
        width = metadata.width;
        height = metadata.height;
      }
    }

    // Save file metadata to database
    const fileRecord = await fileService.createFile({
      user_id: user.id,
      folder_id: folder_id || null,
      telegram_message_id: uploadResult.messageId,
      file_name: fileName,
      original_name: originalName,
      file_size: req.file.size,
      mime_type: mimeType,
      file_type: fileType,
      thumbnail_message_id: thumbnailMessageId,
      width,
      height,
      caption: caption || null,
    });

    res.status(201).json({ file: fileRecord });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/:id/download
 * Download a file
 */
router.get('/:id/download', authenticate, async (req, res, next) => {
  try {
    const file = await fileService.getFileById(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const client = await telegramService.getClient(req.user.id);
    const buffer = await telegramService.downloadFile(
      client,
      req.user.channel_id,
      file.telegram_message_id
    );

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/:id/preview
 * Preview/stream a file (supports range requests for video)
 */
router.get('/:id/preview', authenticate, async (req, res, next) => {
  try {
    const file = await fileService.getFileById(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const client = await telegramService.getClient(req.user.id);

    // Handle range requests for video/audio streaming
    const range = req.headers.range;
    if (range && (file.file_type === 'video' || file.file_type === 'audio')) {
      const buffer = await telegramService.downloadFile(
        client,
        req.user.channel_id,
        file.telegram_message_id
      );

      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${buffer.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': file.mime_type,
      });
      res.end(buffer.slice(start, end + 1));
    } else {
      const buffer = await telegramService.downloadFile(
        client,
        req.user.channel_id,
        file.telegram_message_id
      );

      const disposition = file.file_type === 'document' && file.mime_type === 'application/pdf'
        ? 'inline'
        : 'inline';

      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.original_name)}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/:id/thumbnail
 * Get file thumbnail
 */
router.get('/:id/thumbnail', authenticate, async (req, res, next) => {
  try {
    const file = await fileService.getFileById(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.file_type !== 'image') {
      return res.status(400).json({ error: 'Thumbnails only available for images' });
    }

    const client = await telegramService.getClient(req.user.id);
    const buffer = await telegramService.downloadFile(
      client,
      req.user.channel_id,
      file.telegram_message_id
    );

    const thumbnail = await thumbnailService.generateThumbnail(buffer);
    if (!thumbnail) {
      return res.status(500).json({ error: 'Failed to generate thumbnail' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(thumbnail);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/files/:id
 * Update file metadata
 */
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { file_name, folder_id, caption, is_starred, tags } = req.body;
    const updates = {};

    if (file_name !== undefined) updates.original_name = sanitizeFileName(file_name);
    if (folder_id !== undefined) updates.folder_id = folder_id || null;
    if (caption !== undefined) updates.caption = caption;
    if (is_starred !== undefined) updates.is_starred = is_starred;
    if (tags !== undefined) updates.tags = tags;

    const file = await fileService.updateFile(req.params.id, req.user.id, updates);
    res.json({ file });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/files/:id
 * Soft delete (move to trash)
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await fileService.softDeleteFile(req.params.id, req.user.id);
    res.json({ message: 'File moved to trash' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/files/:id/permanent
 * Permanently delete
 */
router.delete('/:id/permanent', authenticate, async (req, res, next) => {
  try {
    const file = await fileService.getFileById(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from Telegram
    try {
      const client = await telegramService.getClient(req.user.id);
      await telegramService.deleteMessage(client, req.user.channel_id, file.telegram_message_id);
    } catch (e) {
      console.error('Failed to delete from Telegram:', e.message);
    }

    // Delete from DB
    await fileService.permanentDeleteFile(req.params.id, req.user.id);
    res.json({ message: 'File permanently deleted' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/files/:id/restore
 * Restore from trash
 */
router.post('/:id/restore', authenticate, async (req, res, next) => {
  try {
    const file = await fileService.restoreFile(req.params.id, req.user.id);
    res.json({ file });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/files/bulk-delete
 * Bulk soft delete
 */
router.post('/bulk-delete', authenticate, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'File IDs array required' });
    }

    const files = await fileService.bulkSoftDelete(ids, req.user.id);
    res.json({ message: `${files.length} files moved to trash`, files });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/files/bulk-move
 * Bulk move to folder
 */
router.post('/bulk-move', authenticate, async (req, res, next) => {
  try {
    const { ids, folder_id } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'File IDs array required' });
    }

    const files = await fileService.bulkMoveFiles(ids, folder_id, req.user.id);
    res.json({ message: `${files.length} files moved`, files });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
