import logger from '../utils/logger.js';

/**
 * Duplicate Query Guard
 * Prevents identical /ask questions from the same user within a short window.
 * Responds once, silently ignores repeats. No warnings or scolding.
 */

// Window in milliseconds to consider queries as duplicates
const DUPLICATE_WINDOW_MS = 30 * 1000; // 30 seconds

// Maximum entries to store (prevents memory growth)
const MAX_ENTRIES = 1000;

/**
 * In-memory store for recent queries
 * Map<string, { hash: string, timestamp: number }>
 * Key: `${userId}:${chatId}`
 */
const recentQueries = new Map();

/**
 * Simple hash function for query deduplication
 * Not cryptographic, just for comparison
 * @param {string} text
 * @returns {string}
 */
function simpleHash(text) {
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Generate a unique key for user+chat combination
 * @param {number} userId
 * @param {number} chatId
 * @returns {string}
 */
function getKey(userId, chatId) {
  return `${userId}:${chatId}`;
}

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, data] of recentQueries.entries()) {
    if (now - data.timestamp > DUPLICATE_WINDOW_MS) {
      recentQueries.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('Duplicate guard cleanup', { entriesRemoved: cleaned });
  }
}, 60 * 1000); // Run every minute

/**
 * Check if a query is a duplicate
 * @param {number} userId - Telegram user ID
 * @param {number} chatId - Telegram chat ID
 * @param {string} query - The question text
 * @returns {boolean} True if this is a duplicate (should be ignored)
 */
export function isDuplicate(userId, chatId, query) {
  if (!userId || !query) {
    return false;
  }

  const key = getKey(userId, chatId || userId);
  const queryHash = simpleHash(query);
  const now = Date.now();

  const existing = recentQueries.get(key);

  if (existing) {
    // Check if same query within window
    if (
      existing.hash === queryHash &&
      now - existing.timestamp < DUPLICATE_WINDOW_MS
    ) {
      logger.debug('Duplicate query detected', {
        userId,
        chatId,
        timeSinceFirst: now - existing.timestamp,
      });
      return true;
    }
  }

  // Enforce max entries limit
  if (recentQueries.size >= MAX_ENTRIES) {
    // Remove oldest entry
    const oldestKey = recentQueries.keys().next().value;
    recentQueries.delete(oldestKey);
  }

  // Store this query
  recentQueries.set(key, {
    hash: queryHash,
    timestamp: now,
  });

  return false;
}

/**
 * Clear all stored queries (for testing)
 */
export function clearDuplicateStore() {
  recentQueries.clear();
}

/**
 * Get current store size (for stats)
 * @returns {number}
 */
export function getDuplicateStoreSize() {
  return recentQueries.size;
}

export default {
  isDuplicate,
  clearDuplicateStore,
  getDuplicateStoreSize,
  DUPLICATE_WINDOW_MS,
};
