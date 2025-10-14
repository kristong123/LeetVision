import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppState, Mode, Message, CodeSection } from '../../types';

const initialState: AppState = {
  mode: 'learn',
  responseLength: 3,
  messages: [],
  isLoading: false,
  error: null,
  codeSections: [],
  selectedCodeSection: null,
  lastCodeHash: null,
  hoverModeActive: false,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<Mode>) => {
      state.mode = action.payload;
    },
    setResponseLength: (state, action: PayloadAction<number>) => {
      state.responseLength = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setCodeSections: (state, action: PayloadAction<CodeSection[]>) => {
      state.codeSections = action.payload;
      // Auto-select if only one section
      if (action.payload.length === 1) {
        state.selectedCodeSection = action.payload[0].id;
      }
    },
    setSelectedCodeSection: (state, action: PayloadAction<string | null>) => {
      state.selectedCodeSection = action.payload;
    },
    setLastCodeHash: (state, action: PayloadAction<string | null>) => {
      state.lastCodeHash = action.payload;
    },
    restoreAppState: (_state, action: PayloadAction<AppState>) => {
      return { ...action.payload };
    },
    setHoverModeActive: (state, action: PayloadAction<boolean>) => {
      state.hoverModeActive = action.payload;
    },
  },
});

export const {
  setMode,
  setResponseLength,
  addMessage,
  clearMessages,
  setLoading,
  setError,
  setCodeSections,
  setSelectedCodeSection,
  setLastCodeHash,
  restoreAppState,
  setHoverModeActive,
} = appSlice.actions;

export default appSlice.reducer;

