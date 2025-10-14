import browser from 'webextension-polyfill';

const LEETVISION_HOVER_CLASS = 'leetvision-code-hover';
const LEETVISION_SELECTED_CLASS = 'leetvision-code-selected';

let isHoverModeActive = false;
let codeElements: HTMLElement[] = [];
let selectedElement: HTMLElement | null = null;
let styleElement: HTMLStyleElement | null = null;

/**
 * Inject CSS styles for hover effects
 */
function injectStyles() {
  if (styleElement) return;

  styleElement = document.createElement('style');
  styleElement.textContent = `
    .${LEETVISION_HOVER_CLASS} {
      outline: 2px solid #2563eb !important;
      outline-offset: 2px !important;
      cursor: pointer !important;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
      transition: all 0.2s ease !important;
      position: relative !important;
    }
    
    .${LEETVISION_HOVER_CLASS}::before {
      content: "Click to select this code";
      position: absolute;
      top: -30px;
      left: 0;
      background: #2563eb;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      white-space: nowrap;
      z-index: 10000;
      pointer-events: none;
    }
    
    .${LEETVISION_SELECTED_CLASS} {
      outline: 2px solid #059669 !important;
      outline-offset: 2px !important;
      box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.1) !important;
    }
    
    .${LEETVISION_SELECTED_CLASS}::before {
      content: "✓ Selected";
      position: absolute;
      top: -30px;
      left: 0;
      background: #059669;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      white-space: nowrap;
      z-index: 10000;
      pointer-events: none;
    }
  `;
  document.head.appendChild(styleElement);
}

/**
 * Remove injected styles
 */
function removeStyles() {
  if (styleElement && styleElement.parentNode) {
    styleElement.parentNode.removeChild(styleElement);
    styleElement = null;
  }
}

/**
 * Find all code elements on the page
 */
function findCodeElements(): HTMLElement[] {
  const codeSelectors = [
    'pre code',
    'pre',
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
        // Prefer the parent <pre> if this is a <code> inside <pre>
        if (element.tagName === 'CODE' && element.parentElement?.tagName === 'PRE') {
          elements.add(element.parentElement);
        } else {
          elements.add(element);
        }
      }
    });
  });

  return Array.from(elements);
}

/**
 * Handle mouse enter on code element
 */
function handleMouseEnter(this: HTMLElement) {
  if (!isHoverModeActive) return;
  if (this === selectedElement) return;
  this.classList.add(LEETVISION_HOVER_CLASS);
}

/**
 * Handle mouse leave on code element
 */
function handleMouseLeave(this: HTMLElement) {
  this.classList.remove(LEETVISION_HOVER_CLASS);
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
  this.classList.add(LEETVISION_SELECTED_CLASS);
  
  // Extract code content based on element type
  let codeContent = '';
  
  if (this.tagName === 'TEXTAREA' || this.tagName === 'INPUT') {
    // Get value from input/textarea
    const inputElement = this as HTMLInputElement | HTMLTextAreaElement;
    codeContent = inputElement.value;
  } else if (this.classList.contains('monaco-editor')) {
    // Monaco editor - try to get text content from editor
    const editorContent = this.querySelector('.view-lines');
    codeContent = editorContent?.textContent || this.textContent || '';
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
  
  // Try to detect language
  let language = 'plaintext';
  const classNames = this.className;
  const languageMatch = classNames.match(/language-(\w+)|lang-(\w+)/);
  if (languageMatch) {
    language = languageMatch[1] || languageMatch[2];
  }
  
  // Send to extension
  browser.runtime.sendMessage({
    type: 'CODE_SELECTED',
    code: codeContent.trim(),
    language: language,
    source: window.location.href,
  });
  
  console.log('LeetVision: Code selected', { length: codeContent.length, language });
  
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
 * Remove event listeners from code elements
 */
function removeEventListeners() {
  codeElements.forEach(element => {
    element.removeEventListener('mouseenter', handleMouseEnter);
    element.removeEventListener('mouseleave', handleMouseLeave);
    element.removeEventListener('click', handleClick);
    element.classList.remove(LEETVISION_HOVER_CLASS);
    element.classList.remove(LEETVISION_SELECTED_CLASS);
  });
  
  document.removeEventListener('keydown', handleEscKey);
  
  selectedElement = null;
}

/**
 * Enable hover mode
 */
export function enableHoverMode() {
  if (isHoverModeActive) return;
  
  console.log('LeetVision: Enabling hover mode');
  isHoverModeActive = true;
  
  // Inject styles
  injectStyles();
  
  // Find code elements
  codeElements = findCodeElements();
  console.log(`LeetVision: Found ${codeElements.length} code elements`);
  
  // Add event listeners
  addEventListeners();
  
  // Send confirmation
  browser.runtime.sendMessage({
    type: 'HOVER_MODE_ENABLED',
    codeElementsFound: codeElements.length,
  });
}

/**
 * Disable hover mode
 */
export function disableHoverMode() {
  if (!isHoverModeActive) return;
  
  console.log('LeetVision: Disabling hover mode');
  isHoverModeActive = false;
  
  // Remove event listeners
  removeEventListeners();
  
  // Remove styles
  removeStyles();
  
  // Clear arrays
  codeElements = [];
  
  // Send confirmation
  browser.runtime.sendMessage({
    type: 'HOVER_MODE_DISABLED',
  });
}

/**
 * Check if hover mode is active
 */
export function isHoverActive(): boolean {
  return isHoverModeActive;
}

