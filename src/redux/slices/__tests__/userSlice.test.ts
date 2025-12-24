import { describe, it, expect } from 'vitest';
import userReducer, { setUser, setPreferences, logout } from '../userSlice';

describe('userSlice', () => {
  const initialState = {
    isAuthenticated: false,
    user: null,
    preferences: {
      theme: 'light' as const,
      responseLength: 2,
      selectedMode: 'explain' as const,
      displayMode: 'floating' as const
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any, // using cast for any extra props not strictly in mocked/minimal type if needed
    loading: false,
    error: null,
  };

  it('should handle initial state', () => {
    expect(userReducer(undefined, { type: 'unknown' })).toEqual(expect.objectContaining({
      isAuthenticated: false,
      user: null,
      preferences: {
        theme: 'dark',
        displayMode: 'floating',
        selectedMode: 'learn',
        responseLength: 1,
      },
    }));
  });

  it('should handle setUser', () => {
    const user = {
      uid: '123',
      email: 'test@example.com',
      displayName: 'Test User',
    };
    const actual = userReducer(initialState, setUser(user));
    expect(actual.isAuthenticated).toBe(true);
    expect(actual.user).toEqual(user);
  });

  it('should handle setUser with null (logout)', () => {
    const loggedInState = {
      ...initialState,
      isAuthenticated: true,
      user: { uid: '123', email: 'test@example.com', displayName: 'Test' },
    };
    const actual = userReducer(loggedInState, setUser(null));
    expect(actual.isAuthenticated).toBe(false);
    expect(actual.user).toBeNull();
  });

  it('should handle setPreferences', () => {
    const prefs = {
      theme: 'dark' as const,
      responseLength: 1, // must be number
      selectedMode: 'explain' as const,
      codeContextEnabled: false,
      displayMode: 'sidebar' as const
    };
    const actual = userReducer(initialState, setPreferences(prefs));
    expect(actual.preferences).toEqual(prefs);
  });

  it('should handle logout', () => {
    const loggedInState = {
      ...initialState,
      isAuthenticated: true,
      user: { uid: '123', email: 'test@example.com', displayName: 'Test' },
    };
    const actual = userReducer(loggedInState, logout());
    expect(actual.isAuthenticated).toBe(false);
    expect(actual.user).toBeNull();
  });
});
