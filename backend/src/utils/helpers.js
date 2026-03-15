const mime = require('mime-types');
const crypto = require('crypto');
const path = require('path');

/**
 * Detect file type category from mime type
 */
function detectFileType(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType.includes('text/') ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.ms-powerpoint'
  ) {
    return 'document';
  }
  return 'other';
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename) {
  return mime.lookup(filename) || 'application/octet-stream';
}

/**
 * Sanitize a filename for safe storage
 */
function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\.+$/, '')
    .trim()
    .slice(0, 255);
}

/**
 * Generate a cryptographically random share token
 */
function generateShareToken(length = 64) {
  return crypto.randomBytes(length / 2).toString('hex');
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Generate a unique filename to avoid collision
 */
function generateUniqueFileName(originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const hash = crypto.randomBytes(4).toString('hex');
  return `${sanitizeFileName(base)}_${hash}${ext}`;
}

module.exports = {
  detectFileType,
  getMimeType,
  sanitizeFileName,
  generateShareToken,
  formatFileSize,
  generateUniqueFileName,
};
