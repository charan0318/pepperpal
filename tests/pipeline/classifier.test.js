/**
 * Unit Tests: Classifier
 */

import { describe, it, expect } from 'vitest';
import { classify } from '../../src/pipeline/classifier.js';

describe('Classifier', () => {
  describe('Intent Detection', () => {
    it('should classify greetings', () => {
      const queries = ['hi', 'hello', 'hey there', 'gm', 'good morning'];
      for (const q of queries) {
        const result = classify(q);
        expect(result.intent).toBe('greeting');
        expect(result.responseClass).toBe('GREETING');
      }
    });

    it('should classify closings', () => {
      const queries = ['thanks', 'thank you', 'ok got it', 'bye'];
      for (const q of queries) {
        const result = classify(q);
        expect(result.intent).toBe('closing');
        expect(result.responseClass).toBe('CLOSING');
      }
    });

    it('should classify procedural questions', () => {
      const queries = [
        'how to buy pepper',
        'how do i add chiliz network',
        'step by step guide to staking',
      ];
      for (const q of queries) {
        const result = classify(q);
        expect(result.intent).toBe('procedural');
        expect(result.responseClass).toBe('PROCEDURAL');
      }
    });

    it('should classify factual questions', () => {
      const queries = [
        'what is the contract address',
        'what is peppercoin',
        'total supply of pepper',
      ];
      for (const q of queries) {
        const result = classify(q);
        expect(result.intent).toBe('factual');
        expect(result.responseClass).toBe('FACTUAL');
      }
    });

    it('should classify forbidden investment advice', () => {
      const queries = [
        'should i buy pepper',
        'is pepper a good investment',
        'should i invest in pepper',
      ];
      for (const q of queries) {
        const result = classify(q);
        expect(result.intent).toBe('forbidden');
      }
    });

    // Note: Adversarial detection is handled by intentDetector.js, not classifier
    // The classifier focuses on intent categorization, safety is handled separately
    it('should classify unknown patterns as factual', () => {
      const result = classify('some random text here');
      expect(result.intent).toBe('factual');
      expect(result.responseClass).toBe('FACTUAL');
    });
  });

  describe('Complexity Scoring', () => {
    it('should score simple queries as low complexity', () => {
      const result = classify('hi');
      expect(result.complexity).toBeLessThanOrEqual(3);
    });

    it('should score procedural queries as higher complexity', () => {
      const result = classify('how do i set up rabby wallet and add chiliz network');
      expect(result.complexity).toBeGreaterThan(3);
    });

    it('should score long multi-topic queries as higher complexity', () => {
      const result = classify(
        'can you explain the tokenomics and governance structure of peppercoin and how staking works with the different tiers'
      );
      expect(result.complexity).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract relevant keywords', () => {
      const result = classify('what is the pepper contract address on chiliz');
      expect(result.keywords).toContain('pepper');
      expect(result.keywords).toContain('contract');
      expect(result.keywords).toContain('chiliz');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query', () => {
      const result = classify('');
      expect(result).toBeDefined();
      expect(result.responseClass).toBeDefined();
    });

    it('should handle null/undefined', () => {
      const result = classify(null);
      expect(result).toBeDefined();
    });

    it('should handle very long queries', () => {
      const longQuery = 'what is pepper '.repeat(100);
      const result = classify(longQuery);
      expect(result).toBeDefined();
      expect(result.complexity).toBeGreaterThanOrEqual(1);
    });
  });
});
