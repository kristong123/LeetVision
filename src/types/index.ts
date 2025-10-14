export type Mode = 'learn' | 'explain' | 'improve';

export type DisplayMode = 'floating' | 'sidebar';

export type Theme = 'light' | 'dark';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CodeSection {
  id: string;
  content: string;
  language?: string;
  startLine?: number;
  endLine?: number;
}

export interface UserPreferences {
  theme: Theme;
  displayMode: DisplayMode;
  selectedMode: Mode;
  responseLength: number; // 1-5 sentences
  geminiApiKey?: string;
}

export interface AppState {
  mode: Mode;
  responseLength: number;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  codeSections: CodeSection[];
  selectedCodeSection: string | null;
  lastCodeHash: string | null;
  hoverModeActive: boolean;
}

export interface UserState {
  isAuthenticated: boolean;
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null;
  preferences: UserPreferences;
}

