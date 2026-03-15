const { chunkSize } = require('../config/telegram');

/**
 * Split a buffer into chunks of configurable size
 */
function splitBuffer(buffer, size = chunkSize) {
  const chunks = [];
  for (let i = 0; i < buffer.length; i += size) {
    chunks.push(buffer.slice(i, i + size));
  }
  return chunks;
}

/**
 * Track upload progress across chunks
 */
function createProgressTracker(totalSize, onProgress) {
  let uploaded = 0;
  const startTime = Date.now();

  return {
    update(chunkSize) {
      uploaded += chunkSize;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = uploaded / elapsed; // bytes/sec
      const percentage = Math.round((uploaded / totalSize) * 100);

      if (onProgress) {
        onProgress({
          uploaded,
          total: totalSize,
          percentage,
          speed,
          elapsed,
        });
      }
    },
    getProgress() {
      return {
        uploaded,
        total: totalSize,
        percentage: Math.round((uploaded / totalSize) * 100),
      };
    },
  };
}

module.exports = { splitBuffer, createProgressTracker };
