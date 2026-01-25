/**
 * Response Validator
 * Validates and enforces limits on generated responses
 * ORDER: Length first, then forbidden patterns
 */

import { HARD_CHAR_LIMIT, SOFT_CHAR_LIMIT, MIN_RESPONSE_LENGTH } from '../constants.js';
import { compress } from '../safety/compressor.js';
import logger from '../utils/logger.js';

/**
 * Forbidden patterns in AI output (containment check)
 */
const FORBIDDEN_OUTPUT_PATTERNS = [
  // AI self-reference (breaks persona)
  /\bas\s+an?\s+(ai|artificial\s+intelligence|language\s+model|llm)\b/i,
  /\bi'?m\s+(just\s+)?(a|an)\s+(bot|ai|language\s+model)\b/i,
  /\bi\s+am\s+(a|an)\s+(ai|bot|language\s+model)/i,
  
  // System leakage
  /\b(system\s+prompt|openrouter|api\s+key)/i,
  /\b(knowledge\s+file|peppercoin\.md)/i,
  
  // Direct trading advice (AI generated despite instructions)
  /\b(buy|sell)\s+(now|immediately|today|soon)\b/i,
  /\bguaranteed\s+(return|profit)/i,
  /\bprice\s+(will|should|going\s+to)\s+(go|rise|fall|moon)/i,
];

/**
 * Validate generated response
 * @param {import('../types/index.js').GeneratedResponse} generated
 * @param {number} charBudget - Target character budget
 * @returns {import('../types/index.js').ValidatedResponse}
 */
export function validate(generated, charBudget) {
  let text = generated.text || '';
  let wasCompressed = false;
  
  // Step 1: Check minimum length
  if (text.length < MIN_RESPONSE_LENGTH) {
    logger.warn('Response too short', { length: text.length });
    return {
      valid: false,
      text: '',
      wasCompressed: false,
      error: 'Response too short',
    };
  }
  
  // Step 2: Enforce length limit FIRST
  if (text.length > HARD_CHAR_LIMIT) {
    logger.info('Response over hard limit, compressing', {
      original: text.length,
      limit: HARD_CHAR_LIMIT,
    });
    
    text = compress(text, SOFT_CHAR_LIMIT);
    wasCompressed = true;
    
    // If still over after compression, hard truncate
    if (text.length > HARD_CHAR_LIMIT) {
      text = hardTruncate(text, HARD_CHAR_LIMIT);
    }
  }
  
  // Step 3: Check forbidden output patterns
  for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      logger.warn('Forbidden pattern in output', {
        pattern: pattern.source,
        match: match?.[0],
      });
      return {
        valid: false,
        text: '',
        wasCompressed,
        error: 'Contains forbidden content',
      };
    }
  }
  
  // Step 4: Normalize whitespace
  text = normalizeWhitespace(text);
  
  // Step 5: Check for incomplete response (AI ran out of tokens mid-sentence)
  const incompleteCheck = detectIncomplete(text);
  if (incompleteCheck.isIncomplete) {
    logger.warn('Response appears incomplete', { 
      reason: incompleteCheck.reason,
      ending: text.slice(-50) 
    });
    // Fix the incomplete response by adding proper ending
    text = fixIncompleteResponse(text);
  }
  
  // Step 6: Final length check
  if (text.length === 0) {
    return {
      valid: false,
      text: '',
      wasCompressed,
      error: 'Empty after processing',
    };
  }
  
  return {
    valid: true,
    text,
    wasCompressed,
    error: null,
  };
}

/**
 * Detect if response was cut off mid-generation
 * @param {string} text
 * @returns {{ isIncomplete: boolean, reason: string|null }}
 */
function detectIncomplete(text) {
  if (!text || text.length < 50) {
    return { isIncomplete: false, reason: null };
  }
  
  const trimmed = text.trim();
  const lastChar = trimmed.slice(-1);
  const last20 = trimmed.slice(-20);
  
  // Ends with proper punctuation - likely complete
  if (/[.!?]$/.test(trimmed)) {
    return { isIncomplete: false, reason: null };
  }
  
  // Ends with emoji - likely complete
  if (/[\u{1F300}-\u{1F9FF}]$/u.test(trimmed)) {
    return { isIncomplete: false, reason: null };
  }
  
  // Obvious cutoff indicators
  if (/[-–—:,]\s*$/.test(trimmed)) {
    return { isIncomplete: true, reason: 'ends with incomplete punctuation' };
  }
  
  // Ends mid-word or with open bracket
  if (/\([^)]*$/.test(last20) || /\[[^\]]*$/.test(last20)) {
    return { isIncomplete: true, reason: 'unclosed bracket' };
  }
  
  // Ends with common incomplete patterns
  if (/\b(like|such as|including|and|or|the|a|an|to|for|with|on|at)\s*$/i.test(last20)) {
    return { isIncomplete: true, reason: 'ends with incomplete phrase' };
  }
  
  // Ends with number followed by period (list item incomplete)
  if (/\d+\.\s*$/.test(last20)) {
    return { isIncomplete: true, reason: 'incomplete list item' };
  }
  
  return { isIncomplete: false, reason: null };
}

/**
 * Fix an incomplete response by adding proper ending
 * @param {string} text
 * @returns {string}
 */
function fixIncompleteResponse(text) {
  let fixed = text.trim();
  
  // Remove trailing incomplete punctuation
  fixed = fixed.replace(/[-–—:,]\s*$/, '');
  
  // Remove incomplete list items
  fixed = fixed.replace(/\n\d+\.\s*$/, '');
  
  // Close unclosed brackets
  const openParens = (fixed.match(/\(/g) || []).length;
  const closeParens = (fixed.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    fixed = fixed.replace(/\([^)]*$/, ''); // Remove incomplete parenthetical
  }
  
  // Add continuation signal
  fixed = fixed.trim();
  if (!/[.!?]$/.test(fixed)) {
    fixed += '...';
  }
  
  fixed += '\n\n(Response was truncated. Ask a more specific question for details.)';
  
  return fixed;
}

/**
 * Hard truncate at sentence boundary
 * @param {string} text
 * @param {number} limit
 * @returns {string}
 */
function hardTruncate(text, limit) {
  if (text.length <= limit) return text;
  
  // Try to truncate at sentence boundary
  const truncated = text.substring(0, limit);
  const lastSentence = truncated.lastIndexOf('. ');
  
  if (lastSentence > limit * 0.6) {
    return truncated.substring(0, lastSentence + 1);
  }
  
  // Try to truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > limit * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  // Hard cut
  return truncated.substring(0, limit - 3) + '...';
}

/**
 * Normalize whitespace
 * @param {string} text
 * @returns {string}
 */
function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export default { validate };
