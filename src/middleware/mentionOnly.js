import config from '../config.js';
import logger from '../utils/logger.js';

/**
 * Middleware: Mention-only filter for group chats
 * In groups, Pepper Pal only responds if:
 * - Explicitly mentioned (@PepperPal)
 * - A command is used (/start, /help)
 *
 * In private chats, all messages are allowed through.
 */
export function mentionOnly() {
  return (ctx, next) => {
    const chat = ctx.chat;
    const message = ctx.message;

    // If no chat or message context, skip
    if (!chat || !message) {
      return next();
    }

    // Private chats: allow all messages
    if (chat.type === 'private') {
      return next();
    }

    // Group/supergroup chats: check for mention or command
    if (chat.type === 'group' || chat.type === 'supergroup') {
      // Check if this is a command (commands are always allowed)
      if (message.text && message.text.startsWith('/')) {
        return next();
      }

      // Check for bot mention in text
      if (isBotMentioned(message, config.botUsername)) {
        return next();
      }

      // Check for bot mention in entities (e.g., @PepperPal)
      if (hasMentionEntity(message, config.botUsername)) {
        return next();
      }

      // No mention, no command — ignore silently
      logger.debug('Ignoring group message without mention', {
        chatId: chat.id,
        chatTitle: chat.title,
      });
      return; // Stop processing
    }

    // Unknown chat type — allow through to be safe
    return next();
  };
}

/**
 * Check if bot username appears in message text
 * @param {object} message - Telegram message object
 * @param {string} botUsername - Bot username without @
 * @returns {boolean}
 */
function isBotMentioned(message, botUsername) {
  if (!message.text) {
    return false;
  }

  const mentionPattern = new RegExp(`@${botUsername}\\b`, 'i');
  return mentionPattern.test(message.text);
}

/**
 * Check if message has a mention entity for the bot
 * @param {object} message - Telegram message object
 * @param {string} botUsername - Bot username without @
 * @returns {boolean}
 */
function hasMentionEntity(message, botUsername) {
  const entities = message.entities || [];

  for (const entity of entities) {
    if (entity.type === 'mention') {
      // Extract the mentioned username from the text
      const mentionText = message.text.substring(
        entity.offset,
        entity.offset + entity.length
      );
      // Remove @ and compare case-insensitively
      if (mentionText.toLowerCase() === `@${botUsername.toLowerCase()}`) {
        return true;
      }
    }
  }

  return false;
}

export default mentionOnly;
