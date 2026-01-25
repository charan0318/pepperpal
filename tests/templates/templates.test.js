/**
 * Unit Tests: Templates
 */

import { describe, it, expect } from 'vitest';
import { getRandomGreeting, GREETING_TEMPLATES } from '../../src/templates/greetings.js';
import { getRandomClosing, CLOSING_TEMPLATES } from '../../src/templates/closings.js';
import { getRefusalTemplate, detectForbiddenType } from '../../src/templates/refusals.js';
import { matchFactualTemplate, FACTUAL_TEMPLATES } from '../../src/templates/factual.js';
import { CHAR_BUDGETS } from '../../src/constants.js';

describe('Templates', () => {
  describe('Greetings', () => {
    it('should return a valid greeting', () => {
      const greeting = getRandomGreeting();
      expect(greeting).toBeDefined();
      expect(greeting.length).toBeGreaterThan(10);
    });

    it('should return different greetings on multiple calls', () => {
      const greetings = new Set();
      for (let i = 0; i < 20; i++) {
        greetings.add(getRandomGreeting());
      }
      // Should have at least 2 different greetings
      expect(greetings.size).toBeGreaterThan(1);
    });

    it('should have greetings under reasonable length', () => {
      for (const greeting of GREETING_TEMPLATES) {
        // Greetings should be concise (under 200 chars)
        expect(greeting.length).toBeLessThanOrEqual(200);
      }
    });
  });

  describe('Closings', () => {
    it('should return a valid closing', () => {
      const closing = getRandomClosing();
      expect(closing).toBeDefined();
      expect(closing.length).toBeGreaterThan(5);
    });

    it('should have closings under reasonable length', () => {
      for (const closing of CLOSING_TEMPLATES) {
        // Closings should be very short
        expect(closing.length).toBeLessThanOrEqual(150);
      }
    });
  });

  describe('Refusals', () => {
    it('should return refusal for investment advice', () => {
      const refusal = getRefusalTemplate('INVESTMENT_ADVICE');
      expect(refusal).toBeDefined();
      expect(refusal.length).toBeGreaterThan(20);
    });

    it('should return refusal for price speculation', () => {
      const refusal = getRefusalTemplate('PRICE_SPECULATION');
      expect(refusal).toBeDefined();
    });

    it('should return refusal for adversarial', () => {
      const refusal = getRefusalTemplate('ADVERSARIAL');
      expect(refusal).toBeDefined();
    });

    it('should return default refusal for unknown type', () => {
      const refusal = getRefusalTemplate('UNKNOWN_TYPE');
      expect(refusal).toBeDefined();
      expect(refusal.length).toBeGreaterThan(10);
    });

    it('should detect forbidden types from query', () => {
      expect(detectForbiddenType('should i buy pepper')).toBe('INVESTMENT_ADVICE');
      expect(detectForbiddenType('price prediction')).toBe('PRICE_SPECULATION');
      expect(detectForbiddenType('is pepper bullish')).toBe('MARKET_SENTIMENT');
    });
  });

  describe('Factual Templates', () => {
    it('should match contract address query', () => {
      const result = matchFactualTemplate('what is the contract address');
      expect(result).toBeDefined();
      expect(result).toContain('0x60F397');
    });

    it('should match chain ID query', () => {
      const result = matchFactualTemplate('what is the chain id');
      expect(result).toBeDefined();
      expect(result).toContain('88888');
    });

    it('should match website query', () => {
      const result = matchFactualTemplate('what is the official website');
      expect(result).toBeDefined();
      expect(result).toContain('peppercoin.com');
    });

    it('should return null for non-matching query', () => {
      const result = matchFactualTemplate('how does staking work in detail');
      expect(result).toBeNull();
    });

    it('should have templates under reasonable length', () => {
      for (const [key, template] of Object.entries(FACTUAL_TEMPLATES)) {
        // Templates are strings, check their length
        expect(template.length).toBeLessThanOrEqual(CHAR_BUDGETS.FACTUAL + 100);
      }
    });
  });
});
