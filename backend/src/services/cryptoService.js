const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
// Ensure key is 32 bytes
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  : crypto.randomBytes(32);

/**
 * Encrypts a buffer
 * @param {Buffer} buffer - Data to encrypt
 * @returns {Buffer} - Encrypted data with IV and Auth Tag prepended
 */
const encryptBuffer = (buffer) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes
  
  // Format: [IV (12 bytes)][AuthTag (16 bytes)][Encrypted Data]
  return Buffer.concat([iv, authTag, encrypted]);
};

/**
 * Decrypts a buffer
 * @param {Buffer} encryptedBuffer - Data to decrypt
 * @returns {Buffer} - Decrypted original data
 */
const decryptBuffer = (encryptedBuffer) => {
  const iv = encryptedBuffer.slice(0, 12);
  const authTag = encryptedBuffer.slice(12, 28);
  const data = encryptedBuffer.slice(28);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(data), decipher.final()]);
};

module.exports = {
  encryptBuffer,
  decryptBuffer
};
