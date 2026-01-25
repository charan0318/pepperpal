/**
 * Unit Tests: Validator
 */

import { describe, it, expect } from 'vitest';
import { validate } from '../../src/pipeline/validator.js';
import { HARD_CHAR_LIMIT, SOFT_CHAR_LIMIT } from '../../src/constants.js';

describe('Validator', () => {
  describe('Length Enforcement', () => {
    it('should pass responses under hard limit', () => {
      const generated = {
        text: 'This is a valid response about Peppercoin.',
        tokensUsed: 10,
        fromCache: false,
        fromTemplate: false,
      };
      const result = validate(generated, 200);
      expect(result.valid).toBe(true);
      expect(result.wasCompressed).toBe(false);
    });

    it('should compress responses over hard limit', () => {
      const longText = 'This is a very long response. '.repeat(150); // ~4500 chars (over 3500 limit)
      const generated = {
        text: longText,
        tokensUsed: 100,
        fromCache: false,
        fromTemplate: false,
      };
      const result = validate(generated, 400);
      expect(result.wasCompressed).toBe(true);
      expect(result.text.length).toBeLessThanOrEqual(HARD_CHAR_LIMIT);
    });

    it('should reject responses too short', () => {
      const generated = {
        text: 'Hi',
        tokensUsed: 1,
        fromCache: false,
        fromTemplate: false,
      };
      const result = validate(generated, 200);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('short');
    });

    it('should reject empty responses', () => {
      const generated = {
        text: '',
        tokensUsed: 0,
        fromCache: false,
        fromTemplate: false,
      };
      const result = validate(generated, 200);
      expect(result.valid).toBe(false);
    });
  });

  describe('Forbidden Pattern Detection', () => {
    it('should reject AI self-reference', () => {
      const generated = {
        text: 'As an AI language model, I cannot provide investment advice.',
        tokensUsed: 15,
        fromCache: false,
        fromTemplate: false,
      };
      const result = validate(generated, 200);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('forbidden');
    });

    it('should reject system prompt leakage', () => {
      const generated = {
        text: 'Based on my system prompt, I should help with Peppercoin.',
        tokensUsed: 15,
        fromCache: false,
        fromTemplate: false,
      };
      const result = validate(generated, 200);
      expect(result.valid).toBe(false);
    });

    it('should reject direct trading advice in output', () => {
      const generated = {
        text: 'You should buy now before the price goes up!',
        tokensUsed: 15,
        fromCache: false,
        fromTemplate: false,
      };
      const result = validate(generated, 200);
      expect(result.valid).toBe(false);
    });

    it('should allow valid Peppercoin information', () => {
      const generated = {
        text: 'Peppercoin (PEPPER) is the first meme coin on Chiliz Chain. The contract address is 0x60F397acBCfB8f4e3234C659A3E10867e6fA6b67.',
        tokensUsed: 30,
        fromCache: false,
        fromTemplate: false,
      };
      const result = validate(generated, 300);
      expect(result.valid).toBe(true);
    });
  });

  describe('Whitespace Normalization', () => {
    it('should normalize excessive newlines', () => {
      const generated = {
        text: 'First paragraph.\n\n\n\n\nSecond paragraph.',
        tokensUsed: 10,
        fromCache: false,
        fromTemplate: false,
      };
      const result = validate(generated, 200);
      expect(result.valid).toBe(true);
      expect(result.text).not.toContain('\n\n\n');
    });

    it('should trim whitespace', () => {
      const generated = {
        text: '   Peppercoin is great!   ',
        tokensUsed: 10,
        fromCache: false,
        fromTemplate: false,
      };
      const result = validate(generated, 200);
      expect(result.valid).toBe(true);
      expect(result.text).toBe('Peppercoin is great!');
    });
  });
});
