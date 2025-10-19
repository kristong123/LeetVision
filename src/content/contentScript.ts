import browser from 'webextension-polyfill';
import { detectCodeSections, hashCode } from '../utils/codeDetection';
import { enableHoverMode, disableHoverMode, isHoverActive } from './codeHoverDetector';

console.log('LeetVision content script loaded');

// Ensure the script is properly initialized
try {
  console.log('LeetVision: Content script initialization started');
} catch (error) {
  console.error('LeetVision: Content script initialization failed:', error);
}

// Listen for messages from popup or background script
browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
  console.log('LeetVision: Received message:', message.type);
  
  // Handle all message types synchronously
  try {
    // Test message to verify content script is working
    if (message.type === 'PING') {
      sendResponse({ success: true, message: 'Content script is working' });
      return true;
    }
    if (message.type === 'SCAN_CODE') {
      const codeSections = detectCodeSections();
      sendResponse({ success: true, codeSections });
    } else if (message.type === 'ENABLE_HOVER_MODE') {
      enableHoverMode();
      sendResponse({ success: true });
    } else if (message.type === 'DISABLE_HOVER_MODE') {
      disableHoverMode();
      sendResponse({ success: true });
    } else if (message.type === 'CHECK_HOVER_MODE') {
      sendResponse({ isActive: isHoverActive() });
    } else if (message.type === 'GET_CODE_HASH') {
      const codeSections = detectCodeSections();
      if (codeSections.length > 0) {
        const selectedSection = codeSections.find(
          (section) => section.id === message.sectionId
        );
        if (selectedSection) {
          const hash = hashCode(selectedSection.content);
          sendResponse({ success: true, hash });
        } else {
          sendResponse({ success: false, error: 'Code section not found' });
        }
      } else {
        sendResponse({ success: false, error: 'No code found' });
      }
    } else if (message.type === 'HIGHLIGHT_CODE') {
      sendResponse({ success: true });
    } else if (message.type === 'REMOVE_HIGHLIGHT') {
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error('Error in content script message handler:', error);
    sendResponse({ success: false, error: String(error) });
  }
  
  // Return true to keep the message channel open for the response
  return true;
});

// Monitor code changes using MutationObserver
let lastCodeHash: string | null = null;
let changeTimeout: ReturnType<typeof setTimeout> | null = null;

const checkCodeChanges = () => {
  const codeSections = detectCodeSections();
  if (codeSections.length > 0) {
    const currentHash = hashCode(
      codeSections.map((s) => s.content).join('')
    );
    if (currentHash !== lastCodeHash) {
      lastCodeHash = currentHash;
      // Notify background script of code change
      browser.runtime.sendMessage({
        type: 'CODE_CHANGED',
        hash: currentHash,
      }).catch(() => {
        // Popup might be closed, ignore error
      });
    }
  }
};

// Debounced change detection
const observer = new MutationObserver(() => {
  if (changeTimeout) {
    clearTimeout(changeTimeout);
  }
  changeTimeout = setTimeout(checkCodeChanges, 1000); // Wait 1 second after last change
});

// Start observing the document
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
});

// Initial check
checkCodeChanges();

// Update navigation timestamp when page loads to detect refreshes
// Only clear selected code if this is a new page navigation
browser.storage.local.get('leetvision_last_navigation').then((result) => {
  const previousTimestamp = result.leetvision_last_navigation as number | undefined;
  const currentTimestamp = Date.now();
  
  // Only clear selected code if this is a new page navigation
  // Check if timestamps differ by more than 1 second (indicating a real navigation)
  if (previousTimestamp && typeof previousTimestamp === 'number' && Math.abs(currentTimestamp - previousTimestamp) > 1000) {
    // Different navigation, clear selected code
    return browser.storage.local.remove('leetvision_selected_code').then(() => {
      // Update navigation timestamp
      return browser.storage.local.set({ 
        leetvision_last_navigation: currentTimestamp 
      });
    });
  }
  
  // Update navigation timestamp for first load or same session
  return browser.storage.local.set({ 
    leetvision_last_navigation: currentTimestamp 
  });
}).catch(() => {
  // Ignore errors
});

