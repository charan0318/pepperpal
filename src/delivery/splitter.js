/**
 * Message Splitter
 * Splits long responses into multiple messages for Telegram
 */

import { SPLIT_THRESHOLD, TELEGRAM_MAX_MSG } from '../constants.js';
import logger from '../utils/logger.js';

/**
 * Split response into chunks for Telegram delivery
 * @param {string} text - Response text
 * @param {number} [threshold] - Max chars per message
 * @returns {string[]}
 */
export function splitMessage(text, threshold = SPLIT_THRESHOLD) {
  if (!text || text.length <= threshold) {
    return [text];
  }
  
  logger.debug('Splitting message', { length: text.length, threshold });
  
  const chunks = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= threshold) {
      chunks.push(remaining.trim());
      break;
    }
    
    // Find best split point
    const splitPoint = findSplitPoint(remaining, threshold);
    
    chunks.push(remaining.substring(0, splitPoint).trim());
    remaining = remaining.substring(splitPoint).trim();
    
    // Safety: prevent infinite loop
    if (chunks.length > 10) {
      logger.warn('Too many chunks, forcing break');
      chunks.push(remaining);
      break;
    }
  }
  
  logger.debug('Split complete', { chunks: chunks.length });
  
  return chunks.filter(c => c.length > 0);
}

/**
 * Find best point to split text
 * @param {string} text
 * @param {number} maxLength
 * @returns {number}
 */
function findSplitPoint(text, maxLength) {
  const segment = text.substring(0, maxLength);
  
  // Priority 1: Paragraph break
  const lastParagraph = segment.lastIndexOf('\n\n');
  if (lastParagraph > maxLength * 0.4) {
    return lastParagraph + 2;
  }
  
  // Priority 2: Single newline
  const lastNewline = segment.lastIndexOf('\n');
  if (lastNewline > maxLength * 0.5) {
    return lastNewline + 1;
  }
  
  // Priority 3: Sentence boundary
  const sentenceEnds = ['. ', '! ', '? '];
  let lastSentence = -1;
  for (const end of sentenceEnds) {
    const pos = segment.lastIndexOf(end);
    if (pos > lastSentence) {
      lastSentence = pos;
    }
  }
  if (lastSentence > maxLength * 0.5) {
    return lastSentence + 2;
  }
  
  // Priority 4: Word boundary
  const lastSpace = segment.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return lastSpace + 1;
  }
  
  // Fallback: hard cut
  return maxLength;
}

/**
 * Check if text needs splitting
 * @param {string} text
 * @param {number} [threshold]
 * @returns {boolean}
 */
export function needsSplit(text, threshold = SPLIT_THRESHOLD) {
  return text && text.length > threshold;
}

export default { splitMessage, needsSplit };
