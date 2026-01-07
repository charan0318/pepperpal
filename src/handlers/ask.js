import logger from '../utils/logger.js';
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

/**
 * Handler: /ask command
 * Primary entry point for AI-powered question answering.
 * Extracts the question, generates a response, and replies once.
 */
export async function askHandler(ctx) {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const messageText = ctx.message?.text || '';

  // Extract question from command (everything after /ask)
  const question = messageText.replace(/^\/ask\s*/i, '').trim();

  // Check if question was provided
  if (!question) {
    try {
      await ctx.reply(
        'Please provide a question after the /ask command.\n\nExample: /ask What is Peppercoin?',
        { reply_to_message_id: ctx.message?.message_id }
      );
    } catch (err) {
      logger.warn('Failed to send ask usage message', { error: err.message });
    }
    return;
  }

  // Record question received
  recordQuestion();

  // Check for duplicate query (silent suppression)
  if (isDuplicate(userId, chatId, question)) {
    recordDuplicate();
    logger.debug('Duplicate query suppressed', { userId });
    return; // Silent ignore, no response
  }

  // Check responder status before proceeding
  const status = getResponderStatus();

  if (!status.ready) {
    logger.warn('Ask command used but responder not ready', {
      userId,
      status,
    });
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

  // Log the question (length only, not content)
  logger.info('Processing /ask command', {
    userId,
    chatType,
    questionLength: question.length,
  });

  // Show typing indicator while processing
  try {
    await ctx.sendChatAction('typing');
  } catch (err) {
    // Non-critical, continue
    logger.debug('Failed to send typing action', { error: err.message });
  }

  // Generate AI response
  const result = await generateResponse(question);

  // If AI failed, record and respond
  if (!result.success) {
    recordFallback();
    logger.warn('Ask command returned fallback', {
      userId,
      error: result.error,
    });

    try {
      await ctx.reply(result.message, {
        reply_to_message_id: ctx.message?.message_id,
      });
    } catch (err) {
      logger.warn('Failed to send fallback message', { error: err.message });
    }
    return;
  }

  // Final sanitization pass (last line of defense)
  const sanitized = sanitize(result.message);

  if (!sanitized.safe) {
    recordSanitizationFailure();
    logger.warn('Response failed final sanitization', {
      userId,
      reason: sanitized.reason,
    });

    try {
      await ctx.reply(getSafeFallback(), {
        reply_to_message_id: ctx.message?.message_id,
      });
    } catch (err) {
      logger.warn('Failed to send sanitization fallback', { error: err.message });
    }
    return;
  }

  // Success - send sanitized response
  recordAnswer();
  logger.info('Ask command completed successfully', {
    userId,
    responseLength: sanitized.output.length,
  });

  try {
    await ctx.reply(sanitized.output, {
      reply_to_message_id: ctx.message?.message_id,
      disable_web_page_preview: true,
    });
  } catch (err) {
    logger.error('Failed to send ask response', { error: err.message });

    // Try a simpler fallback
    try {
      await ctx.reply(
        'Sorry, I encountered an issue sending my response. Please try again.',
        { reply_to_message_id: ctx.message?.message_id }
      );
    } catch (innerErr) {
      logger.error('Failed to send fallback response', {
        error: innerErr.message,
      });
    }
  }
}

export default askHandler;
