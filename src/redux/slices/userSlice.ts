import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserState, UserPreferences } from '../../types';

const initialState: UserState = {
  isAuthenticated: false,
  user: null,
  preferences: {
    theme: 'light',
    displayMode: 'floating',
    selectedMode: 'learn',
    responseLength: 3,
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<{
        uid: string;
        email: string | null;
        displayName: string | null;
      } | null>
    ) => {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
    },
    setPreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setUser, setPreferences, logout } = userSlice.actions;

export default userSlice.reducer;

