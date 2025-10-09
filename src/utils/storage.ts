import browser from 'webextension-polyfill';
import { UserPreferences } from '../types';

const STORAGE_KEYS = {
  PREFERENCES: 'userPreferences',
  LAST_CODE_HASH: 'lastCodeHash',
  GEMINI_API_KEY: 'geminiApiKey',
};

export const savePreferences = async (
  preferences: Partial<UserPreferences>
): Promise<void> => {
  try {
    const current = await getPreferences();
    await browser.storage.local.set({
      [STORAGE_KEYS.PREFERENCES]: { ...current, ...preferences },
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
};

export const getPreferences = async (): Promise<UserPreferences> => {
  try {
    const result = await browser.storage.local.get(STORAGE_KEYS.PREFERENCES);
    const prefs = result[STORAGE_KEYS.PREFERENCES];
    if (prefs && typeof prefs === 'object') {
      return prefs as UserPreferences;
    }
    return {
      theme: 'light',
      displayMode: 'floating',
      selectedMode: 'learn',
      responseLength: 3,
    };
  } catch (error) {
    console.error('Error getting preferences:', error);
    return {
      theme: 'light',
      displayMode: 'floating',
      selectedMode: 'learn',
      responseLength: 3,
    };
  }
};

export const saveLastCodeHash = async (hash: string): Promise<void> => {
  try {
    await browser.storage.local.set({ [STORAGE_KEYS.LAST_CODE_HASH]: hash });
  } catch (error) {
    console.error('Error saving code hash:', error);
  }
};

export const getLastCodeHash = async (): Promise<string | null> => {
  try {
    const result = await browser.storage.local.get(STORAGE_KEYS.LAST_CODE_HASH);
    const hash = result[STORAGE_KEYS.LAST_CODE_HASH];
    return typeof hash === 'string' ? hash : null;
  } catch (error) {
    console.error('Error getting code hash:', error);
    return null;
  }
};

export const saveGeminiApiKey = async (apiKey: string): Promise<void> => {
  try {
    await browser.storage.local.set({ [STORAGE_KEYS.GEMINI_API_KEY]: apiKey });
  } catch (error) {
    console.error('Error saving API key:', error);
  }
};

export const getGeminiApiKey = async (): Promise<string | null> => {
  try {
    const result = await browser.storage.local.get(STORAGE_KEYS.GEMINI_API_KEY);
    const apiKey = result[STORAGE_KEYS.GEMINI_API_KEY];
    return typeof apiKey === 'string' ? apiKey : (import.meta.env.VITE_GEMINI_API_KEY || null);
  } catch (error) {
    console.error('Error getting API key:', error);
    return import.meta.env.VITE_GEMINI_API_KEY || null;
  }
};

