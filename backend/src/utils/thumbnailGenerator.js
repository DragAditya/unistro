const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Generates a thumbnail buffer from an image or video buffer
 */
const generateThumbnail = async (buffer, mimeType) => {
  try {
    if (mimeType.startsWith('image/')) {
      // Image thumbnail
      return await sharp(buffer)
        .resize(400, 400, { fit: 'cover', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } else if (mimeType.startsWith('video/')) {
      // Video thumbnail - requires saving temp file
      return new Promise((resolve, reject) => {
        const tempVideoPath = path.join(os.tmpdir(), `temp_vid_${Date.now()}.mp4`);
        const tempThumbPath = path.join(os.tmpdir(), `temp_thumb_${Date.now()}.jpg`);
        
        fs.writeFileSync(tempVideoPath, buffer);
        
        ffmpeg(tempVideoPath)
          .screenshots({
            timestamps: ['10%'],
            filename: path.basename(tempThumbPath),
            folder: os.tmpdir(),
            size: '400x?'
          })
          .on('end', () => {
            try {
              const thumbBuffer = fs.readFileSync(tempThumbPath);
              fs.unlinkSync(tempVideoPath);
              fs.unlinkSync(tempThumbPath);
              resolve(thumbBuffer);
            } catch (err) {
              reject(err);
            }
          })
          .on('error', (err) => {
            fs.unlinkSync(tempVideoPath);
            reject(err);
          });
      });
    }
    return null; // No thumbnail for other types
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null; // Return null so upload continues even if thumb fails
  }
};

module.exports = { generateThumbnail };
