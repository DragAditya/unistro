const sharp = require('sharp');

/**
 * Generate a thumbnail from an image buffer
 */
async function generateThumbnail(buffer, options = {}) {
  const {
    width = 300,
    height = 300,
    quality = 80,
    format = 'jpeg',
  } = options;

  try {
    const thumbnail = await sharp(buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFormat(format, { quality })
      .toBuffer();

    return thumbnail;
  } catch (err) {
    console.error('Thumbnail generation failed:', err.message);
    return null;
  }
}

/**
 * Get image metadata (dimensions)
 */
async function getImageMetadata(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Generate a tiny placeholder blur hash
 */
async function generatePlaceholder(buffer) {
  try {
    const placeholder = await sharp(buffer)
      .resize(20, 20, { fit: 'inside' })
      .blur(5)
      .toFormat('jpeg', { quality: 30 })
      .toBuffer();

    return `data:image/jpeg;base64,${placeholder.toString('base64')}`;
  } catch (err) {
    return null;
  }
}

module.exports = { generateThumbnail, getImageMetadata, generatePlaceholder };
