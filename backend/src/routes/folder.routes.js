const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const supabase = require('../config/supabase');

// Create a new folder
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, parent_id, color } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Folder name is required' });

    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        user_id: req.user.id,
        name,
        parent_id: parent_id || null,
        color: color || '#3b82f6' // Default blue
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ folder });
  } catch (error) {
    next(error);
  }
});

// List folders (gets children of parent_id, or root if none)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { parent_id } = req.query;
    
    let query = supabase
      .from('folders')
      .select('*')
      .eq('user_id', req.user.id)
      .order('name');
      
    if (parent_id) {
      query = query.eq('parent_id', parent_id);
    } else {
      query = query.is('parent_id', null);
    }

    const { data: folders, error } = await query;
    if (error) throw error;

    res.json({ folders });
  } catch (error) {
    next(error);
  }
});

// Get folder details and its breadcrumb path
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const folderId = req.params.id;

    // 1. Get current folder
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', folderId)
      .eq('user_id', req.user.id)
      .single();

    if (folderError || !folder) return res.status(404).json({ error: 'Folder not found' });

    // 2. Get immediate subfolders
    const { data: subfolders } = await supabase
      .from('folders')
      .select('*')
      .eq('parent_id', folderId)
      .eq('user_id', req.user.id)
      .order('name');

    // 3. Build breadcrumbs (naive iterative approach for now)
    const breadcrumbs = [];
    let current = folder;
    breadcrumbs.unshift({ id: current.id, name: current.name });
    
    // In production, a recursive Postgres CTE is much better for this
    // but for simplicity we'll just fetch parents sequentially if depth is shallow
    let depth = 0;
    while (current.parent_id && depth < 5) {
      const { data: parent } = await supabase
        .from('folders')
        .select('*')
        .eq('id', current.parent_id)
        .single();
        
      if (!parent) break;
      breadcrumbs.unshift({ id: parent.id, name: parent.name });
      current = parent;
      depth++;
    }

    res.json({ folder, subfolders: subfolders || [], breadcrumbs });
  } catch (error) {
    next(error);
  }
});

// Update folder
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { name, parent_id, color } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (parent_id !== undefined) updates.parent_id = parent_id; // Allows moving to root if null
    if (color) updates.color = color;

    const { data: folder, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ folder });
  } catch (error) {
    next(error);
  }
});

// Delete folder (orphans files intentionally to throw them back to root)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    // 1. Fetch files in this folder
    const { data: files } = await supabase
      .from('files')
      .select('id')
      .eq('folder_id', req.params.id)
      .eq('user_id', req.user.id);
      
    // 2. Reset those files to root (folder_id = null)
    if (files && files.length > 0) {
      await supabase
        .from('files')
        .update({ folder_id: null })
        .in('id', files.map(f => f.id));
    }

    // 3. Delete the folder (cascading deletes for subfolders handled by DB or app logic)
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Folder deleted, internal contents moved to root' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
