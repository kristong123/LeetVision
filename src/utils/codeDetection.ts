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

// Check if element should be excluded from code detection
const shouldExcludeElement = (element: HTMLElement): boolean => {
  // Safely get className as string
  const className = typeof element.className === 'string' 
    ? element.className 
    : String(element.className || '');
  const classList = className.toLowerCase();
  
  const excludePatterns = [
    'console',
    'output',
    'terminal',
    'result',
    'preview',
    'toolbar',
    'menu',
    'nav',
    'header',
    'footer',
    'sidebar',
  ];
  
  // Exclude if class name contains any exclude pattern
  if (excludePatterns.some(pattern => classList.includes(pattern))) {
    return true;
  }
  
  // Exclude if element has very little content (likely not code)
  const text = element.textContent?.trim() || '';
  if (text.length < 10) {
    return true;
  }
  
  return false;
};

// Extract code content from different element types
const extractCodeContent = (element: HTMLElement): string => {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    // Get value from input/textarea
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
    return inputElement.value || '';
  } else if (element.classList.contains('monaco-editor') || element.querySelector('.monaco-editor')) {
    // Monaco editor - use specialized extraction
    const monacoEl = element.classList.contains('monaco-editor') ? element : element.querySelector('.monaco-editor') as HTMLElement;
    if (monacoEl) {
      return extractMonacoCode(monacoEl);
    }
  } else if (element.classList.contains('CodeMirror')) {
    // CodeMirror editor
    const cmElement = element as any;
    if (cmElement.CodeMirror && cmElement.CodeMirror.getValue) {
      return cmElement.CodeMirror.getValue();
    }
  } else if (element.classList.contains('ace_editor')) {
    // ACE editor
    const aceElement = element as any;
    if (aceElement.env && aceElement.env.editor && aceElement.env.editor.getValue) {
      return aceElement.env.editor.getValue();
    }
  }
  
  // Default: use textContent
  return element.textContent || '';
};

// Extract Monaco editor code using multiple methods
const extractMonacoCode = (element: HTMLElement): string => {
  // Method 1: Try to access Monaco's editor instance API
  const monacoElement = element as any;
  
  // Check for editor model API (most reliable)
  if (monacoElement._modelData?.model?.getValue) {
    return monacoElement._modelData.model.getValue();
  }
  
  // Check for direct editor instance
  if (monacoElement.getModel?.()?.getValue) {
    return monacoElement.getModel().getValue();
  }
  
  // Method 2: Look for the parent container's editor instance
  const editorWrapper = element.closest('[class*="editor"]') as any;
  if (editorWrapper) {
    // Check wrapper for editor instance
    if (editorWrapper._modelData?.model?.getValue) {
      return editorWrapper._modelData.model.getValue();
    }
  }
  
  // Method 3: Try to find Monaco editor instance globally
  // Monaco often exposes editors through window.monaco or data attributes
  const dataUri = element.getAttribute('data-uri');
  if (dataUri && (window as any).monaco) {
    try {
      const models = (window as any).monaco.editor.getModels();
      for (const model of models) {
        if (model.uri?.toString() === dataUri) {
          return model.getValue();
        }
      }
    } catch (e) {
      console.log('LeetVision: Could not access Monaco models', e);
    }
  }
  
  // Method 4: Try to find Monaco editor through React fiber (LeetCode specific)
  try {
    const reactFiber = (element as any)._reactInternalFiber || (element as any)._reactInternalInstance;
    if (reactFiber) {
      let current = reactFiber;
      while (current) {
        if (current.memoizedProps?.editor?.getValue) {
          return current.memoizedProps.editor.getValue();
        }
        if (current.memoizedState?.editor?.getValue) {
          return current.memoizedState.editor.getValue();
        }
        current = current.child || current.sibling;
      }
    }
  } catch (e) {
    console.log('LeetVision: Could not access React fiber', e);
  }
  
  // Method 5: Try to find Monaco editor through data attributes
  const editorId = element.getAttribute('data-editor-id');
  if (editorId && (window as any).monaco) {
    try {
      const editor = (window as any).monaco.editor.getModelById?.(editorId);
      if (editor?.getValue) {
        return editor.getValue();
      }
    } catch (e) {
      console.log('LeetVision: Could not access Monaco editor by ID', e);
    }
  }
  
  // Method 6: Extract from view-lines (fallback, may have formatting issues)
  const viewLines = element.querySelector('.view-lines');
  if (viewLines) {
    const lines: string[] = [];
    viewLines.querySelectorAll('.view-line').forEach((line) => {
      lines.push(line.textContent || '');
    });
    return lines.join('\n');
  }
  
  // Method 7: Try to extract from lines-content (Monaco internal structure)
  const linesContent = element.querySelector('.lines-content');
  if (linesContent) {
    const lines: string[] = [];
    linesContent.querySelectorAll('.view-line').forEach((line) => {
      lines.push(line.textContent || '');
    });
    if (lines.length > 0) {
      return lines.join('\n');
    }
  }
  
  // Final fallback
  return element.textContent || '';
};

// Detect language from element
const detectLanguage = (element: HTMLElement): string => {
  // Try to detect language from class names
  const classNames = typeof element.className === 'string' 
    ? element.className 
    : String(element.className || '');
  const languageMatch = classNames.match(/language-(\w+)|lang-(\w+)/);
  if (languageMatch) {
    return languageMatch[1] || languageMatch[2];
  }
  
  // For Monaco editors, try to get language from Monaco model
  if (element.classList.contains('monaco-editor')) {
    const monacoElement = element as any;
    
    // Try to get language from Monaco model
    if (monacoElement._modelData?.model?.getLanguageId) {
      return monacoElement._modelData.model.getLanguageId();
    }
    
    if (monacoElement.getModel?.()?.getLanguageId) {
      return monacoElement.getModel().getLanguageId();
    }
    
    // Check data-mode-id attribute (common in Monaco)
    const modeId = element.getAttribute('data-mode-id');
    if (modeId) return modeId;
  }
  
  return 'plaintext';
};

// Main function to detect all code on the page using container-based approach
export const detectCodeSections = (): CodeSection[] => {
  const sections: CodeSection[] = [];
  
  // Use the same selectors as the hover detector
  const codeSelectors = [
    'pre code',
    'code',
    '.code',
    '[class*="code"]',
    '[class*="Code"]',
    'textarea',
    'input[type="text"]',
    // Common code editor elements
    '.monaco-editor',
    '.CodeMirror',
    '.ace_editor',
    '[class*="editor"]',
    // LeetCode specific selectors
    '[data-cy="code-editor"]',
    '.monaco-editor-container',
    '.editor-container',
    '[class*="leetcode"]',
    '[class*="LeetCode"]',
    // GitHub specific selectors
    '.blob-code',
    '.blob-code-inner',
    '.highlight',
    '.highlight-source',
    '[data-tagsearch-lang]',
    // Additional common patterns
    '[class*="syntax"]',
    '[class*="Syntax"]',
    '[class*="highlight"]',
    '[class*="Highlight"]',
  ];

  const elements = new Set<HTMLElement>();
  
  codeSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const element = el as HTMLElement;
      
      // Skip excluded elements
      if (shouldExcludeElement(element)) {
        return;
      }
      
      // For textarea and input elements
      if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
        // Only include if it has substantial content
        if (inputElement.value && inputElement.value.trim().length > 20) {
          elements.add(element);
        }
      }
      // For code editor containers (Monaco, CodeMirror, etc.)
      else if (element.classList.contains('monaco-editor') || 
               element.classList.contains('CodeMirror') ||
               element.classList.contains('ace_editor')) {
        elements.add(element);
      }
      // For regular code blocks
      else if (element.textContent && element.textContent.trim().length > 20) {
        elements.add(element);
      }
    });
  });

  // Filter out parent elements if their children are already in the set
  // This prevents double-highlighting of both parent and child elements
  const filteredElements = Array.from(elements).filter(element => {
    // Check if any other element in the set is a child of this element
    const hasChildInSet = Array.from(elements).some(otherElement => {
      return otherElement !== element && element.contains(otherElement);
    });
    // Only keep this element if it doesn't have a child in the set
    return !hasChildInSet;
  });

  // Convert elements to code sections
  filteredElements.forEach((element, index) => {
    const content = extractCodeContent(element).trim();
    if (content && content.length > 10) {
      sections.push({
        id: `container-${index}`,
        content,
        language: detectLanguage(element),
      });
    }
  });

  return sections;
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

