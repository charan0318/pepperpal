import logger from '../utils/logger.js';

/**
 * Middleware: Ignore messages from bots (including self)
 * Pepper Pal must never respond to other bots or itself.
 */
export function ignoreBots() {
  return (ctx, next) => {
    // Check if message sender is a bot
    const fromUser = ctx.from;

    if (!fromUser) {
      // No sender info, skip silently
      return;
    }

    if (fromUser.is_bot) {
      logger.debug('Ignoring message from bot', {
        botId: fromUser.id,
        botUsername: fromUser.username,
      });
      return; // Do not call next() — stop processing
    }

    return next();
  };
}

export default ignoreBots;
