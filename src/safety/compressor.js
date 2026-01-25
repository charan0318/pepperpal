/**
 * Response Compressor
 * Compresses over-length responses while preserving key information
 */

import logger from '../utils/logger.js';

/**
 * Compress response to target length
 * @param {string} text - Original text
 * @param {number} targetLength - Target character count
 * @returns {string}
 */
export function compress(text, targetLength) {
  if (text.length <= targetLength) {
    return text;
  }
  
  logger.debug('Compressing response', {
    original: text.length,
    target: targetLength,
  });
  
  // Strategy 1: Try removing extra newlines
  let compressed = text.replace(/\n{2,}/g, '\n');
  if (compressed.length <= targetLength) {
    return compressed;
  }
  
  // Strategy 2: Extract key information
  const keyInfo = extractKeyInfo(text);
  
  // Strategy 3: Build compressed version
  // First sentence + key facts + continuation signal
  const firstSentence = getFirstSentence(text);
  const keyFacts = extractFacts(text);
  
  compressed = firstSentence;
  
  // Add key facts if space allows
  for (const fact of keyFacts) {
    if ((compressed + '\n' + fact).length < targetLength - 30) {
      compressed += '\n' + fact;
    }
  }
  
  // Add continuation signal if we truncated significantly
  if (text.length > targetLength * 1.5) {
    compressed += '\n\nSay MORE for full details.';
  }
  
  // Final check - hard truncate if still over
  if (compressed.length > targetLength) {
    compressed = hardTruncate(compressed, targetLength);
  }
  
  logger.debug('Compression complete', {
    original: text.length,
    compressed: compressed.length,
  });
  
  return compressed;
}

/**
 * Get first sentence of text
 * @param {string} text
 * @returns {string}
 */
function getFirstSentence(text) {
  const match = text.match(/^[^.!?]+[.!?]/);
  if (match) {
    return match[0].trim();
  }
  // No sentence boundary found, take first 100 chars
  return text.substring(0, 100).trim();
}

/**
 * Extract key facts (contract addresses, links, numbers)
 * @param {string} text
 * @returns {string[]}
 */
function extractFacts(text) {
  const facts = [];
  
  // Contract addresses
  const contractMatch = text.match(/0x[a-fA-F0-9]{40}/);
  if (contractMatch) {
    facts.push(`Contract: ${contractMatch[0]}`);
  }
  
  // NOTE: URLs are NOT extracted here because:
  // 1. AI-generated URLs are stripped in formatter.js
  // 2. Only verified links are added at the end
  // This prevents hallucinated URLs from being preserved
  
  // Chain ID
  if (text.includes('88888')) {
    facts.push('Chain ID: 88888');
  }
  
  return facts;
}

/**
 * Extract key information markers
 * @param {string} text
 * @returns {Object}
 */
function extractKeyInfo(text) {
  return {
    hasContract: /0x[a-fA-F0-9]{40}/.test(text),
    hasUrl: /https?:\/\//.test(text),
    hasSteps: /step\s+\d|^\d+\./mi.test(text),
    hasList: /^[-•*]\s/m.test(text),
  };
}

/**
 * Hard truncate at safe boundary
 * @param {string} text
 * @param {number} limit
 * @returns {string}
 */
function hardTruncate(text, limit) {
  if (text.length <= limit) return text;
  
  const truncated = text.substring(0, limit - 20);
  const lastSentence = truncated.lastIndexOf('. ');
  
  if (lastSentence > limit * 0.5) {
    return truncated.substring(0, lastSentence + 1) + '\n\nSay MORE.';
  }
  
  const lastNewline = truncated.lastIndexOf('\n');
  if (lastNewline > limit * 0.6) {
    return truncated.substring(0, lastNewline) + '\n\nSay MORE.';
  }
  
  return truncated + '...';
}

export default { compress };
