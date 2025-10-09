import browser from 'webextension-polyfill';
import { detectCodeSections, hashCode } from '../utils/codeDetection';

console.log('LeetVision content script loaded');

// Listen for messages from popup or background script
browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
  if (message.type === 'SCAN_CODE') {
    const codeSections = detectCodeSections();
    sendResponse({ success: true, codeSections });
  }

  if (message.type === 'GET_CODE_HASH') {
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
  }

  if (message.type === 'HIGHLIGHT_CODE') {
    // TODO: Implement highlighting by re-detecting the element
    sendResponse({ success: true });
  }

  if (message.type === 'REMOVE_HIGHLIGHT') {
    // TODO: Implement removing highlights
    sendResponse({ success: true });
  }

  // Return true to indicate we'll send a response asynchronously
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

