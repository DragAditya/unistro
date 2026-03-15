const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../config/supabase');

/**
 * GET /api/folders
 * Get all folders for current user
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { parent_id } = req.query;

    let query = supabase
      .from('folders')
      .select('*')
      .eq('user_id', req.user.id)
      .order('name', { ascending: true });

    if (parent_id) {
      query = query.eq('parent_id', parent_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get file counts per folder
    const folderIds = data.map(f => f.id);
    let fileCounts = {};

    if (folderIds.length > 0) {
      for (const folderId of folderIds) {
        const { count } = await supabase
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('folder_id', folderId)
          .eq('is_deleted', false);
        fileCounts[folderId] = count || 0;
      }
    }

    const folders = data.map(f => ({
      ...f,
      fileCount: fileCounts[f.id] || 0,
    }));

    res.json({ folders });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/folders/:id
 * Get a single folder with its contents
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data: folder, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Build breadcrumb path
    const breadcrumbs = [folder];
    let current = folder;
    while (current.parent_id) {
      const { data: parent } = await supabase
        .from('folders')
        .select('*')
        .eq('id', current.parent_id)
        .single();
      if (parent) {
        breadcrumbs.unshift(parent);
        current = parent;
      } else break;
    }

    // Get subfolders
    const { data: subfolders } = await supabase
      .from('folders')
      .select('*')
      .eq('parent_id', folder.id)
      .eq('user_id', req.user.id)
      .order('name');

    res.json({ folder, breadcrumbs, subfolders: subfolders || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/folders
 * Create a new folder
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { name, parent_id, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folderData = {
      user_id: req.user.id,
      name: name.trim(),
      parent_id: parent_id || null,
      color: color || '#6366f1',
    };

    const { data, error } = await supabase
      .from('folders')
      .insert(folderData)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ folder: data });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/folders/:id
 * Update a folder
 */
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { name, color } = req.body;
    const updates = { updated_at: new Date().toISOString() };

    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color;

    const { data, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ folder: data });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/folders/:id
 * Delete a folder (move contained files to root)
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    // Move files in this folder to root
    await supabase
      .from('files')
      .update({ folder_id: null, updated_at: new Date().toISOString() })
      .eq('folder_id', req.params.id)
      .eq('user_id', req.user.id);

    // Move subfolders to parent
    const { data: folder } = await supabase
      .from('folders')
      .select('parent_id')
      .eq('id', req.params.id)
      .single();

    await supabase
      .from('folders')
      .update({ parent_id: folder?.parent_id || null })
      .eq('parent_id', req.params.id)
      .eq('user_id', req.user.id);

    // Delete the folder
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
