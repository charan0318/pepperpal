/**
 * Telegram Sender
 * Handles the actual sending of messages to Telegram
 */

import { splitMessage } from './splitter.js';
import { format } from './formatter.js';
import logger from '../utils/logger.js';

/**
 * @typedef {Object} SendOptions
 * @property {boolean} [reply] - Whether to reply to the original message
 * @property {number} [replyToMessageId] - Message ID to reply to
 */

/**
 * Send response through Telegram
 * @param {Object} ctx - Telegraf context
 * @param {string} text - Response text
 * @param {SendOptions} [options]
 * @returns {Promise<void>}
 */
export async function send(ctx, text, options = {}) {
  if (!text || text.trim().length === 0) {
    logger.warn('Attempted to send empty message');
    return;
  }
  
  // Format the text
  const formatted = format(text);
  
  // Split if needed
  const chunks = splitMessage(formatted);
  
  logger.debug('Sending message', {
    chunks: chunks.length,
  });
  
  // Send each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isLast = i === chunks.length - 1;
    
    // Build message options
    const msgOptions = {};
    
    // Add reply if specified and first message
    if (i === 0 && options.reply && options.replyToMessageId) {
      msgOptions.reply_to_message_id = options.replyToMessageId;
    }
    
    try {
      await ctx.reply(chunk, msgOptions);
      
      // Small delay between chunks to prevent rate limiting
      if (!isLast) {
        await delay(100);
      }
    } catch (error) {
      logger.error('Failed to send message chunk', {
        chunk: i,
        error: error.message,
      });
      
      // Try to send without options on failure
      try {
        await ctx.reply(chunk);
      } catch (retryError) {
        logger.error('Retry also failed', { error: retryError.message });
      }
    }
  }
}

/**
 * Send error message
 * @param {Object} ctx - Telegraf context
 * @param {string} [message] - Custom error message
 * @returns {Promise<void>}
 */
export async function sendError(ctx, message) {
  const errorMsg = message || "I encountered an issue. Please try again or type /start to restart.";
  
  try {
    await ctx.reply(errorMsg);
  } catch (error) {
    logger.error('Failed to send error message', { error: error.message });
  }
}

/**
 * Delay helper
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default { send, sendError };
