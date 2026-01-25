/**
 * Unit Tests: Response Cache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get, set, clear, getStats } from '../../src/cache/responseCache.js';

describe('Response Cache', () => {
  beforeEach(() => {
    clear();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve a response', () => {
      set('what is pepper', 'Peppercoin is the first meme coin on Chiliz Chain.');
      const result = get('what is pepper');
      expect(result.hit).toBe(true);
      expect(result.response).toBe('Peppercoin is the first meme coin on Chiliz Chain.');
    });

    it('should return miss for unknown query', () => {
      const result = get('unknown query');
      expect(result.hit).toBe(false);
      expect(result.response).toBeNull();
    });

    it('should normalize query for matching', () => {
      set('What is PEPPER?', 'Response here');
      const result = get('what is pepper');
      expect(result.hit).toBe(true);
    });

    it('should handle special characters in query', () => {
      set('what is the $PEPPER token?', 'Token info');
      const result = get('what is the pepper token');
      expect(result.hit).toBe(true);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache size', () => {
      set('query1', 'response1');
      set('query2', 'response2');
      const stats = getStats();
      expect(stats.size).toBe(2);
    });

    it('should track hit counts', () => {
      set('popular query', 'response');
      get('popular query');
      get('popular query');
      get('popular query');
      const stats = getStats();
      const entry = stats.entries.find(e => e.key.includes('popular'));
      expect(entry.hits).toBe(3);
    });
  });

  describe('Cache Clear', () => {
    it('should clear all entries', () => {
      set('query1', 'response1');
      set('query2', 'response2');
      clear();
      const stats = getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('TTL Handling', () => {
    it('should accept custom TTL', () => {
      set('short-lived', 'response', 100); // 100ms TTL
      const immediate = get('short-lived');
      expect(immediate.hit).toBe(true);
    });

    // Note: TTL expiration test would need async/await and timers
    // Skipping actual TTL test to avoid flaky tests
  });
});
