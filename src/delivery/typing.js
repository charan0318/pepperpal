/**
 * Typing Indicator
 * Manages Telegram typing status for better UX
 */

import logger from '../utils/logger.js';

/**
 * Send typing indicator
 * @param {Object} ctx - Telegraf context
 * @returns {Promise<void>}
 */
export async function sendTyping(ctx) {
  try {
    await ctx.sendChatAction('typing');
  } catch (error) {
    // Non-critical, log and continue
    logger.debug('Failed to send typing indicator', { error: error.message });
  }
}

/**
 * Start continuous typing indicator
 * Returns a function to stop the indicator
 * @param {Object} ctx - Telegraf context
 * @param {number} [interval=4000] - Interval in ms (Telegram typing lasts ~5s)
 * @returns {{ stop: () => void }}
 */
export function startTyping(ctx, interval = 4000) {
  let running = true;
  let timeoutId = null;
  
  const sendTypingLoop = async () => {
    if (!running) return;
    
    try {
      await ctx.sendChatAction('typing');
    } catch (error) {
      logger.debug('Typing indicator error', { error: error.message });
    }
    
    if (running) {
      timeoutId = setTimeout(sendTypingLoop, interval);
    }
  };
  
  // Start immediately
  sendTypingLoop();
  
  return {
    stop: () => {
      running = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}

/**
 * Wrap an async operation with typing indicator
 * @param {Object} ctx - Telegraf context
 * @param {() => Promise<T>} operation - Async operation to wrap
 * @returns {Promise<T>}
 * @template T
 */
export async function withTyping(ctx, operation) {
  const typing = startTyping(ctx);
  
  try {
    return await operation();
  } finally {
    typing.stop();
  }
}

export default {
  sendTyping,
  startTyping,
  withTyping,
};
