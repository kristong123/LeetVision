import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../../redux/slices/userSlice';

const renderWithRedux = (
  component: React.ReactElement,
  { initialState } = { initialState: {} }
) => {
  const store = configureStore({
    reducer: {
      user: userReducer,
    },
    preloadedState: {
      user: {
        isAuthenticated: false,
        user: null,
        preferences: {
          theme: 'system',
          responseLength: 'medium',
          selectedMode: 'hint',
          codeContextEnabled: true,
          displayMode: 'popup'
        },
        loading: false,
        error: null,
        ...initialState,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    },
  });
  return render(<Provider store={store}>{component}</Provider>);
};

describe('Header Component', () => {
  it('should render correct title', () => {
    renderWithRedux(<Header onSettingsClick={() => { }} onAuthClick={() => { }} />);
    expect(screen.getByText('LeetVision')).toBeInTheDocument();
  });

  describe('Profile Icon', () => {
    it('should show default user icon when not authenticated', () => {
      renderWithRedux(<Header onSettingsClick={() => { }} onAuthClick={() => { }} />);
      // User icon is an SVG, usually referenced by class or role if added
      // Lucide icons render as SVGs. We can check if a button exists.
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // Logic: If there is no text content 'K' or similar, it's likely the icon
      expect(button).not.toHaveTextContent(/[A-Z]/);
    });

    it('should show display name initial when authenticated with name', () => {
      renderWithRedux(<Header onSettingsClick={() => { }} onAuthClick={() => { }} />, {
        initialState: {
          isAuthenticated: true,
          user: { displayName: 'Kristong', email: 'test@example.com' },
        },
      });
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('K');
    });

    it('should show email initial when authenticated without name', () => {
      renderWithRedux(<Header onSettingsClick={() => { }} onAuthClick={() => { }} />, {
        initialState: {
          isAuthenticated: true,
          user: { displayName: null, email: 'amazon@example.com' },
        },
      });
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('A');
    });

    it('should show ? fallback when no name or email', () => {
      renderWithRedux(<Header onSettingsClick={() => { }} onAuthClick={() => { }} />, {
        initialState: {
          isAuthenticated: true,
          user: { displayName: null, email: null },
        },
      });
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('?');
    });
  });

  describe('Dropdown', () => {
    it('should toggle dropdown on click', () => {
      renderWithRedux(<Header onSettingsClick={() => { }} onAuthClick={() => { }} />);
      const button = screen.getByRole('button');

      // Initially closed
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();

      // Open
      fireEvent.click(button);
      expect(screen.getByText('Settings')).toBeInTheDocument();

      // Close
      fireEvent.click(button);
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });
});
