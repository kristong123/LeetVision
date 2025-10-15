import browser from 'webextension-polyfill';

const LEETVISION_HOVER_CLASS = 'leetvision-code-hover';
const LEETVISION_SELECTED_CLASS = 'leetvision-code-selected';

let isHoverModeActive = false;
let codeElements: HTMLElement[] = [];
let selectedElement: HTMLElement | null = null;
let styleElement: HTMLStyleElement | null = null;
let tooltipElement: HTMLDivElement | null = null;

/**
 * Inject CSS styles for hover effects
 */
function injectStyles() {
  if (styleElement) return;

  styleElement = document.createElement('style');
  styleElement.textContent = `
    .${LEETVISION_HOVER_CLASS} {
      outline: 3px solid #2563eb !important;
      outline-offset: 1px !important;
      cursor: pointer !important;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15), inset 0 0 0 9999px rgba(37, 99, 235, 0.03) !important;
      transition: all 0.15s ease !important;
    }
    
    .leetvision-code-active-hover {
      outline: 4px solid #2563eb !important;
      box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.25), inset 0 0 0 9999px rgba(37, 99, 235, 0.05) !important;
    }
    
    .${LEETVISION_SELECTED_CLASS} {
      outline: 3px solid #059669 !important;
      outline-offset: 1px !important;
      box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.15), inset 0 0 0 9999px rgba(5, 150, 105, 0.03) !important;
    }
    
    #leetvision-tooltip {
      position: fixed;
      background: #2563eb;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      white-space: nowrap;
      z-index: 2147483647;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: opacity 0.15s ease;
    }
    
    #leetvision-tooltip.success {
      background: #059669;
    }
  `;
  document.head.appendChild(styleElement);
}

/**
 * Create and show tooltip
 */
function showTooltip(element: HTMLElement, text: string, isSuccess: boolean = false) {
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.id = 'leetvision-tooltip';
    document.body.appendChild(tooltipElement);
  }
  
  tooltipElement.textContent = text;
  tooltipElement.className = isSuccess ? 'success' : '';
  
  const rect = element.getBoundingClientRect();
  tooltipElement.style.left = `${rect.left + rect.width / 2}px`;
  tooltipElement.style.top = `${rect.top - 10}px`;
  tooltipElement.style.transform = 'translate(-50%, -100%)';
  tooltipElement.style.opacity = '1';
}

/**
 * Hide tooltip
 */
function hideTooltip() {
  if (tooltipElement) {
    tooltipElement.style.opacity = '0';
  }
}

/**
 * Check if element should be excluded from code detection
 */
function shouldExcludeElement(element: HTMLElement): boolean {
  const classList = element.className.toLowerCase();
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
}

/**
 * Find all code elements on the page
 */
function findCodeElements(): HTMLElement[] {
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

  return filteredElements;
}

/**
 * Handle mouse enter on code element
 */
function handleMouseEnter(this: HTMLElement) {
  if (!isHoverModeActive) return;
  if (this === selectedElement) return;
  this.classList.add('leetvision-code-active-hover');
  showTooltip(this, 'Click to select this code');
}

/**
 * Handle mouse leave on code element
 */
function handleMouseLeave(this: HTMLElement) {
  this.classList.remove('leetvision-code-active-hover');
  hideTooltip();
}

/**
 * Extract Monaco editor code using multiple methods
 */
function extractMonacoCode(element: HTMLElement): string {
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
  
  // Method 4: Extract from view-lines (fallback, may have formatting issues)
  const viewLines = element.querySelector('.view-lines');
  if (viewLines) {
    const lines: string[] = [];
    viewLines.querySelectorAll('.view-line').forEach((line) => {
      lines.push(line.textContent || '');
    });
    return lines.join('\n');
  }
  
  // Final fallback
  return element.textContent || '';
}

/**
 * Detect language from Monaco editor
 */
function detectMonacoLanguage(element: HTMLElement): string {
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
  
  // Check parent wrapper
  const editorWrapper = element.closest('[class*="editor"]');
  const wrapperModeId = editorWrapper?.getAttribute('data-mode-id');
  if (wrapperModeId) return wrapperModeId;
  
  return 'plaintext';
}

/**
 * Handle click on code element
 */
function handleClick(this: HTMLElement, event: MouseEvent) {
  if (!isHoverModeActive) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  // Remove previous selection
  if (selectedElement) {
    selectedElement.classList.remove(LEETVISION_SELECTED_CLASS);
    selectedElement.classList.remove(LEETVISION_HOVER_CLASS);
  }
  
  // Mark as selected
  selectedElement = this;
  this.classList.remove(LEETVISION_HOVER_CLASS);
  this.classList.remove('leetvision-code-active-hover');
  this.classList.add(LEETVISION_SELECTED_CLASS);
  
  // Show success tooltip
  showTooltip(this, '✓ Code selected!', true);
  
  // Extract code content based on element type
  let codeContent = '';
  let language = 'plaintext';
  
  if (this.tagName === 'TEXTAREA' || this.tagName === 'INPUT') {
    // Get value from input/textarea
    const inputElement = this as HTMLInputElement | HTMLTextAreaElement;
    codeContent = inputElement.value;
  } else if (this.classList.contains('monaco-editor') || this.querySelector('.monaco-editor')) {
    // Monaco editor - use specialized extraction
    const monacoEl = this.classList.contains('monaco-editor') ? this : this.querySelector('.monaco-editor') as HTMLElement;
    if (monacoEl) {
      codeContent = extractMonacoCode(monacoEl);
      language = detectMonacoLanguage(monacoEl);
    }
  } else if (this.classList.contains('CodeMirror')) {
    // CodeMirror editor
    const cmElement = this as any;
    if (cmElement.CodeMirror && cmElement.CodeMirror.getValue) {
      codeContent = cmElement.CodeMirror.getValue();
    } else {
      codeContent = this.textContent || '';
    }
  } else if (this.classList.contains('ace_editor')) {
    // ACE editor
    const aceElement = this as any;
    if (aceElement.env && aceElement.env.editor && aceElement.env.editor.getValue) {
      codeContent = aceElement.env.editor.getValue();
    } else {
      codeContent = this.textContent || '';
    }
  } else {
    // Regular code block
    codeContent = this.textContent || '';
  }
  
  // Try to detect language from class names if not already detected
  if (language === 'plaintext') {
    const classNames = this.className;
    const languageMatch = classNames.match(/language-(\w+)|lang-(\w+)/);
    if (languageMatch) {
      language = languageMatch[1] || languageMatch[2];
    }
  }
  
  // Save to chrome.storage.local immediately (popup is likely closed)
  const selectedCode = {
    code: codeContent.trim(),
    language: language,
    source: window.location.href,
    timestamp: Date.now(),
  };
  
  browser.storage.local.set({ leetvision_selected_code: selectedCode }).then(() => {
    console.log('LeetVision: Code saved to storage', { length: codeContent.length, language });
  });
  
  // Also send message in case popup is still open
  browser.runtime.sendMessage({
    type: 'CODE_SELECTED',
    code: codeContent.trim(),
    language: language,
    source: window.location.href,
  }).catch(() => {
    // Popup likely closed, that's fine - we saved to storage
  });
  
  // Hide tooltip after a brief moment
  setTimeout(() => {
    hideTooltip();
  }, 1500);
  
  // Automatically disable hover mode after successful selection
  setTimeout(() => {
    disableHoverMode();
  }, 500); // Small delay to show selection feedback
}

/**
 * Handle ESC key to cancel selection
 */
function handleEscKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && isHoverModeActive) {
    disableHoverMode();
  }
}

/**
 * Add event listeners to code elements
 */
function addEventListeners() {
  codeElements.forEach(element => {
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('click', handleClick);
  });
  
  document.addEventListener('keydown', handleEscKey);
}

/**
 * Enable hover mode
 */
export function enableHoverMode() {
  if (isHoverModeActive) return;
  
  console.log('LeetVision: Enabling hover mode');
  isHoverModeActive = true;
  
  // Inject styles (if not already injected)
  injectStyles();
  
  // Clear previous selection highlight if re-enabling
  if (selectedElement) {
    selectedElement.classList.remove(LEETVISION_SELECTED_CLASS);
    selectedElement = null;
  }
  
  // Find code elements
  codeElements = findCodeElements();
  console.log(`LeetVision: Found ${codeElements.length} code elements`);
  
  // Immediately highlight all code elements
  codeElements.forEach(element => {
    element.classList.add(LEETVISION_HOVER_CLASS);
  });
  
  // Add event listeners
  addEventListeners();
  
  // Send confirmation
  browser.runtime.sendMessage({
    type: 'HOVER_MODE_ENABLED',
    codeElementsFound: codeElements.length,
  }).catch(() => {
    // Popup might be closed, ignore error
  });
}

/**
 * Disable hover mode
 */
export function disableHoverMode() {
  if (!isHoverModeActive) return;
  
  console.log('LeetVision: Disabling hover mode');
  isHoverModeActive = false;
  
  // Remove event listeners but preserve selection
  codeElements.forEach(element => {
    element.removeEventListener('mouseenter', handleMouseEnter);
    element.removeEventListener('mouseleave', handleMouseLeave);
    element.removeEventListener('click', handleClick);
    // Remove hover class from non-selected elements
    if (element !== selectedElement) {
      element.classList.remove(LEETVISION_HOVER_CLASS);
      element.classList.remove('leetvision-code-active-hover');
    }
  });
  
  document.removeEventListener('keydown', handleEscKey);
  
  // Hide and clean up tooltip
  hideTooltip();
  
  // Keep styles injected so selection remains visible
  // Keep selectedElement reference for persistence
  
  // Clear arrays
  codeElements = [];
  
  // Send confirmation
  browser.runtime.sendMessage({
    type: 'HOVER_MODE_DISABLED',
  }).catch(() => {
    // Popup might be closed, ignore error
  });
}

/**
 * Check if hover mode is active
 */
export function isHoverActive(): boolean {
  return isHoverModeActive;
}


