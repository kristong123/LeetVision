import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Mock webextension-polyfill module
vi.mock('webextension-polyfill', () => {
  return {
    default: {
      runtime: {
        sendMessage: vi.fn(),
        getURL: vi.fn().mockReturnValue('chrome-extension://mock-id/oauth-callback.html'),
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
          remove: vi.fn().mockResolvedValue(undefined),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      tabs: {
        create: vi.fn().mockResolvedValue({ id: 123 } as unknown as any),
        query: vi.fn().mockResolvedValue([]),
      },
    }
  };
});

declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var browser: any;
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var chrome: any;
}

// Mock webextension-polyfill
const browserMock = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    create: vi.fn(),
  },
};

// Mock browser global
global.browser = browserMock as unknown as any;

// Mock chrome global (sometimes used as fallback)
global.chrome = browserMock as unknown as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
