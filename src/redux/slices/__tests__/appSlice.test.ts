import { describe, it, expect } from 'vitest';
import appReducer, { 
  setMode, 
  setResponseLength, 
  setCodeSections, 
  setSelectedCodeSection,
  setHoverModeActive
} from '../appSlice';

describe('appSlice', () => {
  const initialState = {
    mode: 'explain' as const,
    responseLength: 2,
    codeSections: [],
    selectedCodeSection: null,
    hoverModeActive: false,
    messages: [],
    isLoading: false,
    error: null,
    lastCodeHash: null
  };

  it('should handle initial state', () => {

    expect(appReducer(undefined, { type: 'unknown' })).toEqual(expect.objectContaining({
      mode: 'learn',
      responseLength: 1,
    }));
  });

  it('should handle setMode', () => {
    const actual = appReducer(initialState, setMode('improve'));
    expect(actual.mode).toBe('improve');
  });

  it('should handle setResponseLength', () => {
    const actual = appReducer(initialState, setResponseLength(3));
    expect(actual.responseLength).toBe(3);
  });

  it('should handle setSelectedCode', () => {
    const codeData = {
      id: '123',
      content: 'console.log("hello")',
      language: 'javascript',
    };
    // setCodeSections sets the array
    const stateWithSections = appReducer(initialState, setCodeSections([codeData]));
    expect(stateWithSections.codeSections).toHaveLength(1);
    expect(stateWithSections.codeSections[0]).toEqual(codeData);
    
    // setSelectedCodeSection selects it
    const actual = appReducer(stateWithSections, setSelectedCodeSection('123'));
    expect(actual.selectedCodeSection).toBe('123');
  });

  it('should handle clearSelectedCode', () => {
    const stateWithCode = {
      ...initialState,
      selectedCodeSection: '123',
    };
    const actual = appReducer(stateWithCode, setSelectedCodeSection(null));
    expect(actual.selectedCodeSection).toBeNull();
  });

  it('should handle toggleHoverMode', () => {
    const actual = appReducer(initialState, setHoverModeActive(true));
    expect(actual.hoverModeActive).toBe(true);
    
    const actual2 = appReducer(actual, setHoverModeActive(false));
    expect(actual2.hoverModeActive).toBe(false);
  });
});
