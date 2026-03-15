const apiId = parseInt(process.env.TELEGRAM_API_ID, 10);
const apiHash = process.env.TELEGRAM_API_HASH;

if (!apiId || !apiHash) {
  console.warn('⚠️  TELEGRAM_API_ID or TELEGRAM_API_HASH not set. Telegram operations will fail.');
}

module.exports = {
  apiId: apiId || 0,
  apiHash: apiHash || '',
  channelTitle: 'Unistro Storage',
  channelAbout: 'Private storage channel for Unistro - Do not delete',
  maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
  chunkSize: 512 * 1024, // 512KB
};
