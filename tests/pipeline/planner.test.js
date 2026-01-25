/**
 * Unit Tests: Planner
 */

import { describe, it, expect } from 'vitest';
import { plan, selectModel } from '../../src/pipeline/planner.js';
import { CHAR_BUDGETS, MODELS } from '../../src/constants.js';

describe('Planner', () => {
  describe('Strategy Selection', () => {
    it('should use template strategy for greetings', () => {
      const classification = {
        intent: 'greeting',
        responseClass: 'GREETING',
        complexity: 1,
        keywords: [],
      };
      const result = plan(classification);
      expect(result.strategy).toBe('template');
    });

    it('should use template strategy for closings', () => {
      const classification = {
        intent: 'closing',
        responseClass: 'CLOSING',
        complexity: 1,
        keywords: [],
      };
      const result = plan(classification);
      expect(result.strategy).toBe('template');
    });

    it('should use template strategy for refusals', () => {
      const classification = {
        intent: 'forbidden',
        responseClass: 'REFUSAL',
        complexity: 1,
        keywords: ['buy'],
      };
      const result = plan(classification);
      expect(result.strategy).toBe('template');
    });

    it('should use cache strategy for simple factual queries', () => {
      const classification = {
        intent: 'factual',
        responseClass: 'FACTUAL',
        complexity: 2,
        keywords: ['contract', 'address'],
      };
      const result = plan(classification);
      expect(result.strategy).toBe('cache');
    });

    it('should use generate strategy for complex queries', () => {
      const classification = {
        intent: 'procedural',
        responseClass: 'PROCEDURAL',
        complexity: 6,
        keywords: ['staking', 'setup', 'guide'],
      };
      const result = plan(classification);
      expect(result.strategy).toBe('generate');
    });
  });

  describe('Character Budgets', () => {
    it('should preserve charBudget from classification', () => {
      const classification = {
        intent: 'greeting',
        responseClass: 'GREETING',
        complexity: 1,
        keywords: [],
        charBudget: CHAR_BUDGETS.GREETING,
      };
      const result = plan(classification);
      expect(result.charBudget).toBe(CHAR_BUDGETS.GREETING);
    });

    it('should preserve procedural charBudget', () => {
      const classification = {
        intent: 'procedural',
        responseClass: 'PROCEDURAL',
        complexity: 4,
        keywords: [],
        charBudget: CHAR_BUDGETS.PROCEDURAL,
      };
      const result = plan(classification);
      expect(result.charBudget).toBe(CHAR_BUDGETS.PROCEDURAL);
    });
  });

  describe('Model Selection', () => {
    it('should select FAST model for low complexity', () => {
      const model = selectModel(2);
      expect(model).toBe('FAST');
    });

    it('should select QUALITY model for high complexity', () => {
      const model = selectModel(8);
      expect(model).toBe('QUALITY');
    });
  });
});
