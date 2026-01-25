/**
 * Response Cache
 * In-memory cache with TTL for avoiding redundant AI calls
 */

import { CACHE_TTL, MAX_CACHE_SIZE } from '../constants.js';
import logger from '../utils/logger.js';

/**
 * In-memory cache store
 * @type {Map<string, import('../types/index.js').CacheEntry>}
 */
const cache = new Map();

/**
 * Normalize query for cache key
 * @param {string} query
 * @returns {string}
 */
function normalizeKey(query) {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Get cached response if available and fresh
 * @param {string} query - User query
 * @returns {{ hit: boolean, response: string|null }}
 */
export function get(query) {
  const key = normalizeKey(query);
  const entry = cache.get(key);
  
  if (!entry) {
    return { hit: false, response: null };
  }
  
  // Check if expired
  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    logger.debug('Cache expired', { key: key.substring(0, 30) });
    return { hit: false, response: null };
  }
  
  // Update hit count
  entry.hits++;
  
  logger.debug('Cache hit', {
    key: key.substring(0, 30),
    hits: entry.hits,
    ageMs: now - entry.timestamp,
  });
  
  return { hit: true, response: entry.response };
}

/**
 * Store response in cache
 * @param {string} query - User query
 * @param {string} response - Generated response
 * @param {number} [ttl] - Time to live in ms (default: FACTS TTL)
 */
export function set(query, response, ttl = CACHE_TTL.FACTS) {
  // Evict if at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    evictOldest();
  }
  
  const key = normalizeKey(query);
  
  cache.set(key, {
    response,
    timestamp: Date.now(),
    ttl,
    hits: 0,
  });
  
  logger.debug('Cache set', {
    key: key.substring(0, 30),
    ttl,
    cacheSize: cache.size,
  });
}

/**
 * Evict oldest entry from cache
 */
function evictOldest() {
  let oldestKey = null;
  let oldestTime = Infinity;
  
  for (const [key, entry] of cache.entries()) {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      oldestKey = key;
    }
  }
  
  if (oldestKey) {
    cache.delete(oldestKey);
    logger.debug('Cache evicted', { key: oldestKey.substring(0, 30) });
  }
}

/**
 * Clear entire cache
 */
export function clear() {
  const size = cache.size;
  cache.clear();
  logger.info('Cache cleared', { entriesRemoved: size });
}

/**
 * Get cache statistics
 * @returns {{ size: number, entries: Array<{ key: string, hits: number, ageMs: number }> }}
 */
export function getStats() {
  const now = Date.now();
  const entries = [];
  
  for (const [key, entry] of cache.entries()) {
    entries.push({
      key: key.substring(0, 30),
      hits: entry.hits,
      ageMs: now - entry.timestamp,
    });
  }
  
  return {
    size: cache.size,
    entries: entries.sort((a, b) => b.hits - a.hits).slice(0, 10),
  };
}

export default {
  get,
  set,
  clear,
  getStats,
};
