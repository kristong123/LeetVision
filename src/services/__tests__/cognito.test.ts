import { vi, describe, it, expect, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import * as cognitoService from '../cognito';
import browser from 'webextension-polyfill';

// Mock webextension-polyfill locally
vi.mock('webextension-polyfill', () => {
  const getURL = vi.fn().mockReturnValue('chrome-extension://mock-id/oauth-callback.html');
  const addListener = vi.fn();
  const removeListener = vi.fn();
  const create = vi.fn().mockResolvedValue({ id: 123 });
  const remove = vi.fn().mockResolvedValue(undefined);
  const query = vi.fn().mockResolvedValue([]);
  const sendMessage = vi.fn();

  const get = vi.fn().mockResolvedValue({});
  const set = vi.fn().mockResolvedValue(undefined);
  const removeStorage = vi.fn().mockResolvedValue(undefined);

  return {
    default: {
      runtime: {
        sendMessage,
        getURL,
        onMessage: { addListener, removeListener },
      },
      storage: {
        local: {
          get,
          set,
          remove: removeStorage,
        },
        onChanged: {
          addListener,
          removeListener,
        },
      },
      tabs: {
        create,
        remove,
        query,
      },
    },
  };
});

describe('Cognito Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signInWithGoogle', () => {
    it('should generate correct OAuth URL with prompt=select_account', async () => {
      // Setup spies on the mocked methods
      const createSpy = browser.tabs.create;
      
      // Ensure storage set succeeds
      (browser.storage.local.set as any).mockResolvedValue(undefined);

      // Verify auth URL generation
      cognitoService.signInWithGoogle();
      
      // Wait for async operations (storage.set) to complete
      await waitFor(() => {
        expect(browser.tabs.create).toHaveBeenCalledTimes(1);
      });
      
      const callArgs = (createSpy as any).mock.calls[0][0];
      const authUrl = callArgs.url;
      
      console.log('OAuth URL (should redirect to Google):', authUrl);
      
      // Basic checks
      expect(authUrl).toContain('https://us-east-2hpx0kaxqh.auth.us-east-2.amazoncognito.com/oauth2/authorize');
      expect(authUrl).toContain('client_id=jjt69oab9uo8bkmjqtmkoc2os');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('scope=openid%20email%20profile');
      expect(authUrl).toContain('redirect_uri=' + encodeURIComponent('chrome-extension://mock-id/oauth-callback.html'));
      expect(authUrl).toContain('identity_provider=Google');
      // Verify prompt param
      expect(authUrl).toContain('prompt=select_account');
    });

    it('should set oauth_pending state', async () => {
      // Mock storage.local.set to succeed
      (browser.storage.local.set as any).mockResolvedValue(undefined);
      
      cognitoService.signInWithGoogle();
      
      // Force cleanup to avoid timeout
      // Simulate listener call if addListener was called
      await waitFor(() => {
        expect(browser.storage.onChanged.addListener).toHaveBeenCalled();
      });
      
      // Trigger listener manually to resolve the promise if needed, 
      // or just check that set was called.
      expect(browser.storage.local.set).toHaveBeenCalledWith({ oauth_pending: true });
    });
  });

  describe('handlePendingOAuth', () => {
    it('should return null if no pending state', async () => {
      (browser.storage.local.get as any).mockResolvedValue({});
      const result = await cognitoService.handlePendingOAuth();
      expect(result).toBeNull();
    });

    it('should throw error if oauth_result contains error', async () => {
      (browser.storage.local.get as any).mockResolvedValue({
        oauth_pending: true,
        oauth_result: { error: 'Access denied' }
      });

      await expect(cognitoService.handlePendingOAuth()).rejects.toThrow('Access denied');
      
      // Should clean up storage
      expect(browser.storage.local.remove).toHaveBeenCalledWith(['oauth_pending', 'oauth_result']);
    });
  });
});
