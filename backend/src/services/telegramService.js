const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { apiId, apiHash, channelTitle, channelAbout } = require('../config/telegram');
const { encryptSession, decryptSession } = require('./encryptionService');
const supabase = require('../config/supabase');

// Cache of active clients keyed by user ID
const clientCache = new Map();

/**
 * Get or create a TelegramClient for a user using their stored session
 */
async function getClient(userId) {
  // Check cache first
  if (clientCache.has(userId)) {
    const cached = clientCache.get(userId);
    if (cached.connected) return cached;
    try {
      await cached.connect();
      return cached;
    } catch (e) {
      clientCache.delete(userId);
    }
  }

  if (!supabase) throw new Error('Database not configured');

  const { data: session } = await supabase
    .from('sessions')
    .select('encrypted_session')
    .eq('user_id', userId)
    .order('last_used', { ascending: false })
    .limit(1)
    .single();

  if (!session) throw new Error('No session found. Please log in again.');

  const sessionString = decryptSession(session.encrypted_session);
  const client = new TelegramClient(
    new StringSession(sessionString),
    apiId,
    apiHash,
    {
      connectionRetries: 3,
      retryDelay: 1000,
      autoReconnect: true,
    }
  );

  await client.connect();
  clientCache.set(userId, client);

  // Update last_used
  await supabase
    .from('sessions')
    .update({ last_used: new Date().toISOString() })
    .eq('user_id', userId);

  return client;
}

/**
 * Send OTP to a phone number — starts a new session
 */
async function sendOTP(phoneNumber) {
  const client = new TelegramClient(
    new StringSession(''),
    apiId,
    apiHash,
    { connectionRetries: 3 }
  );

  await client.connect();

  const result = await client.invoke(
    new Api.auth.SendCode({
      phoneNumber,
      apiId,
      apiHash,
      settings: new Api.CodeSettings({
        allowFlashcall: false,
        currentNumber: false,
        allowAppHash: false,
      }),
    })
  );

  const sessionString = client.session.save();

  return {
    phoneCodeHash: result.phoneCodeHash,
    sessionString,
    client,
  };
}

/**
 * Verify OTP and complete login
 */
async function verifyOTP(phoneNumber, phoneCodeHash, code, sessionString, password) {
  const client = new TelegramClient(
    new StringSession(sessionString),
    apiId,
    apiHash,
    { connectionRetries: 3 }
  );

  await client.connect();

  let result;
  try {
    result = await client.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode: code,
      })
    );
  } catch (err) {
    if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      if (!password) {
        await client.disconnect();
        return { requiresPassword: true };
      }
      // Handle 2FA
      const passwordInfo = await client.invoke(new Api.account.GetPassword());
      const { srp } = await client._computePasswordSRP(passwordInfo, password);
      result = await client.invoke(
        new Api.auth.CheckPassword({ password: srp })
      );
    } else {
      throw err;
    }
  }

  const user = result.user;
  const finalSession = client.session.save();

  // Get user profile photo
  let avatarUrl = null;
  try {
    const photos = await client.invoke(
      new Api.photos.GetUserPhotos({
        userId: user.id,
        offset: 0,
        maxId: 0,
        limit: 1,
      })
    );
    if (photos.photos && photos.photos.length > 0) {
      const photo = photos.photos[0];
      const buffer = await client.downloadProfilePhoto(user);
      if (buffer) {
        avatarUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      }
    }
  } catch (e) {
    console.log('Could not fetch profile photo:', e.message);
  }

  return {
    telegramUser: {
      id: user.id.toString(),
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      phone: user.phone || phoneNumber,
      avatarUrl,
    },
    sessionString: finalSession,
    client,
  };
}

/**
 * Create a private channel for the user to store files
 */
async function createStorageChannel(client) {
  try {
    const result = await client.invoke(
      new Api.channels.CreateChannel({
        title: channelTitle,
        about: channelAbout,
        megagroup: false,
        broadcast: true,
      })
    );

    const channel = result.chats[0];
    return {
      channelId: channel.id.toString(),
      accessHash: channel.accessHash?.toString(),
    };
  } catch (err) {
    console.error('Failed to create channel:', err.message);
    throw new Error('Failed to create storage channel');
  }
}

/**
 * Upload a file to the user's storage channel
 */
async function uploadFile(client, channelId, fileBuffer, fileName, mimeType, onProgress) {
  const inputChannel = await getInputChannel(client, channelId);

  const file = await client.uploadFile({
    file: fileBuffer,
    fileName,
    workers: 1,
    onProgress: onProgress || (() => {}),
  });

  const result = await client.invoke(
    new Api.messages.SendMedia({
      peer: inputChannel,
      media: new Api.InputMediaUploadedDocument({
        file,
        mimeType: mimeType || 'application/octet-stream',
        attributes: [
          new Api.DocumentAttributeFilename({ fileName }),
        ],
        forceFile: true,
      }),
      message: fileName,
      randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
    })
  );

  const message = result.updates?.find(u => u.className === 'UpdateNewChannelMessage')?.message
    || result.updates?.find(u => u.message)?.message;

  return {
    messageId: message?.id || result.id,
    fileSize: fileBuffer.length,
  };
}

/**
 * Download a file from the user's storage channel
 */
async function downloadFile(client, channelId, messageId) {
  const inputChannel = await getInputChannel(client, channelId);

  const messages = await client.invoke(
    new Api.channels.GetMessages({
      channel: inputChannel,
      id: [new Api.InputMessageID({ id: messageId })],
    })
  );

  const message = messages.messages[0];
  if (!message || !message.media) {
    throw new Error('File not found in channel');
  }

  const buffer = await client.downloadMedia(message.media, {
    workers: 1,
  });

  return buffer;
}

/**
 * Stream a file with range support (for video/audio)
 */
async function streamFile(client, channelId, messageId, start, end) {
  // For streaming, we download the full file and slice
  // GramJS doesn't support true range downloads easily
  const buffer = await downloadFile(client, channelId, messageId);

  if (start !== undefined && end !== undefined) {
    return buffer.slice(start, end + 1);
  }
  if (start !== undefined) {
    return buffer.slice(start);
  }
  return buffer;
}

/**
 * Delete a message from the channel
 */
async function deleteMessage(client, channelId, messageId) {
  const inputChannel = await getInputChannel(client, channelId);

  await client.invoke(
    new Api.channels.DeleteMessages({
      channel: inputChannel,
      id: [messageId],
    })
  );
}

/**
 * Get active input channel reference
 */
async function getInputChannel(client, channelId) {
  const dialogs = await client.getDialogs({ limit: 100 });
  const channel = dialogs.find(
    d => d.entity?.id?.toString() === channelId.toString()
  );

  if (channel) {
    return channel.inputEntity;
  }

  // Fallback: try creating InputPeerChannel directly
  try {
    const result = await client.invoke(
      new Api.channels.GetChannels({
        id: [new Api.InputChannel({
          channelId: BigInt(channelId),
          accessHash: BigInt(0),
        })],
      })
    );
    if (result.chats[0]) {
      return new Api.InputPeerChannel({
        channelId: BigInt(channelId),
        accessHash: result.chats[0].accessHash,
      });
    }
  } catch (e) {
    console.error('Failed to get channel:', e.message);
  }

  throw new Error('Storage channel not found. Please re-login.');
}

/**
 * Disconnect and clean up a client
 */
async function disconnectClient(userId) {
  if (clientCache.has(userId)) {
    const client = clientCache.get(userId);
    try { await client.disconnect(); } catch (e) {}
    clientCache.delete(userId);
  }
}

module.exports = {
  getClient,
  sendOTP,
  verifyOTP,
  createStorageChannel,
  uploadFile,
  downloadFile,
  streamFile,
  deleteMessage,
  disconnectClient,
};
