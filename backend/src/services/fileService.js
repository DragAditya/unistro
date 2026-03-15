const { Api } = require('telegram');
const { getTelegramClient } = require('./telegramClient');
const { encryptBuffer, decryptBuffer } = require('./cryptoService');
const CustomFile = require('telegram/client/uploads').CustomFile;

/**
 * Uploads a file to the user's private Telegram channel
 */
const uploadFileToTelegram = async (user, buffer, fileName, mimeType) => {
  const client = await getTelegramClient(user);
  const channelId = BigInt(user.storage_channel_id);

  // Encrypt
  const encryptedBuffer = encryptBuffer(buffer);

  // Create CustomFile for GramJS
  const file = new CustomFile(fileName, encryptedBuffer.length, '', encryptedBuffer);

  // Send message with media
  const result = await client.sendFile(channelId, {
    file: file,
    caption: `Unistro File: ${fileName}`,
    workers: 4,
  });

  return result.id.toString(); // The message ID acts as our file reference
};

/**
 * Downloads a file from the user's private Telegram channel
 */
const downloadFileFromTelegram = async (user, messageId) => {
  const client = await getTelegramClient(user);
  const channelId = BigInt(user.storage_channel_id);

  const messages = await client.getMessages(channelId, { ids: [parseInt(messageId)] });
  if (!messages || messages.length === 0 || !messages[0].media) {
    throw new Error('File not found in Telegram');
  }

  const buffer = await client.downloadMedia(messages[0], { workers: 4 });
  
  // Decrypt
  return decryptBuffer(buffer);
};

/**
 * Deletes a file from the user's private Telegram channel
 */
const deleteFileFromTelegram = async (user, messageId) => {
  const client = await getTelegramClient(user);
  const channelId = BigInt(user.storage_channel_id);

  await client.deleteMessages(channelId, [parseInt(messageId)], { revoke: true });
  return true;
};

module.exports = {
  uploadFileToTelegram,
  downloadFileFromTelegram,
  deleteFileFromTelegram
};
