import logger from '../utils/logger.js';

/**
 * AI Response Validator
 * Validates AI outputs before sending to users.
 * Balanced for helpfulness and safety.
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the response passed validation
 * @property {string|null} reason - Reason for rejection if invalid
 * @property {string} response - The original or sanitized response
 */

// Maximum allowed response length (characters)
const MAX_RESPONSE_LENGTH = 3000;

// Minimum response length (too short = likely error)
const MIN_RESPONSE_LENGTH = 10;

/**
 * Forbidden patterns that indicate scope violation.
 * Only block truly harmful content, not helpful information.
 */
const FORBIDDEN_PATTERNS = [
  // Direct trading advice
  /\b(buy|sell|hold)\s+(now|immediately|today)\b/i,
  /\b(bullish|bearish|pump|dump|moon|lambo)\b/i,
  
  // Financial advice claims
  /\b(investment\s+advice|financial\s+advice)\b/i,
  /\bguaranteed\s+(return|profit|gain)/i,

  // Price predictions
  /\bprice\s+(will|should|going\s+to)\s+(go|rise|fall|increase|decrease|moon|crash)/i,

  // AI self-reference (breaks immersion)
  /\bas\s+an?\s+(ai|artificial\s+intelligence|language\s+model|llm)\b/i,
  /\bi'?m\s+(just\s+)?(a|an)\s+(bot|ai|language\s+model)\b/i,
];

/**
 * Warning patterns that should be logged but not rejected.
 */
const WARNING_PATTERNS = [
  /\b(rumor|rumour|leaked|insider)\b/i,
];

/**
 * Validate an AI response before sending to users
 * @param {string} response - The AI-generated response
 * @returns {ValidationResult}
 */
export function validateResponse(response) {
  if (!response || typeof response !== 'string') {
    return {
      valid: false,
      reason: 'Empty or invalid response',
      response: '',
    };
  }

  const trimmedResponse = response.trim();

  // Check length limits
  if (trimmedResponse.length < MIN_RESPONSE_LENGTH) {
    logger.warn('Response too short', { length: trimmedResponse.length });
    return {
      valid: false,
      reason: 'Response too short',
      response: trimmedResponse,
    };
  }

  if (trimmedResponse.length > MAX_RESPONSE_LENGTH) {
    logger.warn('Response too long, truncating', {
      length: trimmedResponse.length,
    });
    // Truncate at a sentence boundary if possible
    let truncated = trimmedResponse.substring(0, MAX_RESPONSE_LENGTH);
    const lastSentence = truncated.lastIndexOf('. ');
    if (lastSentence > MAX_RESPONSE_LENGTH * 0.7) {
      truncated = truncated.substring(0, lastSentence + 1);
    } else {
      truncated = truncated + '...';
    }
    return {
      valid: true,
      reason: null,
      response: truncated,
    };
  }

  // Check forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmedResponse)) {
      const match = trimmedResponse.match(pattern);
      logger.warn('Response contains forbidden pattern', {
        pattern: pattern.source,
        match: match?.[0],
      });
      return {
        valid: false,
        reason: 'Response contains forbidden content',
        response: trimmedResponse,
      };
    }
  }

  // Check warning patterns (log but don't reject)
  for (const pattern of WARNING_PATTERNS) {
    if (pattern.test(trimmedResponse)) {
      const match = trimmedResponse.match(pattern);
      logger.debug('Response contains warning pattern', {
        pattern: pattern.source,
        match: match?.[0],
      });
    }
  }

  return {
    valid: true,
    reason: null,
    response: trimmedResponse,
  };
}

/**
 * Sanitize a response for Telegram
 * Removes or escapes problematic characters
 * @param {string} response
 * @returns {string}
 */
export function sanitizeForTelegram(response) {
  if (!response) return '';

  let sanitized = response
    // Remove any null bytes
    .replace(/\0/g, '')
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive newlines (max 2 consecutive newlines)
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim();

  // Count and warn if too many newlines
  const newlineCount = (sanitized.match(/\n/g) || []).length;
  if (newlineCount > 12) {
    logger.warn('Response has too many newlines', { count: newlineCount });
  }

  return sanitized;
}

/**
 * Get a safe fallback message when validation fails
 * @param {string} reason - Optional reason for the fallback
 * @returns {string}
 */
export function getSafeFallbackMessage(reason) {
  return "I ran into an issue generating that response. Could you try asking in a different way? You can also check peppercoin.com directly or use /help to see what I can help with.";
}

export default {
  validateResponse,
  sanitizeForTelegram,
  getSafeFallbackMessage,
  MAX_RESPONSE_LENGTH,
  MIN_RESPONSE_LENGTH,
};
