import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashCode, detectCodeSections } from '../codeDetection';

describe('codeDetection', () => {
  describe('hashCode', () => {
    it('should return consistent hash for same string', () => {
      const str = 'const a = 1;';
      expect(hashCode(str)).toBe(hashCode(str));
    });

    it('should return different hash for different strings', () => {
      expect(hashCode('abc')).not.toBe(hashCode('abd'));
    });

    it('should handle empty string', () => {
      expect(hashCode('')).toBe('0');
    });
  });

  describe('detectCodeSections', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should detect code in pre code blocks', () => {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = 'const x = 10; function test() { return x; }';
      pre.appendChild(code);
      document.body.appendChild(pre);

      const sections = detectCodeSections();
      expect(sections.length).toBe(1);
      expect(sections[0].content).toBe(code.textContent);
    });

    it('should ignore short text', () => {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = 'short';
      pre.appendChild(code);
      document.body.appendChild(pre);

      const sections = detectCodeSections();
      expect(sections.length).toBe(0);
    });

    it('should detect code in textarea with sufficient content', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'function hello() { console.log("world"); }';
      document.body.appendChild(textarea);

      const sections = detectCodeSections();
      expect(sections.length).toBe(1);
      expect(sections[0].content).toBe(textarea.value);
    });
  });
});
