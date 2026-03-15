const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const fileService = require('../services/fileService');
const supabase = require('../config/supabase');

/**
 * GET /api/search?q=query&type=image&folder_id=...
 * Search files and folders
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { q, type, folder_id, limit } = req.query;

    if (!q || !q.trim()) {
      return res.json({ files: [], folders: [] });
    }

    // Search files
    const files = await fileService.searchFiles(req.user.id, q.trim(), {
      type,
      folderId: folder_id,
      limit: parseInt(limit) || 20,
    });

    // Search folders
    let folders = [];
    if (supabase) {
      const { data } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', req.user.id)
        .ilike('name', `%${q.trim()}%`)
        .order('name')
        .limit(10);
      folders = data || [];
    }

    res.json({ files, folders });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
