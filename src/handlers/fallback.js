import logger from '../utils/logger.js';
import {
  isKnowledgeAvailable,
  getKnowledgeUnavailableMessage,
} from '../knowledge/loader.js';

/**
 * Handler: Fallback for unhandled messages
 * This handler runs when a message passes all middleware but isn't a command.
 * In Phase 2, it checks knowledge availability before responding.
 */
export async function fallbackHandler(ctx) {
  // Only respond in private chats or when explicitly mentioned (middleware handles this)
  const chatType = ctx.chat?.type;
  const isPrivate = chatType === 'private';

  // Check if knowledge system is available
  // If not, respond with safe unavailable message
  if (!isKnowledgeAvailable()) {
    logger.warn('Fallback triggered but knowledge unavailable', {
      userId: ctx.from?.id,
      chatType: chatType,
    });

    try {
      await ctx.reply(getKnowledgeUnavailableMessage(), {
        reply_to_message_id: ctx.message?.message_id,
      });
    } catch (err) {
      logger.warn('Failed to send knowledge unavailable message', {
        error: err.message,
      });
    }
    return;
  }

  // Knowledge is available — guide user to use /ask command
  const message = isPrivate
    ? "Hey there! To ask me something, use /ask followed by your question. For example: /ask what is Peppercoin?\n\nOr use /help to see all available commands."
    : "To ask me something, use /ask followed by your question. For example: /ask what is Peppercoin?";

  try {
    await ctx.reply(message, {
      reply_to_message_id: ctx.message?.message_id,
    });

    logger.debug('Fallback handler responded', {
      userId: ctx.from?.id,
      chatType: chatType,
    });
  } catch (err) {
    logger.warn('Failed to send fallback message', { error: err.message });
  }
}

export default fallbackHandler;
