const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { apiId, apiHash } = require('../config/telegram');
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// Temporary stored authorization states
const pendingAuths = new Map();

/**
 * Step 1: Request OTP
 */
const sendOTP = async (phoneNumber) => {
  const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
    connectionRetries: 5,
    useWSS: true,
  });

  await client.connect();
  
  const result = await client.sendCode({
    apiId,
    apiHash,
  }, phoneNumber);
  
  const tempSessionId = crypto.randomUUID();
  pendingAuths.set(tempSessionId, { client, phoneCodeHash: result.phoneCodeHash, phoneNumber });

  // Cleanup after 5 mins
  setTimeout(async () => {
    if (pendingAuths.has(tempSessionId)) {
      const { client } = pendingAuths.get(tempSessionId);
      await client.disconnect();
      pendingAuths.delete(tempSessionId);
    }
  }, 5 * 60 * 1000);

  return { phoneCodeHash: result.phoneCodeHash, tempSessionId };
};

/**
 * Step 2: Verify OTP and potentially Password
 */
const verifyOTP = async (tempSessionId, code, password = '') => {
  if (!pendingAuths.has(tempSessionId)) {
    throw new Error('Session expired or invalid');
  }

  const { client, phoneNumber, phoneCodeHash } = pendingAuths.get(tempSessionId);

  try {
    let result;
    try {
      result = await client.invoke(new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode: code,
      }));
    } catch (e) {
      if (e.message.includes('SESSION_PASSWORD_NEEDED')) {
        if (!password) {
          return { requiresPassword: true };
        }
        
        // Compute password hash and log in
        result = await client.signInWithPassword({
          apiId,
          apiHash,
        }, { password, onError: (e) => { throw e; } });
      } else {
        throw e;
      }
    }

    const sessionString = client.session.save();
    const telegramUser = await client.getMe();
    
    pendingAuths.delete(tempSessionId);

    // Upsert User in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .upsert({
        phone: phoneNumber,
        telegram_id: telegramUser.id.toString(),
        first_name: telegramUser.firstName,
        last_name: telegramUser.lastName,
        username: telegramUser.username,
        telegram_session: sessionString,
        // Don't overwrite existing channel ID if upserting
      }, { onConflict: 'phone' })
      .select()
      .single();

    if (error) throw error;

    // Ensure Storage Channel Exists
    let channelId = user.storage_channel_id;
    if (!channelId) {
      // Create private channel
      const channelResult = await client.invoke(new Api.channels.CreateChannel({
        title: 'Unistro Cloud Storage',
        about: 'Private storage vault for Unistro. Do not delete this channel or leave it.',
        megagroup: false
      }));
      channelId = channelResult.chats[0].id.toString();
      
      await supabase
        .from('users')
        .update({ storage_channel_id: channelId })
        .eq('id', user.id);
        
      user.storage_channel_id = channelId;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'fallback-secret-change-me',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return { user, token };

  } catch (error) {
    throw error;
  }
};

module.exports = {
  sendOTP,
  verifyOTP
};
