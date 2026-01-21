import logger from '../utils/logger.js';
import {
  isKnowledgeAvailable,
  getKnowledgeUnavailableMessage,
} from '../knowledge/loader.js';
import { generateResponse, getResponderStatus } from '../ai/responder.js';
import { isDuplicate } from '../safety/duplicateGuard.js';
import { sanitize, getSafeFallback } from '../safety/outputSanitizer.js';
import {
  recordQuestion,
  recordAnswer,
  recordFallback,
  recordDuplicate,
  recordSanitizationFailure,
} from '../monitoring/stats.js';
import config from '../config.js';

/**
 * Handler: Fallback for unhandled messages
 * This handler runs when a message passes all middleware but isn't a command.
 * When bot is mentioned in groups or receives a message in private, it processes as AI question.
 */
export async function fallbackHandler(ctx) {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const isPrivate = chatType === 'private';

  // Check if knowledge system is available
  if (!isKnowledgeAvailable()) {
    logger.warn('Fallback triggered but knowledge unavailable', {
      userId,
      chatType,
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

    recordAnswer();
    logger.info('Fallback response sent successfully', { userId, chatType });
  } catch (err) {
    logger.error('Failed to send response in fallback', {
      error: err.message,
      userId,
    });
  }
}

export default fallbackHandler;
