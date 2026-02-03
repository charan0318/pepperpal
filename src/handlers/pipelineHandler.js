/**
 * Handler: Pipeline Message Handler
 * Main message handler using the pipeline architecture
 */

import logger from '../utils/logger.js';
import { process } from '../pipeline/index.js';
import { send, sendError } from '../delivery/sender.js';
import { withTyping } from '../delivery/typing.js';
import { isDuplicate } from '../safety/duplicateGuard.js';
import { isKnowledgeAvailable } from '../knowledge/loader.js';
import {
  recordQuestion,
  recordAnswer,
  recordFallback,
  recordDuplicate,
} from '../monitoring/stats.js';
import config from '../config.js';

/**
 * Pipeline-based message handler
 * Handles all text messages through the classification → generation → validation pipeline
 * @param {Object} ctx - Telegraf context
 */
export async function pipelineHandler(ctx) {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const isPrivate = chatType === 'private';
  const rawText = ctx.message?.text || '';
  
  // Ignore unknown commands (e.g., /report, /unknown)
  // Only process text that doesn't start with / or is a valid mention
  if (rawText.startsWith('/')) {
    // This is a command - if it reaches here, it's unregistered
    // Let Telegram handle it (show "command not found" by default)
    logger.debug('Ignoring unregistered command', { command: rawText, userId });
    return;
  }
  
  // Check knowledge availability
  if (!isKnowledgeAvailable()) {
    logger.warn('Pipeline triggered but knowledge unavailable', {
      userId,
      chatType,
    });
    
    await sendError(ctx, 'I am temporarily unable to access my knowledge base. Please try again later.');
    return;
  }
  
  // Extract the question
  const botMention = `@${config.botUsername}`;
  const question = rawText.replace(new RegExp(botMention, 'gi'), '').trim();
  
  // If no actual question, send friendly prompt
  if (question.length < 2) {
    await send(ctx, "Hey! What would you like to know about Peppercoin? 🌶️");
    return;
  }
  
  // Check for duplicate
  if (isDuplicate(userId, chatId, question)) {
    logger.debug('Duplicate suppressed in pipeline', { userId });
    recordDuplicate();
    return;
  }
  
  recordQuestion();
  
  logger.info('Pipeline handler processing', {
    userId,
    chatType,
    questionLength: question.length,
  });
  
  try {
    // Process through pipeline with typing indicator
    const deliveryPlan = await withTyping(ctx, async () => {
      return await process(ctx);
    });
    
    // Log performance
    logger.info('Pipeline response ready', {
      userId,
      processingTimeMs: deliveryPlan.processingTimeMs,
    });
    
    // Ensure message is a string (handle edge cases)
    const messageText = Array.isArray(deliveryPlan.message) 
      ? deliveryPlan.message.join('\n\n')
      : String(deliveryPlan.message || 'Sorry, I could not generate a response.');
    
    // Send single message with HTML parse mode
    await ctx.reply(messageText, {
      parse_mode: deliveryPlan.parseMode,
      reply_to_message_id: ctx.message?.message_id,
      disable_web_page_preview: true, // Prevent link previews cluttering chat
    });
    
    recordAnswer();
    
  } catch (error) {
    logger.error('Pipeline handler error', {
      userId,
      error: error.message,
      stack: error.stack,
    });
    
    recordFallback();
    await sendError(ctx);
  }
}

/**
 * New pipeline-based /ask command handler
 * @param {Object} ctx - Telegraf context
 */
export async function pipelineAskHandler(ctx) {
  const messageText = ctx.message?.text || '';
  const question = messageText.replace(/^\/ask\s*/i, '').trim();
  
  // Check if question was provided
  if (!question) {
    await send(ctx, 'Please provide a question after /ask.\n\nExample: /ask What is Peppercoin?');
    return;
  }
  
  // Override message text with just the question
  ctx.message.text = question;
  
  // Process through main pipeline handler
  await pipelineHandler(ctx);
}

export default {
  pipelineHandler,
  pipelineAskHandler,
};
