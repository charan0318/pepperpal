/**
 * Unit Tests: Message Formatter
 * NOTE: Formatter now STRIPS all AI-generated URLs to prevent hallucination
 * Verified links are injected based on user query keywords
 */

import { describe, it, expect } from 'vitest';
import { format } from '../../src/delivery/formatter.js';

describe('Message Formatter', () => {
  describe('Markdown Stripping', () => {
    it('should remove bold markdown', () => {
      const input = 'This is **bold** text';
      const result = format(input);
      expect(result).toBe('This is bold text');
      expect(result).not.toContain('**');
    });

    it('should remove italic markdown', () => {
      const input = 'This is *italic* text';
      const result = format(input);
      expect(result).toBe('This is italic text');
      expect(result).not.toContain('*');
    });

    it('should remove inline code', () => {
      const input = 'Use `command` here';
      const result = format(input);
      expect(result).toBe('Use command here');
      expect(result).not.toContain('`');
    });

    it('should remove code blocks', () => {
      const input = 'Example:\n```javascript\nconst x = 1;\n```';
      const result = format(input);
      expect(result).not.toContain('```');
      expect(result).toContain('const x = 1');
    });

    it('should remove headers', () => {
      const input = '## Header\nContent here';
      const result = format(input);
      expect(result).not.toContain('##');
      expect(result).toContain('Header');
    });

    it('should strip URLs from markdown links (prevent AI hallucination)', () => {
      const input = 'Visit [website](https://fake-ai-url.com)';
      const result = format(input);
      expect(result).toContain('website');
      // URLs are stripped to prevent AI hallucinations
      expect(result).not.toContain('https://fake-ai-url.com');
    });

    it('should convert list markers to bullets', () => {
      const input = '- Item 1\n- Item 2';
      const result = format(input);
      expect(result).toContain('• Item 1');
      expect(result).toContain('• Item 2');
    });
  });

  describe('URL Stripping (Security)', () => {
    it('should strip all AI-generated URLs', () => {
      const input = 'Visit https://pepper.com/tokenomics for info';
      const result = format(input);
      expect(result).not.toContain('https://pepper.com');
    });
    
    it('should inject verified links when query matches keywords', () => {
      const input = 'Here is information about Pepper';
      const result = format(input, 'what is the website?');
      expect(result).toContain('https://www.peppercoin.com');
      expect(result).toContain('Official Website');
    });
    
    it('should inject coingecko link for price queries', () => {
      const input = 'Check the current price on CoinGecko';
      const result = format(input, 'where to check price?');
      expect(result).toContain('https://www.coingecko.com/en/coins/pepper');
    });
  });

  describe('Whitespace Cleaning', () => {
    it('should normalize multiple newlines', () => {
      const input = 'First\n\n\n\nSecond';
      const result = format(input);
      expect(result).toBe('First\n\nSecond');
    });

    it('should normalize multiple spaces', () => {
      const input = 'Too    many   spaces';
      const result = format(input);
      expect(result).toBe('Too many spaces');
    });

    it('should trim whitespace', () => {
      const input = '  Trimmed  ';
      const result = format(input);
      expect(result).toBe('Trimmed');
    });

    it('should handle CRLF line endings', () => {
      const input = 'Line1\r\nLine2';
      const result = format(input);
      expect(result).toBe('Line1\nLine2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      expect(format('')).toBe('');
    });

    it('should handle plain text unchanged', () => {
      const input = 'Just plain text here.';
      expect(format(input)).toBe(input);
    });

    it('should preserve contract addresses', () => {
      const input = 'Contract: 0x60F397acBCfB8f4e3234C659A3E10867e6fA6b67';
      const result = format(input);
      expect(result).toContain('0x60F397acBCfB8f4e3234C659A3E10867e6fA6b67');
    });
  });
});
