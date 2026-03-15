const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { apiId, apiHash } = require('../config/telegram');
const supabase = require('../config/supabase');

// Active client instances in memory (keyed by user ID)
const activeClients = new Map();

/**
 * Initializes and connects a Telegram client for a user
 */
const getTelegramClient = async (user) => {
  if (activeClients.has(user.id)) {
    return activeClients.get(user.id);
  }

  const session = new StringSession(user.telegram_session || '');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    useWSS: true,
  });

  await client.connect();
  
  // Save updated session to DB if needed
  const sessionString = client.session.save();
  if (sessionString !== user.telegram_session) {
    await supabase
      .from('users')
      .update({ telegram_session: sessionString })
      .eq('id', user.id);
  }

  activeClients.set(user.id, client);
  return client;
};

/**
 * Clean up client connection
 */
const closeTelegramClient = async (userId) => {
  if (activeClients.has(userId)) {
    const client = activeClients.get(userId);
    await client.disconnect();
    activeClients.delete(userId);
  }
};

module.exports = {
  getTelegramClient,
  closeTelegramClient
};
