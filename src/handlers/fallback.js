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

  // Extract the question from the message (remove the @mention if present)
  const rawText = ctx.message?.text || '';
  const botMention = `@${config.botUsername}`;
  const question = rawText.replace(new RegExp(botMention, 'gi'), '').trim();

  // If no actual question after removing mention, send a friendly prompt
  if (question.length < 2) {
    try {
      await ctx.reply("Hey! What would you like to know about Peppercoin? 🌶️", {
        reply_to_message_id: ctx.message?.message_id,
      });
      return;
    } catch (err) {
      logger.warn('Failed to send prompt message', { error: err.message });
      return;
    }
  }

  // Check for duplicate questions
  if (isDuplicate(userId, question)) {
    logger.info('Duplicate question detected in fallback', { userId, question });
    recordDuplicate();
    return;
  }

  recordQuestion();

  // Generate AI response
  try {
    logger.info('Generating AI response for mention', { userId, question: question.substring(0, 50) });
    
    const aiResult = await generateResponse(question, userId);
    
    if (!aiResult.success) {
      logger.warn('AI response failed', { error: aiResult.error });
      await ctx.reply(getSafeFallback(), {
        reply_to_message_id: ctx.message?.message_id,
      });
      recordFallback();
      return;
    }

    const sanitized = sanitize(aiResult.message);

    if (!sanitized.safe) {
      logger.warn('Response failed sanitization', { reason: sanitized.reason });
      await ctx.reply(getSafeFallback(), {
        reply_to_message_id: ctx.message?.message_id,
      });
      recordSanitizationFailure();
      return;
    }

    await ctx.reply(sanitized.text, {
      reply_to_message_id: ctx.message?.message_id,
    });

    recordAnswer();
    logger.info('AI response sent successfully', { userId, chatType });
  } catch (err) {
    logger.error('Failed to send AI response in fallback', {
      error: err.message,
      userId,
    });
    
    try {
      await ctx.reply(getSafeFallback(), {
        reply_to_message_id: ctx.message?.message_id,
      });
      recordFallback();
    } catch (replyErr) {
      logger.error('Failed to send fallback message', { error: replyErr.message });
    }
  }
}

export default fallbackHandler;
