import browser from 'webextension-polyfill';

// State variables
let isHoverModeActive = false;
let codeElements: HTMLElement[] = [];
let selectedElement: HTMLElement | null = null;
let tooltipElement: HTMLDivElement | null = null;
let overlayElement: HTMLDivElement | null = null;
let highlightBoxes: Map<HTMLElement, HTMLDivElement> = new Map();
let selectedBox: HTMLDivElement | null = null;
let updatePositionsOnResize: (() => void) | null = null;
let selectionIndicator: HTMLDivElement | null = null;

/**
 * Create and show tooltip
 */
function showTooltip(box: HTMLDivElement, text: string, isSuccess: boolean = false) {
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
      transition: opacity 0.15s ease;
    `;
    document.body.appendChild(tooltipElement);
  }
  
  tooltipElement.textContent = text;
  tooltipElement.style.background = isSuccess ? '#059669' : '#2563eb';
  
  const rect = box.getBoundingClientRect();
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
 * Create overlay element
 */
function createOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.id = 'leetvision-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 2147483647;
  `;
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * Create selection indicator
 */
function createSelectionIndicator(): HTMLDivElement {
  const indicator = document.createElement('div');
  indicator.id = 'leetvision-selection-indicator';
  indicator.textContent = 'Select code';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
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
    transition: all 0.2s ease;
    user-select: none;
  `;
  
  // Add hover effect
  indicator.addEventListener('mouseenter', () => {
    indicator.textContent = 'Cancel';
    indicator.style.background = '#dc2626';
    indicator.style.transform = 'translateX(-50%) scale(1.05)';
  });
  
  indicator.addEventListener('mouseleave', () => {
    indicator.textContent = 'Select code';
    indicator.style.background = '#2563eb';
    indicator.style.transform = 'translateX(-50%) scale(1)';
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
 * Remove selection indicator
 */
function removeSelectionIndicator() {
  if (selectionIndicator) {
    selectionIndicator.remove();
    selectionIndicator = null;
  }
}

/**
 * Clip a rect to the viewport bounds
 */
function clipToViewport(rect: DOMRect): DOMRect {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate clipped bounds
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(viewportWidth, rect.right);
  const bottom = Math.min(viewportHeight, rect.bottom);
  
  // If the element is completely off-screen, return a minimal rect
  if (right <= left || bottom <= top) {
    return new DOMRect(0, 0, 0, 0);
  }
  
  return new DOMRect(
    left,
    top,
    right - left,
    bottom - top
  );
}

/**
 * Get the best bounding rect for a code element
 * For Monaco editors, target the actual code viewport
 */
function getCodeElementRect(element: HTMLElement): DOMRect {
  let rect: DOMRect;
  
  // For Monaco editor, try to find the scrollable content area
  if (element.classList.contains('monaco-editor')) {
    // Try overflow-guard first (this is the visible viewport container)
    const overflowGuard = element.querySelector('.overflow-guard');
    if (overflowGuard) {
      rect = overflowGuard.getBoundingClientRect();
      return clipToViewport(rect);
    }
    
    // Try the editor's parent container with explicit dimensions
    const parent = element.parentElement;
    if (parent && parent.offsetHeight > 0 && parent.offsetWidth > 0) {
      rect = parent.getBoundingClientRect();
      return clipToViewport(rect);
    }
    
    // Try view-lines (actual code lines)
    const viewLines = element.querySelector('.view-lines');
    if (viewLines) {
      rect = viewLines.getBoundingClientRect();
      return clipToViewport(rect);
    }
    
    // Try lines-content as fallback
    const linesContent = element.querySelector('.lines-content');
    if (linesContent) {
      rect = linesContent.getBoundingClientRect();
      return clipToViewport(rect);
    }
    
    // Try scrollable-element as last resort
    const scrollableElement = element.querySelector('.monaco-scrollable-element');
    if (scrollableElement) {
      rect = scrollableElement.getBoundingClientRect();
      return clipToViewport(rect);
    }
  }
  
  // For CodeMirror, try to find the actual code area
  if (element.classList.contains('CodeMirror')) {
    const lines = element.querySelector('.CodeMirror-lines');
    if (lines) {
      rect = lines.getBoundingClientRect();
      return clipToViewport(rect);
    }
  }
  
  // Default: use element's own rect, clipped to viewport
  rect = element.getBoundingClientRect();
  return clipToViewport(rect);
}

/**
 * Create highlight box for a code element
 */
function createHighlightBox(element: HTMLElement): HTMLDivElement {
  const rect = getCodeElementRect(element);
  const box = document.createElement('div');
  
  box.style.cssText = `
    position: absolute;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    outline: 3px solid #2563eb;
    background: rgba(37, 99, 235, 0.03);
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
    transition: none;
    pointer-events: auto;
    cursor: pointer;
  `;
  
  // Store reference to original element
  (box as any)._codeElement = element;
  
  // Add event listeners to box
  box.addEventListener('mouseenter', handleBoxMouseEnter);
  box.addEventListener('mouseleave', handleBoxMouseLeave);
  box.addEventListener('click', handleBoxClick);
  
  return box;
}

/**
 * Update positions of all highlight boxes
 */
function updatePositions() {
  // Update all highlight boxes
  highlightBoxes.forEach((box, element) => {
    const rect = getCodeElementRect(element);
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  });
  
  // Also update the selected box if it exists
  if (selectedBox && selectedElement) {
    const rect = getCodeElementRect(selectedElement);
    selectedBox.style.left = `${rect.left}px`;
    selectedBox.style.top = `${rect.top}px`;
    selectedBox.style.width = `${rect.width}px`;
    selectedBox.style.height = `${rect.height}px`;
  }
}

/**
 * Debounce helper
 */
function debounce(func: () => void, wait: number): () => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction() {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(), wait);
  };
}

/**
 * Handle mouse enter on highlight box
 */
function handleBoxMouseEnter(this: HTMLDivElement) {
  if (!isHoverModeActive) return;
  if (this === selectedBox) return;
  
  // Active hover style
  this.style.outline = '4px solid #2563eb';
  this.style.background = 'rgba(37, 99, 235, 0.05)';
  this.style.boxShadow = '0 0 0 6px rgba(37, 99, 235, 0.25)';
  
  showTooltip(this, 'Click to select this code');
}

/**
 * Handle mouse leave on highlight box
 */
function handleBoxMouseLeave(this: HTMLDivElement) {
  if (this === selectedBox) return;
  
  // Reset to default hover style
  this.style.outline = '3px solid #2563eb';
  this.style.background = 'rgba(37, 99, 235, 0.03)';
  this.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.15)';
  
  hideTooltip();
}

/**
 * Handle click on highlight box
 */
function handleBoxClick(this: HTMLDivElement, event: MouseEvent) {
  if (!isHoverModeActive) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  // Get the original code element
  const element = (this as any)._codeElement as HTMLElement;
  if (!element) return;
  
  // Remove previous selection completely
  if (selectedBox) {
    selectedBox.remove();
    selectedBox = null;
    selectedElement = null;
  }
  
  // Mark as selected
  selectedElement = element;
  selectedBox = this;
  
  // Apply selected styling
  this.style.outline = '3px solid #059669';
  this.style.background = 'rgba(5, 150, 105, 0.03)';
  this.style.boxShadow = '0 0 0 4px rgba(5, 150, 105, 0.15)';
  
  // Show success tooltip
  showTooltip(this, '✓ Code selected!', true);
  
  // Extract code content based on element type
  let codeContent = '';
  let language = 'plaintext';
  
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    // Get value from input/textarea
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
    codeContent = inputElement.value;
  } else if (element.classList.contains('monaco-editor') || element.querySelector('.monaco-editor')) {
    // Monaco editor - use specialized extraction
    const monacoEl = element.classList.contains('monaco-editor') ? element : element.querySelector('.monaco-editor') as HTMLElement;
    if (monacoEl) {
      codeContent = extractMonacoCode(monacoEl);
      language = detectMonacoLanguage(monacoEl);
    }
  } else if (element.classList.contains('CodeMirror')) {
    // CodeMirror editor
    const cmElement = element as any;
    if (cmElement.CodeMirror && cmElement.CodeMirror.getValue) {
      codeContent = cmElement.CodeMirror.getValue();
    } else {
      codeContent = element.textContent || '';
    }
  } else if (element.classList.contains('ace_editor')) {
    // ACE editor
    const aceElement = element as any;
    if (aceElement.env && aceElement.env.editor && aceElement.env.editor.getValue) {
      codeContent = aceElement.env.editor.getValue();
    } else {
      codeContent = element.textContent || '';
    }
  } else {
    // Regular code block
    codeContent = element.textContent || '';
  }
  
  // Try to detect language from class names if not already detected
  if (language === 'plaintext') {
    const classNames = element.className;
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
  
  // If there's already a selected code, preserve it but still show other options
  if (selectedBox && selectedElement) {
    // Create overlay if it doesn't exist
    if (!overlayElement) {
      overlayElement = createOverlay();
    }
    
    // Update the selected box to show "Currently selected" state
    selectedBox.style.outline = '3px solid #059669';
    selectedBox.style.background = 'rgba(5, 150, 105, 0.03)';
    selectedBox.style.boxShadow = '0 0 0 4px rgba(5, 150, 105, 0.15)';
    selectedBox.style.pointerEvents = 'none'; // Make it non-interactive
    
    // Show tooltip
    showTooltip(selectedBox, 'Currently selected', true);
    
    // Add scroll listener to keep it positioned
    window.addEventListener('scroll', updatePositions, true);
    
    // Continue with normal hover mode to show other options
    // Don't return early - we want to show other code elements too
  } else {
    // No existing selection - clean up any previous selection
    if (selectedBox) {
      selectedBox.remove();
      selectedBox = null;
      selectedElement = null;
    }
    
    // If overlay exists from previous selection, remove it
    if (overlayElement && overlayElement.parentNode) {
      overlayElement.remove();
      overlayElement = null;
    }
    
    // Create fresh overlay
    overlayElement = createOverlay();
  }
  
  // Create selection indicator
  if (!selectionIndicator) {
    selectionIndicator = createSelectionIndicator();
  }
  
  // Find code elements
  codeElements = findCodeElements();
  console.log(`LeetVision: Found ${codeElements.length} code elements`);
  
  // Create highlight boxes for each code element (excluding already selected)
  highlightBoxes.clear();
  codeElements.forEach(element => {
    // Skip if this is the already selected element
    if (element === selectedElement) {
      return;
    }
    
    const box = createHighlightBox(element);
    highlightBoxes.set(element, box);
    overlayElement!.appendChild(box);
  });
  
  // Create debounced resize handler (only resize is debounced)
  updatePositionsOnResize = debounce(updatePositions, 100);
  
  // Add scroll and resize listeners
  // Scroll updates immediately for smooth tracking, resize is debounced
  window.addEventListener('scroll', updatePositions, true); // Capture phase, immediate
  window.addEventListener('resize', updatePositionsOnResize);
  
  // Add ESC key listener
  document.addEventListener('keydown', handleEscKey);
  
  // Send confirmation
  browser.runtime.sendMessage({
    type: 'HOVER_MODE_ENABLED',
    codeElementsFound: codeElements.length,
    hasExistingSelection: !!(selectedBox && selectedElement),
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
  
  // If code was selected, keep only the selected box visible
  if (selectedBox && overlayElement) {
    // Remove all boxes except selected
    highlightBoxes.forEach((box) => {
      if (box !== selectedBox) {
        box.removeEventListener('mouseenter', handleBoxMouseEnter);
        box.removeEventListener('mouseleave', handleBoxMouseLeave);
        box.removeEventListener('click', handleBoxClick);
        box.remove();
      }
    });
    
    // Keep selected box but make it non-interactive
    selectedBox.style.pointerEvents = 'none';
    
    // Keep scroll listener active to track selected box position
    // Scroll listener stays active, resize listener removed
    if (updatePositionsOnResize) {
      window.removeEventListener('resize', updatePositionsOnResize);
      updatePositionsOnResize = null;
    }
    
    // DON'T remove the overlay - keep it for the selected highlight
    console.log('LeetVision: Keeping selected highlight visible');
  } else {
    // No selection, remove all listeners
    window.removeEventListener('scroll', updatePositions, true);
    if (updatePositionsOnResize) {
      window.removeEventListener('resize', updatePositionsOnResize);
      updatePositionsOnResize = null;
    }
    
    // Remove overlay completely only if no selection
    if (overlayElement) {
      overlayElement.remove();
      overlayElement = null;
    }
  }
  
  // Clear highlight boxes map (except selected)
  if (selectedBox && selectedElement) {
    const tempBox = selectedBox;
    const tempElement = selectedElement;
    highlightBoxes.clear();
    highlightBoxes.set(tempElement, tempBox);
  } else {
    highlightBoxes.clear();
  }
  
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
 * Check if hover mode is active
 */
export function isHoverActive(): boolean {
  return isHoverModeActive;
}
