import { CodeSection } from '../types';

// Simple hash function for comparing code content
export const hashCode = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

// Detect code from <pre> and <code> tags
const detectFromTags = (): CodeSection[] => {
  const sections: CodeSection[] = [];
  const codeElements = document.querySelectorAll('pre, code');

  codeElements.forEach((element, index) => {
    const content = element.textContent?.trim();
    if (content && content.length > 10) {
      // Minimum length to be considered code
      sections.push({
        id: `tag-${index}`,
        content,
      });
    }
  });

  return sections;
};

// Detect code from common editor platforms
const detectFromEditors = (): CodeSection[] => {
  const sections: CodeSection[] = [];

  // LeetCode editor - improved selectors
  const leetcodeEditor = document.querySelector('.monaco-editor') ||
    document.querySelector('[data-cy="code-editor"]') ||
    document.querySelector('.monaco-editor-container') ||
    document.querySelector('.editor-container') ||
    document.querySelector('[class*="leetcode"]');
  if (leetcodeEditor) {
    const content = leetcodeEditor.textContent?.trim();
    if (content) {
      sections.push({
        id: 'leetcode-editor',
        content,
      });
    }
  }

  // GitHub code blocks - improved selectors
  const githubCodeBlocks = document.querySelectorAll('.blob-code, .blob-code-inner, .highlight, .highlight-source');
  githubCodeBlocks.forEach((block, index) => {
    const content = block.textContent?.trim();
    if (content && content.length > 10) {
      sections.push({
        id: `github-code-${index}`,
        content,
      });
    }
  });

  // CodeMirror editors
  const codeMirrorEditors = document.querySelectorAll('.CodeMirror');
  codeMirrorEditors.forEach((editor, index) => {
    const content = editor.textContent?.trim();
    if (content) {
      sections.push({
        id: `codemirror-${index}`,
        content,
      });
    }
  });

  // Ace editor
  const aceEditors = document.querySelectorAll('.ace_editor');
  aceEditors.forEach((editor, index) => {
    const content = editor.textContent?.trim();
    if (content) {
      sections.push({
        id: `ace-${index}`,
        content,
      });
    }
  });

  return sections;
};

// Heuristic detection - find text that looks like code
const detectByHeuristics = (): CodeSection[] => {
  const sections: CodeSection[] = [];
  const allElements = document.querySelectorAll('div, p, span');

  allElements.forEach((element, index) => {
    const text = element.textContent?.trim() || '';
    
    // Skip if too short or too long
    if (text.length < 20 || text.length > 10000) return;

    // Check for code-like patterns
    const codePatterns = [
      /function\s+\w+\s*\(/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /class\s+\w+/,
      /def\s+\w+\s*\(/,
      /public\s+(static\s+)?\w+/,
      /private\s+(static\s+)?\w+/,
      /import\s+.+from/,
      /^\s*\{[\s\S]*\}\s*$/m,
      /for\s*\([^)]+\)\s*\{/,
      /while\s*\([^)]+\)\s*\{/,
      /if\s*\([^)]+\)\s*\{/,
    ];

    const hasCodePattern = codePatterns.some((pattern) => pattern.test(text));
    
    // Check for high density of special characters
    const specialChars = text.match(/[{}\[\]();=<>!&|]/g)?.length || 0;
    const specialCharDensity = specialChars / text.length;

    if (hasCodePattern && specialCharDensity > 0.05) {
      sections.push({
        id: `heuristic-${index}`,
        content: text,
      });
    }
  });

  return sections;
};

// Main function to detect all code on the page
export const detectCodeSections = (): CodeSection[] => {
  const fromTags = detectFromTags();
  const fromEditors = detectFromEditors();
  const fromHeuristics = detectByHeuristics();

  // Combine and deduplicate
  const allSections = [...fromEditors, ...fromTags, ...fromHeuristics];
  const uniqueSections = allSections.filter(
    (section, index, self) =>
      index === self.findIndex((s) => s.content === section.content)
  );

  return uniqueSections;
};

// Highlight a code section on the page by ID
export const highlightCodeSection = (sectionId: string) => {
  // This should be called from content script, not from popup
  console.log('Highlight section:', sectionId);
};

// Remove highlight from all code sections
export const removeAllHighlights = () => {
  // This should be called from content script, not from popup
  console.log('Remove all highlights');
};

