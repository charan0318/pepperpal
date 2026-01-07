import config from '../config.js';
import logger from '../utils/logger.js';
import { recordRateLimitHit } from '../monitoring/stats.js';

/**
 * In-memory rate limit store
 * Maps user ID to { count, resetTime, warned }
 */
const rateLimitStore = new Map();

/**
 * Clean up expired rate limit entries periodically
 * Runs every 5 minutes to prevent memory growth
 */
setInterval(
  () => {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, data] of rateLimitStore.entries()) {
      if (now > data.resetTime) {
        rateLimitStore.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limit cleanup', { entriesRemoved: cleaned });
    }
  },
  5 * 60 * 1000
); // 5 minutes

/**
 * Middleware: Per-user rate limiting
 * Prevents spam by limiting messages per user within a time window.
 * Uses polite cooldown messages, no hard bans.
 */
export function rateLimit() {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    // No user ID — allow through (shouldn't happen)
    if (!userId) {
      return next();
    }

    const now = Date.now();
    const windowMs = config.rateLimit.windowSeconds * 1000;
    const maxMessages = config.rateLimit.maxMessages;

    // Get or create rate limit entry
    let userData = rateLimitStore.get(userId);

    if (!userData || now > userData.resetTime) {
      // First message or window expired — reset
      userData = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(userId, userData);
      return next();
    }

    // Increment count
    userData.count++;

    if (userData.count > maxMessages) {
      // Record rate limit hit for stats
      recordRateLimitHit();

      // Rate limited — respond politely once, then suppress
      const secondsRemaining = Math.ceil((userData.resetTime - now) / 1000);

      // Only send cooldown message on first exceed (count === maxMessages + 1)
      if (userData.count === maxMessages + 1) {
        logger.info('Rate limit exceeded', { userId, count: userData.count });

        try {
          await ctx.reply(
            `Please slow down a bit. You can message me again in ${secondsRemaining} seconds.`,
            { reply_to_message_id: ctx.message?.message_id }
          );
        } catch (err) {
          // Fail silently — don't crash on reply failure
          logger.warn('Failed to send rate limit message', {
            error: err.message,
          });
        }
      }

      // Stop processing — silent suppression after first warning
      return;
    }

    // Under limit — proceed
    return next();
  };
}

export default rateLimit;
