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
  const messageText = ctx.message?.text || '';

  // Remove bot mention from text if present
  const question = messageText
    .replace(new RegExp(`@${config.botUsername}`, 'gi'), '')
    .trim();

  // If empty after removing mention, skip
  if (!question) {
    return;
  }

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

  // Record question received
  recordQuestion();

  // Check for duplicate query (silent suppression)
  if (isDuplicate(userId, chatId, question)) {
    recordDuplicate();
    logger.debug('Duplicate query suppressed', { userId });
    return;
  }

  // Check responder status
  const status = getResponderStatus();
  if (!status.ready) {
    logger.warn('Fallback used but responder not ready', { userId, status });
    recordFallback();

    try {
      await ctx.reply(
        'Pepper Pal is temporarily unable to answer questions. Please try again later.',
        { reply_to_message_id: ctx.message?.message_id }
      );
    } catch (err) {
      logger.warn('Failed to send not ready message', { error: err.message });
    }
    return;
  }

  // Log the question
  logger.info('Processing mention/DM question', {
    userId,
    chatType,
    questionLength: question.length,
  });

  // Show typing indicator
  try {
    await ctx.sendChatAction('typing');
  } catch (err) {
    logger.debug('Failed to send typing action', { error: err.message });
  }

  // Generate AI response
  let answer;
  try {
    answer = await generateResponse(question);
  } catch (err) {
    logger.error('Failed to generate response in fallback', {
      error: err.message,
      userId,
    });
    recordFallback();

    try {
      await ctx.reply(getSafeFallback(), {
        reply_to_message_id: ctx.message?.message_id,
      });
    } catch (replyErr) {
      logger.warn('Failed to send error fallback', {
        error: replyErr.message,
      });
    }
    return;
  }

  // Sanitize output
  const sanitized = sanitize(answer);
  if (!sanitized) {
    logger.warn('Sanitization rejected response in fallback', { userId });
    recordSanitizationFailure();

    try {
      await ctx.reply(getSafeFallback(), {
        reply_to_message_id: ctx.message?.message_id,
      });
    } catch (err) {
      logger.warn('Failed to send sanitization fallback', {
        error: err.message,
      });
    }
    return;
  }

  // Send response
  try {
    await ctx.reply(sanitized, {
      parse_mode: 'Markdown',
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
