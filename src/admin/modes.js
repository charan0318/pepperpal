import logger from '../utils/logger.js';

/**
 * Bot operating modes:
 * - normal: Default behavior, responds as expected
 * - silent: Ignores all group messages (emergency/quiet mode)
 * - maintenance: Replies with maintenance notice only
 */
const VALID_MODES = ['normal', 'silent', 'maintenance'];

/**
 * In-memory mode storage
 * Default mode is 'normal'
 */
let currentMode = 'normal';

/**
 * Get the current bot mode
 * @returns {string}
 */
export function getMode() {
  return currentMode;
}

/**
 * Set the bot mode
 * @param {string} mode - One of: normal, silent, maintenance
 * @returns {boolean} - True if mode was set successfully
 */
export function setMode(mode) {
  const normalizedMode = mode.toLowerCase().trim();

  if (!VALID_MODES.includes(normalizedMode)) {
    return false;
  }

  const previousMode = currentMode;
  currentMode = normalizedMode;

  logger.info('Bot mode changed', {
    from: previousMode,
    to: currentMode,
  });

  return true;
}

/**
 * Check if a mode is valid
 * @param {string} mode
 * @returns {boolean}
 */
export function isValidMode(mode) {
  return VALID_MODES.includes(mode.toLowerCase().trim());
}

/**
 * Get list of valid modes
 * @returns {string[]}
 */
export function getValidModes() {
  return [...VALID_MODES];
}

/**
 * Middleware: Mode-based message filtering
 * - In 'silent' mode: Block all group messages
 * - In 'maintenance' mode: Reply with maintenance notice and stop
 * - In 'normal' mode: Allow through
 */
export function modeFilter() {
  return async (ctx, next) => {
    const mode = getMode();
    const chat = ctx.chat;

    // Silent mode: ignore group messages entirely
    if (mode === 'silent') {
      if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
        logger.debug('Silent mode: ignoring group message', {
          chatId: chat.id,
        });
        return; // Stop processing
      }
    }

    // Maintenance mode: send notice and stop
    if (mode === 'maintenance') {
      try {
        await ctx.reply(
          'Pepper Pal is currently undergoing maintenance. Please try again later.'
        );
      } catch (err) {
        logger.warn('Failed to send maintenance message', {
          error: err.message,
        });
      }
      return; // Stop processing
    }

    // Normal mode: allow through
    return next();
  };
}

export default { getMode, setMode, isValidMode, getValidModes, modeFilter };
