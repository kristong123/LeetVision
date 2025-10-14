import browser from 'webextension-polyfill';
import { AppState } from '../types';

const STORAGE_KEY_PREFIX = 'leetvision_state_';

interface StoredState {
  url: string;
  state: AppState;
  timestamp: number;
}

/**
 * Generate a storage key from URL (hash the URL to keep it reasonable length)
 */
function getStorageKeyFromUrl(url: string): string {
  // Remove query params and hash for more stable key
  const cleanUrl = url.split('?')[0].split('#')[0];
  return `${STORAGE_KEY_PREFIX}${cleanUrl}`;
}

/**
 * Save app state to chrome.storage.local for the current tab URL
 */
export async function saveState(state: AppState): Promise<void> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;

    const storageKey = getStorageKeyFromUrl(tab.url);
    const storedState: StoredState = {
      url: tab.url,
      state,
      timestamp: Date.now(),
    };

    await browser.storage.local.set({ [storageKey]: storedState });
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

/**
 * Restore app state from chrome.storage.local if URL matches
 */
export async function restoreState(): Promise<AppState | null> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return null;

    const storageKey = getStorageKeyFromUrl(tab.url);
    const result = await browser.storage.local.get(storageKey);
    const storedState = result[storageKey] as StoredState | undefined;

    if (!storedState) return null;

    // Check if state is not too old (24 hours)
    const MAX_AGE = 24 * 60 * 60 * 1000;
    if (Date.now() - storedState.timestamp > MAX_AGE) {
      await browser.storage.local.remove(storageKey);
      return null;
    }

    console.log('LeetVision: Restored state from storage', {
      messageCount: storedState.state.messages.length,
      codeSelected: storedState.state.codeSections.length > 0,
    });

    return storedState.state;
  } catch (error) {
    console.error('Error restoring state:', error);
    return null;
  }
}

/**
 * Clear state for the current tab
 */
export async function clearState(): Promise<void> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;

    const storageKey = getStorageKeyFromUrl(tab.url);
    await browser.storage.local.remove(storageKey);
  } catch (error) {
    console.error('Error clearing state:', error);
  }
}

