import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { AuthForm } from '@/components/feature/AuthForm';

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({}),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/firebase/clientApp', () => ({ auth: {}, initError: null }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe('AuthForm validation', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('shows schema errors and does not authenticate invalid credentials', async () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    const form = screen.getByRole('button', { name: 'Login' }).closest('form');
    if (!form) throw new Error('Login form is missing');
    fireEvent.submit(form);

    expect(await screen.findByText('Invalid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 6 characters.')).toBeInTheDocument();
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('passes validated credentials to Firebase', async () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'reader@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'valid-password' } });
    const form = screen.getByRole('button', { name: 'Login' }).closest('form');
    if (!form) throw new Error('Login form is missing');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        'reader@example.com',
        'valid-password'
      );
    });
  });
});
