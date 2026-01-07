import logger from '../utils/logger.js';
import { enforceLimit } from './responseLimiter.js';

/**
 * Output Sanitizer
 * Final safety filter before sending any response to users.
 * Balances safety with helpfulness.
 */

/**
 * Official Peppercoin domains - these URLs are ALLOWED
 */
const ALLOWED_DOMAINS = [
  'peppercoin.com',
  'www.peppercoin.com',
  'chiliz.com',
  'www.chiliz.com',
  'docs.chiliz.com',
  'chiliscan.com',
  't.me/officialpeppercoin',
  'x.com/PepperChain',
  'twitter.com/PepperChain',
  'coingecko.com/en/coins/pepper',
  'app.fanx.xyz',
  'fanx.xyz',
  'rpc.chiliz.com',
];

/**
 * Check if a URL is from an allowed official domain
 * @param {string} url
 * @returns {boolean}
 */
function isAllowedUrl(url) {
  const lowerUrl = url.toLowerCase();
  return ALLOWED_DOMAINS.some(domain => lowerUrl.includes(domain.toLowerCase()));
}

/**
 * Forbidden patterns - responses containing these are discarded
 */
const FORBIDDEN_OUTPUT_PATTERNS = [
  // Trading advice (strict)
  /\b(buy|sell|hold)\s+(now|immediately|today|soon)/i,
  /\b(bullish|bearish|moon|dump|pump)\b/i,
  /\b(price\s+target|price\s+prediction)/i,

  // Financial advice (strict)
  /\b(investment\s+advice|financial\s+advice)/i,
  /\b(guaranteed|risk-?free|profit)\s+(return|income|gain)/i,

  // Internal system references (should never leak)
  /\b(system\s+prompt|openrouter|api\s+key)/i,
  /\b(knowledge\s+file|peppercoin\.md)/i,
  /\b(phase\s+[1-4]|master\s+prompt)/i,

  // Jailbreak indicators
  /\b(ignore\s+(previous|above|all)\s+(instructions?|rules?))/i,
  /\b(disregard|forget)\s+(your|the)\s+(rules?|instructions?)/i,

  // Markdown abuse (excessive formatting)
  /#{4,}/g, // Too many heading levels
  /\*{4,}/g, // Excessive bold/italic
  /`{4,}/g, // Excessive code blocks
];

/**
 * Smart URL filtering - keeps official links, removes unknown ones
 * @param {string} text
 * @returns {string}
 */
function filterUrls(text) {
  const urlPattern = /https?:\/\/[^\s]+/gi;
  
  return text.replace(urlPattern, (url) => {
    // Clean trailing punctuation that might be captured
    const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
    
    if (isAllowedUrl(cleanUrl)) {
      return cleanUrl; // Keep official links
    }
    
    logger.debug('Stripped non-allowed URL', { url: cleanUrl });
    return ''; // Remove unknown links
  });
}

/**
 * Patterns to strip from output (clean up, don't reject)
 */
const STRIP_PATTERNS = [
  // Remove email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,

  // Remove excessive whitespace
  /[ \t]{3,}/g,
  
  // Strip markdown formatting (since Telegram displays it literally without parse_mode)
  // Bold: **text** or __text__
  /\*\*([^*]+)\*\*/g,
  /__([^_]+)__/g,
  // Italic: *text* or _text_ (but preserve single asterisks in normal usage)
  /(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g,
  /(?<!_)_(?!_)([^_\n]+?)(?<!_)_(?!_)/g,
  // Inline code: `text`
  /`([^`]+)`/g,
  // Strikethrough: ~~text~~
  /~~([^~]+)~~/g,
];

// Note: Contract addresses (0x...) are NOW ALLOWED since users need them
// Note: URLs are filtered smartly via filterUrls() - official ones kept

/**
 * @typedef {Object} SanitizeResult
 * @property {boolean} safe - Whether the response is safe to send
 * @property {string} output - The sanitized output
 * @property {string|null} reason - Reason if unsafe
 */

/**
 * Sanitize a response before sending to user
 * This is the FINAL check before any message is sent
 * @param {string} response - The response to sanitize
 * @returns {SanitizeResult}
 */
export function sanitize(response) {
  if (!response || typeof response !== 'string') {
    return {
      safe: false,
      output: '',
      reason: 'Empty response',
    };
  }

  let output = response.trim();

  // Check forbidden patterns first (reject immediately)
  for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
    if (pattern.test(output)) {
      const match = output.match(pattern);
      logger.warn('Output contains forbidden pattern', {
        pattern: pattern.source,
        matchPreview: match?.[0]?.substring(0, 50),
      });
      return {
        safe: false,
        output: '',
        reason: 'Contains forbidden content',
      };
    }
  }

  // Smart URL filtering - keeps official links, removes unknown ones
  output = filterUrls(output);

  // Strip other problematic patterns (clean up) - includes markdown stripping
  for (const pattern of STRIP_PATTERNS) {
    const before = output;
    // For markdown patterns, capture group 1 is the text without formatting
    output = output.replace(pattern, (match, captured) => {
      // If there's a capture group (the text inside markdown), keep it
      return captured !== undefined ? captured : ' ';
    });
    if (before !== output) {
      logger.debug('Stripped pattern from output', {
        pattern: pattern.source,
      });
    }
  }

  // Normalize whitespace
  output = output
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Apply length limits
  const limitResult = enforceLimit(output);
  if (!limitResult.valid) {
    return {
      safe: false,
      output: '',
      reason: limitResult.reason,
    };
  }

  output = limitResult.response;

  // Final empty check
  if (output.length === 0) {
    return {
      safe: false,
      output: '',
      reason: 'Empty after sanitization',
    };
  }

  return {
    safe: true,
    output: output,
    reason: null,
  };
}

/**
 * Get a safe fallback message when sanitization fails
 * @returns {string}
 */
export function getSafeFallback() {
  return "I ran into a hiccup with that response. Could you try rephrasing your question? You can also check the official resources at peppercoin.com or use /help to see what I can assist with.";
}

/**
 * Quick check if a response appears safe (without full processing)
 * @param {string} response
 * @returns {boolean}
 */
export function quickSafetyCheck(response) {
  if (!response || typeof response !== 'string') {
    return false;
  }

  for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
    if (pattern.test(response)) {
      return false;
    }
  }

  return true;
}

export default {
  sanitize,
  getSafeFallback,
  quickSafetyCheck,
};
