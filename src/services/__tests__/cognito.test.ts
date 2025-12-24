import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock environment variables before importing cognito
vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-2_mock123');
vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'jjt69oab9uo8bkmjqtmkoc2os');
vi.stubEnv('VITE_COGNITO_DOMAIN', 'https://us-east-2hpx0kaxqh.auth.us-east-2.amazoncognito.com');

import * as cognitoService from '../cognito';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  runtimeSendMessage: vi.fn(),
  getURL: vi.fn().mockReturnValue('chrome-extension://mock-id/oauth-callback.html'),
}));

// Mock webextension-polyfill locally with hoisted mocks
vi.mock('webextension-polyfill', () => {
  return {
    default: {
      runtime: {
        sendMessage: mocks.runtimeSendMessage,
        getURL: mocks.getURL,
        onMessage: { addListener: mocks.addListener, removeListener: mocks.removeListener },
      },
      storage: {
        local: {
          get: mocks.get,
          set: mocks.set,
          remove: mocks.remove,
        },
        onChanged: {
          addListener: mocks.addListener,
          removeListener: mocks.removeListener,
        },
      },
      tabs: {
        create: mocks.create,
        remove: mocks.remove,
        query: vi.fn().mockResolvedValue([]),
      },
    },
  };
});


describe('Cognito Service', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let intervalSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    mocks.create.mockResolvedValue({ id: 123 });
    mocks.set.mockResolvedValue(undefined);
    mocks.get.mockResolvedValue({});
    mocks.remove.mockResolvedValue(undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    intervalSpy = vi.spyOn(global, 'setInterval').mockReturnValue(123 as any);
  });

  afterEach(() => {
    intervalSpy.mockRestore();
  });

  describe('signInWithGoogle', () => {
    it('should set oauth_pending state', async () => {
      // Mock storage.local.set to succeed
      mocks.set.mockResolvedValue(undefined);
      
      cognitoService.signInWithGoogle();
      
      
      expect(mocks.set).toHaveBeenCalledWith({ oauth_pending: true });
    });
  });

  describe('handlePendingOAuth', () => {
    it('should return null if no pending state', async () => {
      mocks.get.mockResolvedValue({});
      const result = await cognitoService.handlePendingOAuth();
      expect(result).toBeNull();
    });

    it('should throw error if oauth_result contains error', async () => {
      mocks.get.mockResolvedValue({
        oauth_pending: true,
        oauth_result: { error: 'Access denied' }
      });

      await expect(cognitoService.handlePendingOAuth()).rejects.toThrow('Access denied');
      
      // Should clean up storage
      expect(mocks.remove).toHaveBeenCalledWith(['oauth_pending', 'oauth_result']);
    });
  });
});
