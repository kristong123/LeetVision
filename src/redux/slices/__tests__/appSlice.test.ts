import { describe, it, expect } from 'vitest';
import appReducer, {
  setMode,
  setResponseLength,
  addMessage,
  clearMessages,
  setLoading,
  setError,
} from '../appSlice';
import { AppState } from '../../../types';

describe('appSlice', () => {
  const initialState: AppState = {
    mode: 'learn',
    responseLength: 1,
    messages: [],
    isLoading: false,
    error: null,
    codeSections: [],
    selectedCodeSection: null,
    lastCodeHash: null,
    hoverModeActive: false,
  };

  it('should handle initial state', () => {
    expect(appReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setMode', () => {
    const actual = appReducer(initialState, setMode('explain'));
    expect(actual.mode).toEqual('explain');
  });

  it('should handle setResponseLength', () => {
    const actual = appReducer(initialState, setResponseLength(3));
    expect(actual.responseLength).toEqual(3);
  });

  it('should handle addMessage', () => {
    const message = {
      id: '1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: 1234567890,
    };
    const actual = appReducer(initialState, addMessage(message));
    expect(actual.messages).toHaveLength(1);
    expect(actual.messages[0]).toEqual(message);
  });

  it('should handle clearMessages', () => {
    const stateWithMessages = {
      ...initialState,
      messages: [
        {
          id: '1',
          role: 'user' as const,
          content: 'Hello',
          timestamp: 1234567890,
        },
      ],
    };
    const actual = appReducer(stateWithMessages, clearMessages());
    expect(actual.messages).toHaveLength(0);
  });

  it('should handle setLoading', () => {
    const actual = appReducer(initialState, setLoading(true));
    expect(actual.isLoading).toBe(true);
  });

  it('should handle setError', () => {
    const actual = appReducer(initialState, setError('Something went wrong'));
    expect(actual.error).toEqual('Something went wrong');
  });
});
