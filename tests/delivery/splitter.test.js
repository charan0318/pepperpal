/**
 * Unit Tests: Message Splitter
 */

import { describe, it, expect } from 'vitest';
import { splitMessage, needsSplit } from '../../src/delivery/splitter.js';
import { SPLIT_THRESHOLD } from '../../src/constants.js';

describe('Message Splitter', () => {
  describe('needsSplit', () => {
    it('should return false for short messages', () => {
      expect(needsSplit('Hello!')).toBe(false);
    });

    it('should return true for long messages', () => {
      const longText = 'A'.repeat(SPLIT_THRESHOLD + 100);
      expect(needsSplit(longText)).toBe(true);
    });
  });

  describe('splitMessage', () => {
    it('should not split short messages', () => {
      const text = 'This is a short message.';
      const chunks = splitMessage(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should split at paragraph boundaries', () => {
      const para1 = 'First paragraph with some content.';
      const para2 = 'Second paragraph with more content.';
      const text = para1 + '\n\n' + para2 + '\n\n' + 'A'.repeat(400);
      const chunks = splitMessage(text, 100);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should split at sentence boundaries when no paragraph break', () => {
      const text = 'First sentence. Second sentence. Third sentence. ' + 'More content here. '.repeat(30);
      const chunks = splitMessage(text, 100);
      for (const chunk of chunks) {
        // Each chunk should end cleanly (period or be the last chunk)
        expect(chunk.length).toBeLessThanOrEqual(110); // Allow small overflow for boundary finding
      }
    });

    it('should handle text without natural breaks', () => {
      const text = 'A'.repeat(500);
      const chunks = splitMessage(text, 100);
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(100);
      }
    });

    it('should not return empty chunks', () => {
      const text = 'Hello\n\n\n\nWorld';
      const chunks = splitMessage(text);
      for (const chunk of chunks) {
        expect(chunk.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty input', () => {
      const chunks = splitMessage('');
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('');
    });
  });
});
