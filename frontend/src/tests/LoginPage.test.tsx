import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import * as AuthContextModule from '../contexts/AuthContext';

describe('LoginPage Component', () => {
  it('should render login form with demo accounts', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Welcome to SyncBoard')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('alice@syncboard.dev')).toBeInTheDocument();
    expect(screen.getByText('Alice (Owner)')).toBeInTheDocument();
    expect(screen.getByText('Bob (Admin)')).toBeInTheDocument();
  });

  it('should fill demo credentials when clicking quick demo button', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const demoButton = screen.getByText('Alice (Owner)');
    fireEvent.click(demoButton);

    const emailInput = screen.getByPlaceholderText('alice@syncboard.dev') as HTMLInputElement;
    await waitFor(() => {
      expect(emailInput.value).toBe('alice@syncboard.dev');
    });
  });
});

