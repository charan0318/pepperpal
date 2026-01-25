/**
 * Message Formatter - Safe Version
 * 
 * CRITICAL: AI-generated URLs CANNOT be trusted.
 * We strip ALL URLs from AI output and inject ONLY verified links.
 */

import { VERIFIED_FACTS } from '../constants.js';
import { stripAllUrls, detectRelevantLinks, appendVerifiedLinks } from '../knowledge/verifiedLinks.js';
import logger from '../utils/logger.js';

/**
 * Format response for Telegram (plain text with verified links)
 * @param {string} text - Raw AI response
 * @param {string} query - Original user query (to detect relevant links)
 * @returns {string}
 */
export function format(text, query = '') {
  let formatted = text || '';
  
  // Step 1: Strip markdown formatting FIRST (extracts text from [text](url))
  formatted = stripMarkdown(formatted);
  
  // Step 2: STRIP ALL URLs (AI hallucinations are dangerous!)
  formatted = stripAllUrls(formatted);
  
  // Step 3: Clean up whitespace
  formatted = cleanWhitespace(formatted);
  
  // Step 4: Detect what links user needs based on their question
  const relevantLinks = detectRelevantLinks(query);
  
  // Step 5: Append ONLY verified links
  if (relevantLinks.length > 0) {
    formatted = appendVerifiedLinks(formatted, relevantLinks);
    logger.debug('Appended verified links', { count: relevantLinks.length });
  }
  
  return formatted.trim();
}

/**
 * Strip all markdown formatting
 * @param {string} text
 * @returns {string}
 */
function stripMarkdown(text) {
  return text
    // Bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Code blocks
    .replace(/```[^`]+```/g, (match) => match.replace(/```\w*\n?/g, '').trim())
    .replace(/`([^`]+)`/g, '$1')
    // Headers
    .replace(/^#{1,6}\s+/gm, '')
    // List markers (keep content)
    .replace(/^[-*+]\s+/gm, '• ')
    // Markdown links [text](url) -> keep just the text (URLs will be stripped anyway)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Orphan brackets from broken markdown
    .replace(/\[([^\]]+)\]\(/g, '$1')
    .replace(/\[([^\]]+)\]/g, '$1')
    // Images (remove)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Strikethrough
    .replace(/~~([^~]+)~~/g, '$1')
    // Horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Blockquotes
    .replace(/^>\s*/gm, '');
}

/**
 * Clean up whitespace
 * @param {string} text
 * @returns {string}
 */
function cleanWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^\s+$/gm, '')
    .trim();
}

/**
 * Add verified facts if missing from response
 * @param {string} text
 * @param {string[]} requiredFacts - Array of fact keys to check
 * @returns {string}
 */
export function ensureFacts(text, requiredFacts = []) {
  let result = text;
  
  for (const factKey of requiredFacts) {
    const fact = VERIFIED_FACTS[factKey];
    if (!fact) continue;
    
    // Check if fact is already present
    if (!result.toLowerCase().includes(fact.toLowerCase())) {
      result += `\n\n${fact}`;
      logger.debug('Added missing fact', { factKey });
    }
  }
  
  return result;
}

export default { format, ensureFacts };
