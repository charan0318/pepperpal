import logger from '../utils/logger.js';

/**
 * Response Limiter
 * Enforces hard limits on response length and format.
 * Protects against excessively long or malformed AI outputs.
 */

// Absolute maximum response length (characters)
const HARD_MAX_LENGTH = 500;

// Soft limit for normal responses (prefer shorter)
const SOFT_MAX_LENGTH = 400;

// Minimum viable response length
const MIN_LENGTH = 5;

// Maximum number of newlines (prevents spam formatting)
const MAX_NEWLINES = 20;

// Maximum consecutive newlines
const MAX_CONSECUTIVE_NEWLINES = 3;

/**
 * @typedef {Object} LimitResult
 * @property {boolean} valid - Whether the response passed limits
 * @property {string} response - The processed response (may be trimmed)
 * @property {string|null} reason - Reason if invalid or trimmed
 */

/**
 * Enforce length and format limits on a response
 * @param {string} response - The response to check
 * @returns {LimitResult}
 */
export function enforceLimit(response) {
  if (!response || typeof response !== 'string') {
    return {
      valid: false,
      response: '',
      reason: 'Empty or invalid response',
    };
  }

  let processed = response.trim();

  // Check minimum length
  if (processed.length < MIN_LENGTH) {
    logger.warn('Response too short', { length: processed.length });
    return {
      valid: false,
      response: processed,
      reason: 'Response too short',
    };
  }

  // Normalize excessive newlines
  processed = processed.replace(/\n{4,}/g, '\n\n\n');

  // Count newlines
  const newlineCount = (processed.match(/\n/g) || []).length;
  if (newlineCount > MAX_NEWLINES) {
    logger.warn('Response has too many newlines', { count: newlineCount });
    // Trim excessive newlines rather than reject
    const lines = processed.split('\n').slice(0, MAX_NEWLINES + 1);
    processed = lines.join('\n') + '\n...';
  }

  // Hard length limit
  if (processed.length > HARD_MAX_LENGTH) {
    logger.warn('Response exceeds hard limit, truncating', {
      original: response.length,
      limit: HARD_MAX_LENGTH,
    });

    // Find a good truncation point (end of sentence)
    let truncateAt = SOFT_MAX_LENGTH;
    const sentenceEnd = processed.lastIndexOf('. ', SOFT_MAX_LENGTH);
    if (sentenceEnd > SOFT_MAX_LENGTH * 0.7) {
      truncateAt = sentenceEnd + 1;
    }

    processed = processed.substring(0, truncateAt).trim() + '...';

    return {
      valid: true,
      response: processed,
      reason: 'Truncated due to length',
    };
  }

  // Soft limit warning (log but don't truncate)
  if (processed.length > SOFT_MAX_LENGTH) {
    logger.debug('Response exceeds soft limit', {
      length: processed.length,
      softLimit: SOFT_MAX_LENGTH,
    });
  }

  return {
    valid: true,
    response: processed,
    reason: null,
  };
}

/**
 * Check if a response is within safe limits without modifying it
 * @param {string} response
 * @returns {boolean}
 */
export function isWithinLimits(response) {
  if (!response || typeof response !== 'string') {
    return false;
  }

  const trimmed = response.trim();
  return trimmed.length >= MIN_LENGTH && trimmed.length <= HARD_MAX_LENGTH;
}

export default {
  enforceLimit,
  isWithinLimits,
  HARD_MAX_LENGTH,
  SOFT_MAX_LENGTH,
  MIN_LENGTH,
};
