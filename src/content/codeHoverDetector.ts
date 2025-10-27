import browser from 'webextension-polyfill';

// State variables
let isHoverModeActive = false;
let codeElements: HTMLElement[] = [];
let selectedElement: HTMLElement | null = null;
let tooltipElement: HTMLDivElement | null = null;
let selectionIndicator: HTMLDivElement | null = null;
let originalStyles: Map<HTMLElement, string> = new Map();

/**
 * Create and show tooltip
 */
function showTooltip(element: HTMLElement, text: string, isSuccess: boolean = false) {
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.id = 'leetvision-tooltip';
    tooltipElement.style.cssText = `
      position: fixed;
      background: ${isSuccess ? '#059669' : '#2563eb'};
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      white-space: nowrap;
      z-index: 2147483647;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transform: translate(-50%, -100%) scale(0.9);
      transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    document.body.appendChild(tooltipElement);
  }
  
  tooltipElement.textContent = text;
  tooltipElement.style.background = isSuccess ? '#059669' : '#2563eb';
  
  const rect = element.getBoundingClientRect();
  tooltipElement.style.left = `${rect.left + rect.width / 2}px`;
  tooltipElement.style.top = `${rect.top - 10}px`;
  
  // Trigger transition with a slight delay to ensure smooth animation
  requestAnimationFrame(() => {
    if (tooltipElement) {
      tooltipElement.style.opacity = '1';
      tooltipElement.style.transform = 'translate(-50%, -100%) scale(1)';
    }
  });
}

/**
 * Hide tooltip with smooth transition
 */
function hideTooltip() {
  if (tooltipElement) {
    tooltipElement.style.opacity = '0';
    tooltipElement.style.transform = 'translate(-50%, -100%) scale(0.9)';
    
    // Remove tooltip after transition completes
    setTimeout(() => {
      if (tooltipElement) {
        tooltipElement.remove();
        tooltipElement = null;
      }
    }, 250); // Match transition duration
  }
}

/**
 * Apply highlight styles directly to code element
 */
function applyHighlightStyles(element: HTMLElement, isSelected: boolean = false) {
  // Store original styles if not already stored
  if (!originalStyles.has(element)) {
    originalStyles.set(element, element.style.cssText);
  }
  
  const color = isSelected ? '#059669' : '#2563eb';
  const color80 = isSelected ? 'rgba(5, 150, 105, 0.8)' : 'rgba(37, 99, 235, 0.8)';
  const color60 = isSelected ? 'rgba(5, 150, 105, 0.6)' : 'rgba(37, 99, 235, 0.6)';
  const color40 = isSelected ? 'rgba(5, 150, 105, 0.4)' : 'rgba(37, 99, 235, 0.4)';
  const color20 = isSelected ? 'rgba(5, 150, 105, 0.2)' : 'rgba(37, 99, 235, 0.2)';

  element.style.cssText += `
    text-shadow: 
      0 0 0 ${color},
      -1px -1px 0 ${color80}, 1px -1px 0 ${color80}, -1px 1px 0 ${color80}, 1px 1px 0 ${color80},
      -2px -2px 2px ${color60}, 2px -2px 2px ${color60}, -2px 2px 2px ${color60}, 2px 2px 2px ${color60},
      -3px -3px 4px ${color40}, 3px -3px 4px ${color40}, -3px 3px 4px ${color40}, 3px 3px 4px ${color40},
      -4px -4px 6px ${color20}, 4px -4px 6px ${color20}, -4px 4px 6px ${color20}, 4px 4px 6px ${color20} !important;
    transition: background 0.2s ease, box-shadow 0.2s ease, text-shadow 0.2s ease !important;
    cursor: pointer !important;
    position: relative !important;
    z-index: 999999 !important;
  `;
}

/**
   * Remove highlight styles from code element with transition
 */
function removeHighlightStyles(element: HTMLElement) {
  // For Monaco editors, clean up Monaco container
  if (element.classList.contains('monaco-editor') || element.querySelector('.monaco-editor')) {
    const monacoContainer = element.classList.contains('monaco-editor') 
      ? element 
      : element.querySelector('.monaco-editor') as HTMLElement;
    
    if (monacoContainer) {
      // First, transition to default values
      monacoContainer.style.outline = 'none';
      monacoContainer.style.outlineOffset = '0px';
      monacoContainer.style.background = 'transparent';
      monacoContainer.style.boxShadow = 'none';
      monacoContainer.style.textShadow = 'none';
      monacoContainer.style.cursor = 'default';
      monacoContainer.style.position = '';
      monacoContainer.style.zIndex = '';
      
      // After transition completes, restore original styles
      setTimeout(() => {
        const monacoOriginalStyle = originalStyles.get(monacoContainer);
        if (monacoOriginalStyle !== undefined) {
          monacoContainer.style.cssText = monacoOriginalStyle;
          originalStyles.delete(monacoContainer);
        } else {
          // Fallback: remove our specific styles
          monacoContainer.style.outline = '';
          monacoContainer.style.outlineOffset = '';
          monacoContainer.style.background = '';
          monacoContainer.style.boxShadow = '';
          monacoContainer.style.textShadow = '';
          monacoContainer.style.cursor = '';
          monacoContainer.style.position = '';
          monacoContainer.style.zIndex = '';
        }
      }, 250); // Match the transition duration
    }
  } else {
    // For non-Monaco elements, clean up with transition
    // First, transition to default values
    element.style.outline = 'none';
    element.style.outlineOffset = '0px';
    element.style.background = 'transparent';
    element.style.boxShadow = 'none';
    element.style.textShadow = 'none';
    element.style.cursor = 'default';
    element.style.position = '';
    element.style.zIndex = '';
    
    // After transition completes, restore original styles
    setTimeout(() => {
      const originalStyle = originalStyles.get(element);
      if (originalStyle !== undefined) {
        element.style.cssText = originalStyle;
        originalStyles.delete(element);
      } else {
        // Fallback: remove our specific styles
        element.style.outline = '';
        element.style.outlineOffset = '';
        element.style.background = '';
        element.style.boxShadow = '';
        element.style.textShadow = '';
        element.style.cursor = '';
        element.style.position = '';
        element.style.zIndex = '';
      }
    }, 250); // Match the transition duration
  }
}

/**
 * Create selection indicator
 */
function createSelectionIndicator(): HTMLDivElement {
  const indicator = document.createElement('div');
  indicator.id = 'leetvision-selection-indicator';
  
  // Create the main container
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-10px) scale(0.9);
    background: #2563eb;
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 500;
    z-index: 2147483648;
    pointer-events: auto;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    opacity: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  // Create text span
  const textSpan = document.createElement('span');
  textSpan.textContent = 'Select';
  textSpan.id = 'leetvision-indicator-text';
  
  // Create X icon SVG
  const xIcon = document.createElement('div');
  xIcon.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6L6 18"/>
      <path d="M6 6l12 12"/>
    </svg>
  `;
  xIcon.id = 'leetvision-indicator-icon';
  xIcon.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  `;
  
  // Append elements
  indicator.appendChild(textSpan);
  indicator.appendChild(xIcon);
  
  // Animate in after creation
  requestAnimationFrame(() => {
    indicator.style.transform = 'translateX(-50%) translateY(0) scale(1)';
    indicator.style.opacity = '1';
  });
  
  // Add hover effect
  indicator.addEventListener('mouseenter', () => {
    const textElement = indicator.querySelector('#leetvision-indicator-text') as HTMLElement;
    const iconElement = indicator.querySelector('#leetvision-indicator-icon') as HTMLElement;
    
    if (textElement) textElement.textContent = 'Cancel';
    if (iconElement) iconElement.style.opacity = '1';
    
    indicator.style.background = '#dc2626';
    indicator.style.transform = 'translateX(-50%) translateY(0) scale(1.05)';
  });
  
  indicator.addEventListener('mouseleave', () => {
    const textElement = indicator.querySelector('#leetvision-indicator-text') as HTMLElement;
    const iconElement = indicator.querySelector('#leetvision-indicator-icon') as HTMLElement;
    
    if (textElement) textElement.textContent = 'Select';
    if (iconElement) iconElement.style.opacity = '0.7';
    
    indicator.style.background = '#2563eb';
    indicator.style.transform = 'translateX(-50%) translateY(0) scale(1)';
  });
  
  // Add click handler to cancel selection
  indicator.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    disableHoverMode();
  });
  
  document.body.appendChild(indicator);
  return indicator;
}

/**
 * Remove selection indicator with smooth exit animation
 */
function removeSelectionIndicator() {
  if (selectionIndicator) {
    // Animate out
    selectionIndicator.style.transform = 'translateX(-50%) translateY(-10px) scale(0.9)';
    selectionIndicator.style.opacity = '0';
    
    // Remove after animation completes
    setTimeout(() => {
      if (selectionIndicator) {
        selectionIndicator.remove();
        selectionIndicator = null;
      }
    }, 300); // Match transition duration
  }
}

/**
 * Handle mouse enter on code element
 */
function handleElementMouseEnter(this: HTMLElement) {
  if (!isHoverModeActive) return;
  if (this === selectedElement) return;
  
  // Apply hover styles
  applyHighlightStyles(this, false);
  showTooltip(this, 'Click to select this code');
}

/**
 * Handle mouse leave on code element
 */
function handleElementMouseLeave(this: HTMLElement) {
  if (this === selectedElement) return;
  
  // Don't remove highlight styles - keep them visible
  // Just hide the tooltip
  hideTooltip();
}

/**
 * Handle click on code element
 */
function handleElementClick(this: HTMLElement, event: MouseEvent) {
  if (!isHoverModeActive) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  // Remove previous selection completely
  if (selectedElement && selectedElement !== this) {
    // Remove event listeners from old selection
    selectedElement.removeEventListener('mouseenter', handleElementMouseEnter);
    selectedElement.removeEventListener('mouseleave', handleElementMouseLeave);
    selectedElement.removeEventListener('click', handleElementClick);
    // Remove highlight from old selection
    removeHighlightStyles(selectedElement);
  }
  
  // Set new selected element
  selectedElement = this;
  
  // Remove event listeners from this element to make it unclickable
  this.removeEventListener('mouseenter', handleElementMouseEnter);
  this.removeEventListener('mouseleave', handleElementMouseLeave);
  this.removeEventListener('click', handleElementClick);
  
  // Apply selected styling to this element
  applyHighlightStyles(this, true);
  
  // Auto-hide green highlight after 1 second (but keep selectedElement reference)
  setTimeout(() => {
    if (selectedElement === this) {
      removeHighlightStyles(this);
      console.log('LeetVision: Auto-hiding selected element after 1 second');
    }
  }, 1000);
  
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
    const classNames = typeof this.className === 'string' 
      ? this.className 
      : String(this.className || '');
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
 * Check if element should be excluded from code detection
 */
function shouldExcludeElement(element: HTMLElement): boolean {
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
}

/**
 * Find all code elements on the page
 */
function findCodeElements(): HTMLElement[] {
  const codeSelectors = [
    'pre code',  // More specific: only code inside pre
    'code:not(pre code)',  // Code elements that are NOT inside pre
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
    // NeetCode specific selectors
    '[class*="neetcode"]',
    '[class*="NeetCode"]',
    // Monaco editor specific selectors (more comprehensive)
    '.monaco-editor .view-lines',
    '.monaco-editor .overflow-guard',
    '.monaco-editor .monaco-scrollable-element',
    '[class*="monaco"]',
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
      // For Monaco editor elements (more comprehensive detection)
      else if (element.classList.contains('monaco-editor') || 
               element.classList.contains('overflow-guard') ||
               element.classList.contains('monaco-scrollable-element') ||
               element.classList.contains('view-lines') ||
               element.closest('.monaco-editor')) {
        // Find the main Monaco editor container
        const monacoContainer = element.classList.contains('monaco-editor') 
          ? element 
          : element.closest('.monaco-editor') as HTMLElement;
        if (monacoContainer) {
          elements.add(monacoContainer);
        }
      }
      // For CodeMirror editors
      else if (element.classList.contains('CodeMirror')) {
        elements.add(element);
      }
      // For ACE editors
      else if (element.classList.contains('ace_editor')) {
        elements.add(element);
      }
      // For regular code blocks
      else if (element.textContent && element.textContent.trim().length > 20) {
        elements.add(element);
      }
    });
  });

  // Additional Monaco editor detection - look for elements with Monaco-related attributes
  document.querySelectorAll('[data-mode-id], [data-editor-id], [data-uri]').forEach(el => {
    const element = el as HTMLElement;
    if (!shouldExcludeElement(element) && element.offsetWidth > 0 && element.offsetHeight > 0) {
      // Check if this looks like a Monaco editor
      const className = typeof element.className === 'string' ? element.className : String(element.className || '');
      const hasMonacoClasses = className.includes('monaco') || 
                              element.closest('.monaco-editor') ||
                              element.querySelector('.monaco-editor');
      if (hasMonacoClasses) {
        const monacoContainer = element.closest('.monaco-editor') as HTMLElement || element;
        elements.add(monacoContainer);
      }
    }
  });

  // Aggressive Monaco editor detection - look for any element that might be a code editor
  // This is a fallback for cases where Monaco isn't detected by the above methods
  const allDivs = document.querySelectorAll('div');
  allDivs.forEach(el => {
    const element = el as HTMLElement;
    if (!shouldExcludeElement(element) && element.offsetWidth > 200 && element.offsetHeight > 100) {
      // Check if this div looks like a code editor
      const className = typeof element.className === 'string' ? element.className : String(element.className || '');
      const classNameLower = className.toLowerCase();
      const hasEditorIndicators = classNameLower.includes('editor') || 
                                 classNameLower.includes('code') ||
                                 classNameLower.includes('monaco') ||
                                 element.querySelector('.monaco-editor') ||
                                 element.querySelector('.CodeMirror') ||
                                 element.querySelector('.ace_editor') ||
                                 element.querySelector('[data-mode-id]') ||
                                 element.querySelector('[data-editor-id]');
      
      if (hasEditorIndicators) {
        // Find the actual editor container
        const editorContainer = element.querySelector('.monaco-editor') as HTMLElement ||
                               element.querySelector('.CodeMirror') as HTMLElement ||
                               element.querySelector('.ace_editor') as HTMLElement ||
                               element;
        elements.add(editorContainer);
      }
    }
  });

  // Filter out parent elements if their children are already in the set
  // This prevents double-highlighting of both parent and child elements
  const filteredElements = Array.from(elements).filter(element => {
    // Check if any other element in the set is a child of this element
    const hasChildInSet = Array.from(elements).some(otherElement => {
      return otherElement !== element && element.contains(otherElement);
    });
    
    // Only filter out if this element has a child in the set (prefer children over parents)
    // Don't filter out if this element is a child of another - let the parent filtering handle that
    return !hasChildInSet;
  });

  return filteredElements;
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
 * Handle ESC key to cancel selection
 */
function handleEscKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && isHoverModeActive) {
    disableHoverMode();
  }
}

/**
 * Enable hover mode
 */
export function enableHoverMode() {
  if (isHoverModeActive) return;
  
  console.log('LeetVision: Enabling hover mode');
  isHoverModeActive = true;
  
  // If there's already selected code, preserve it but still show other options
  if (selectedElement) {
    // Update selected element to show "Currently selected" state
    applyHighlightStyles(selectedElement, true);
    console.log('LeetVision: Showing previously selected element');
    
    // Continue with normal hover mode to show other options
    // Don't return early - we want to show other code elements too
  }
  
  // Create selection indicator
  if (!selectionIndicator) {
    selectionIndicator = createSelectionIndicator();
  }
  
  // Find code elements
  codeElements = findCodeElements();
  console.log(`LeetVision: Found ${codeElements.length} code elements`);
  console.log(`LeetVision: Previously selected elements: ${selectedElement ? 1 : 0}`);
  
  // Show previously selected element with green highlight (no event listeners)
  if (selectedElement) {
    console.log('LeetVision: Applying green highlight to previously selected element');
    applyHighlightStyles(selectedElement, true);
    console.log('LeetVision: Showing previously selected element');
  }
  
  // Apply highlight styles and add event listeners to each code element (excluding already selected)
  codeElements.forEach(element => {
    // Skip if this element is already selected
    if (element === selectedElement) {
      return;
    }
    
    // Apply blue highlight styles
    applyHighlightStyles(element, false);
    
    // Add event listeners for new selections
    element.addEventListener('mouseenter', handleElementMouseEnter);
    element.addEventListener('mouseleave', handleElementMouseLeave);
    element.addEventListener('click', handleElementClick);
  });
  
  // Add ESC key listener
  document.addEventListener('keydown', handleEscKey);
  
  // Send confirmation
  browser.runtime.sendMessage({
    type: 'HOVER_MODE_ENABLED',
    codeElementsFound: codeElements.length,
    hasExistingSelection: !!selectedElement,
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
  
  // Remove ESC key listener
  document.removeEventListener('keydown', handleEscKey);
  
  // Hide tooltip
  hideTooltip();
  
  // Remove selection indicator
  removeSelectionIndicator();
  
  // Remove all listeners and styles when disabling hover mode
  codeElements.forEach(element => {
    element.removeEventListener('mouseenter', handleElementMouseEnter);
    element.removeEventListener('mouseleave', handleElementMouseLeave);
    element.removeEventListener('click', handleElementClick);
    
    // Only remove highlight styles if this element is NOT selected
    if (element !== selectedElement) {
      removeHighlightStyles(element);
    }
  });
  
  // Don't hide selected elements here - they will be handled by show/hide messages
  // The selected elements should remain visible when popup is open
  
  // Clear code elements array
  codeElements = [];
  
  // Send confirmation
  browser.runtime.sendMessage({
    type: 'HOVER_MODE_DISABLED',
  }).catch(() => {
    // Popup might be closed, ignore error
  });
}

/**
 * Clear all selected elements and their highlights
 */
export function clearSelectedElement() {
  if (selectedElement) {
    removeHighlightStyles(selectedElement);
    selectedElement = null;
    console.log('LeetVision: Cleared selected element');
  }
}

/**
 * Show all selected element highlights (when popup is open)
 */
export function showSelectedElement() {
  if (selectedElement) {
    applyHighlightStyles(selectedElement, true);
    console.log('LeetVision: Showing selected element');
  }
}

/**
 * Hide all selected element highlights (when popup is closed)
 */
export function hideSelectedElement() {
  if (selectedElement) {
    removeHighlightStyles(selectedElement);
    console.log('LeetVision: Hiding selected element');
  }
}

/**
 * Check if hover mode is active
 */
export function isHoverActive(): boolean {
  return isHoverModeActive;
}