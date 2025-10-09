import browser from 'webextension-polyfill';

console.log('LeetVision background service worker loaded');

// Handle messages from content scripts and popup
browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
  if (message.type === 'CODE_CHANGED') {
    // Forward code change notification to popup if it's open
    browser.runtime.sendMessage({
      type: 'CODE_CHANGED',
      hash: message.hash,
    }).catch(() => {
      // Popup might not be open, ignore error
    });
  }

  if (message.type === 'GENERATE_RESPONSE') {
    // This is handled by the popup directly calling the Gemini API
    // Background worker could be used for API calls if needed for more complex scenarios
    sendResponse({ success: true });
  }

  return true;
});

// Handle extension icon click
browser.action.onClicked.addListener(() => {
  // This will open the popup (default behavior)
});

// Listen for installation
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('LeetVision installed');
    // Set default preferences
    browser.storage.local.set({
      userPreferences: {
        theme: 'light',
        displayMode: 'floating',
        selectedMode: 'learn',
        responseLength: 3,
      },
    });
  } else if (details.reason === 'update') {
    console.log('LeetVision updated');
  }
});

