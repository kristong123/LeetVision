import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SetPassword from '../SetPassword';
import * as cognitoService from '../../services/cognito';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../../redux/slices/userSlice';

// Helper to render with Redux
const renderWithRedux = (component: React.ReactElement) => {
  const store = configureStore({
    reducer: {
      user: userReducer,
    },
    preloadedState: {
      user: {
        isAuthenticated: true,
        user: { email: 'test@example.com', uid: '123', displayName: null },
        preferences: {
          theme: 'light',
          responseLength: 1,
          selectedMode: 'learn',
          displayMode: 'floating'
        },
        loading: false,
        error: null,
      } as any,
    },
  });
  return render(<Provider store={store}>{component}</Provider>);
};

// Mock the services
vi.mock('../../services/cognito', () => ({
  setPasswordForUser: vi.fn(),
  getIdToken: vi.fn(),
}));

describe('SetPassword Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  it('should render password inputs', () => {
    renderWithRedux(<SetPassword onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('should validate matching passwords', async () => {
    renderWithRedux(<SetPassword onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const newPass = screen.getByLabelText('New Password');
    const confirmPass = screen.getByLabelText('Confirm Password');
    const submitBtn = screen.getByRole('button', { name: /set password/i });

    fireEvent.change(newPass, { target: { value: 'password123' } });
    fireEvent.change(confirmPass, { target: { value: 'password456' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(cognitoService.setPasswordForUser).not.toHaveBeenCalled();
  });

  it('should call setPasswordForUser on success', async () => {
    (cognitoService.setPasswordForUser as any).mockResolvedValue(undefined);
    (cognitoService.getIdToken as any).mockResolvedValue('mock-token');

    renderWithRedux(<SetPassword onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Fill form
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });

    // Click submit
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => {
      expect(cognitoService.setPasswordForUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        expect.anything() // ID token retrieved internally
      );
    });
  });
});
