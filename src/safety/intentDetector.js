/**
 * Intent Detector
 * Pre-AI layer to catch forbidden queries before wasting API calls
 */

import { INTENT_KEYWORDS } from '../constants.js';
import { detectForbiddenType, getRefusalTemplate } from '../templates/refusals.js';
import logger from '../utils/logger.js';

/**
 * Check if query contains forbidden intent
 * @param {string} query - Raw user query
 * @returns {import('../types/index.js').ForbiddenCheckResult}
 */
export function checkForbidden(query) {
  const normalized = (query || '').toLowerCase().trim();
  
  // Check investment advice
  if (isInvestmentAdvice(normalized)) {
    logger.info('Forbidden intent detected: INVESTMENT_ADVICE', { query: normalized.substring(0, 50) });
    return {
      isForbidden: true,
      intent: 'INVESTMENT_ADVICE',
      suggestedRedirect: 'how PEPPER works',
    };
  }
  
  // Check price speculation
  if (isPriceSpeculation(normalized)) {
    logger.info('Forbidden intent detected: PRICE_SPECULATION', { query: normalized.substring(0, 50) });
    return {
      isForbidden: true,
      intent: 'PRICE_SPECULATION',
      suggestedRedirect: 'PEPPER utility',
    };
  }
  
  // Check market sentiment
  if (isMarketSentiment(normalized)) {
    logger.info('Forbidden intent detected: MARKET_SENTIMENT', { query: normalized.substring(0, 50) });
    return {
      isForbidden: true,
      intent: 'MARKET_SENTIMENT',
      suggestedRedirect: 'what makes PEPPER unique',
    };
  }
  
  // Check adversarial
  if (isAdversarial(normalized)) {
    logger.warn('Adversarial intent detected', { query: normalized.substring(0, 50) });
    return {
      isForbidden: true,
      intent: 'ADVERSARIAL',
      suggestedRedirect: 'Peppercoin basics',
    };
  }
  
  return {
    isForbidden: false,
    intent: null,
    suggestedRedirect: null,
  };
}

/**
 * Get appropriate refusal response for forbidden intent
 * @param {string} forbiddenIntent
 * @returns {string}
 */
export function getRefusal(forbiddenIntent) {
  return getRefusalTemplate(forbiddenIntent);
}

// Detection functions

function isInvestmentAdvice(query) {
  const patterns = [
    /should\s+i\s+(buy|sell|invest|hold)/i,
    /is\s+it\s+(worth|good)\s+(buying|to\s+buy|investing)/i,
    /good\s+investment/i,
    /buy\s+(now|today|soon)/i,
    /sell\s+(now|today|soon)/i,
    /invest\s+in\s+pepper/i,
    /worth\s+(buying|investing)/i,
  ];
  return patterns.some(p => p.test(query));
}

function isPriceSpeculation(query) {
  const patterns = [
    /price\s+(prediction|target|forecast)/i,
    /will\s+(the\s+)?price/i,
    /when\s+(will\s+)?(moon|lambo)/i,
    /wen\s+(moon|lambo)/i,
    /price\s+go\s+(up|down)/i,
    /how\s+high\s+(can|will)/i,
    /reach\s+\$?\d/i,
    /\$?\d+\s+(by|in|before)/i,
  ];
  return patterns.some(p => p.test(query));
}

function isMarketSentiment(query) {
  // Must be standalone words, not part of other words
  const sentimentWords = ['bullish', 'bearish', 'pump', 'dump', 'moon', 'lambo', 'mooning', 'pumping', 'dumping'];
  return sentimentWords.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(query);
  });
}

function isAdversarial(query) {
  const patterns = [
    /ignore\s+(previous|all|your|above)\s+(instructions?|rules?|prompts?)/i,
    /disregard\s+(your|the)\s+(rules?|instructions?|guidelines?)/i,
    /forget\s+(your|the|all)\s+(rules?|instructions?)/i,
    /pretend\s+(you('re|are)|to\s+be)/i,
    /act\s+as\s+(if|a|an|though)/i,
    /you\s+are\s+now/i,
    /bypass\s+(your|the|any)/i,
    /jailbreak/i,
    /dan\s+mode/i,
    /developer\s+mode/i,
    /evil\s+mode/i,
    /no\s+restrictions/i,
  ];
  return patterns.some(p => p.test(query));
}

export default {
  checkForbidden,
  getRefusal,
};
