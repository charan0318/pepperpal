/**
 * Query Classifier
 * Analyzes incoming queries and produces ClassificationResult
 * Pure logic, no AI calls
 */

import {
  CHAR_BUDGETS,
  LENGTH_BUCKETS,
  INTENT_KEYWORDS,
  COMPLEXITY_THRESHOLDS,
} from '../constants.js';
import logger from '../utils/logger.js';

/**
 * Classify a user query into intent, complexity, and response class
 * @param {string} query - Raw user query
 * @returns {import('../types/index.js').ClassificationResult}
 */
export function classify(query) {
  const startTime = Date.now();
  const normalized = (query || '').toLowerCase().trim();
  
  // Determine length bucket
  const lengthBucket = getLengthBucket(normalized.length);
  
  // Detect intent
  const intent = detectIntent(normalized);
  
  // Calculate complexity
  const complexity = calculateComplexity(normalized, intent);
  
  // Determine response class
  const responseClass = getResponseClass(intent);
  
  // Assign character budget
  const charBudget = CHAR_BUDGETS[responseClass] || CHAR_BUDGETS.FACTUAL;
  
  // Extract keywords for knowledge matching
  const keywords = extractKeywords(normalized);
  
  const result = {
    intent,
    complexity,
    lengthBucket,
    responseClass,
    charBudget,
    keywords,
  };
  
  logger.debug('Query classified', {
    query: normalized.substring(0, 50),
    ...result,
    classificationTimeMs: Date.now() - startTime,
  });
  
  return result;
}

/**
 * Determine length bucket based on character count
 * @param {number} length
 * @returns {import('../types/index.js').LengthBucket}
 */
function getLengthBucket(length) {
  if (length < LENGTH_BUCKETS.MICRO) return 'micro';
  if (length < LENGTH_BUCKETS.SHORT) return 'short';
  if (length < LENGTH_BUCKETS.MEDIUM) return 'medium';
  return 'long';
}

/**
 * Detect user intent from query text
 * @param {string} query - Normalized query
 * @returns {import('../types/index.js').IntentType}
 */
function detectIntent(query) {
  // Check greeting first (highest priority for short messages)
  if (isGreeting(query)) return 'greeting';
  
  // Check closing
  if (isClosing(query)) return 'closing';
  
  // Check forbidden intents
  if (isForbiddenInvestment(query)) return 'forbidden';
  if (isForbiddenPrice(query)) return 'forbidden';
  if (isForbiddenSentiment(query)) return 'forbidden';
  
  // Check adversarial patterns
  if (isAdversarial(query)) return 'adversarial';
  
  // Check procedural
  if (isProcedural(query)) return 'procedural';
  
  // Default to factual
  return 'factual';
}

/**
 * Check if query is a greeting
 */
function isGreeting(query) {
  // Short messages that are greetings (increased threshold for longer greetings)
  if (query.length < 30) {
    return INTENT_KEYWORDS.GREETING.some(g => 
      query === g || query.startsWith(g + ' ') || query.startsWith(g + '!') || query.endsWith(' ' + g)
    );
  }
  return false;
}

/**
 * Check if query is a closing/thank you
 */
function isClosing(query) {
  if (query.length < 40) {
    return INTENT_KEYWORDS.CLOSING.some(c => 
      query === c || query.startsWith(c + ' ') || query.startsWith(c + '!') || query.endsWith(' ' + c)
    );
  }
  return false;
}

/**
 * Check for investment advice requests
 */
function isForbiddenInvestment(query) {
  return INTENT_KEYWORDS.FORBIDDEN_INVESTMENT.some(p => query.includes(p));
}

/**
 * Check for price prediction requests
 */
function isForbiddenPrice(query) {
  return INTENT_KEYWORDS.FORBIDDEN_PRICE.some(p => query.includes(p));
}

/**
 * Check for market sentiment language
 */
function isForbiddenSentiment(query) {
  // Only match as standalone words
  return INTENT_KEYWORDS.FORBIDDEN_SENTIMENT.some(p => {
    const regex = new RegExp(`\\b${p}\\b`, 'i');
    return regex.test(query);
  });
}

/**
 * Check for adversarial/jailbreak attempts
 */
function isAdversarial(query) {
  const adversarialPatterns = [
    /ignore\s+(previous|all|your)\s+(instructions?|rules?)/i,
    /disregard\s+(your|the)\s+(rules?|instructions?)/i,
    /pretend\s+(you('re|are)|to\s+be)/i,
    /act\s+as\s+(if|a|an)/i,
    /bypass\s+(your|the)/i,
    /jailbreak/i,
    /dan\s+mode/i,
  ];
  return adversarialPatterns.some(p => p.test(query));
}

/**
 * Check for procedural/how-to questions
 */
function isProcedural(query) {
  return INTENT_KEYWORDS.PROCEDURAL.some(p => query.includes(p));
}

/**
 * Calculate complexity score 0-10
 * @param {string} query
 * @param {string} intent
 * @returns {number}
 */
function calculateComplexity(query, intent) {
  let score = 0;
  
  // Length adds complexity
  if (query.length > 50) score += 1;
  if (query.length > 100) score += 1;
  if (query.length > 200) score += 1;
  
  // Multiple questions add complexity
  const questionMarks = (query.match(/\?/g) || []).length;
  score += Math.min(questionMarks, 2);
  
  // Certain keywords add complexity
  const complexKeywords = [
    'explain', 'detail', 'everything', 'all', 'complete',
    'step by step', 'guide', 'tutorial', 'compare', 'difference'
  ];
  if (complexKeywords.some(k => query.includes(k))) score += 2;
  
  // Procedural intent is inherently more complex
  if (intent === 'procedural') score += 2;
  
  // Greetings and closings are simple
  if (intent === 'greeting' || intent === 'closing') score = 0;
  
  // Cap at 10
  return Math.min(score, 10);
}

/**
 * Map intent to response class
 * @param {string} intent
 * @returns {import('../types/index.js').ResponseClass}
 */
function getResponseClass(intent) {
  const mapping = {
    greeting: 'GREETING',
    closing: 'CLOSING',
    forbidden: 'REFUSAL',
    adversarial: 'REFUSAL',
    procedural: 'PROCEDURAL',
    factual: 'FACTUAL',
  };
  return mapping[intent] || 'FACTUAL';
}

/**
 * Extract keywords for knowledge base matching
 * @param {string} query
 * @returns {string[]}
 */
function extractKeywords(query) {
  // Remove common words
  const stopWords = new Set([
    'what', 'is', 'the', 'a', 'an', 'how', 'do', 'i', 'to', 'can', 'you',
    'tell', 'me', 'about', 'please', 'where', 'when', 'why', 'which',
    'are', 'there', 'this', 'that', 'for', 'of', 'on', 'in', 'and', 'or'
  ]);
  
  const words = query
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  // Return unique keywords
  return [...new Set(words)];
}

export default { classify };
