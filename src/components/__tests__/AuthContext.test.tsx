import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const mocks = vi.hoisted(() => ({
  valid: true,
  auth: {} as object | null,
  onAuthStateChanged: vi.fn(),
  unsubscribe: vi.fn(),
  push: vi.fn(),
  pathname: '/auth',
}));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: mocks.onAuthStateChanged }));
vi.mock('@/lib/firebase/clientApp', () => ({
  get auth() {
    return mocks.auth;
  },
  get firebaseConfigValid() {
    return mocks.valid;
  },
  initError: null,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => mocks.pathname,
}));

function Status() {
  const { user } = useAuth();
  return <p>{user?.uid || 'Signed out'}</p>;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.valid = true;
  mocks.auth = {};
  mocks.pathname = '/auth';
  mocks.onAuthStateChanged.mockReturnValue(mocks.unsubscribe);
});

it('waits for auth, redirects a signed-in user, and unsubscribes on unmount', () => {
  const { unmount } = render(
    <AuthProvider>
      <Status />
    </AuthProvider>
  );
  expect(screen.getByText('Initializing authentication...')).toBeInTheDocument();
  act(() => mocks.onAuthStateChanged.mock.calls[0][1]({ uid: 'reader' }));
  expect(screen.getByText('reader')).toBeInTheDocument();
  expect(mocks.push).toHaveBeenCalledWith('/');
  unmount();
  expect(mocks.unsubscribe).toHaveBeenCalledOnce();
});

it('redirects a signed-out user to authentication', () => {
  mocks.pathname = '/';
  render(
    <AuthProvider>
      <Status />
    </AuthProvider>
  );
  act(() => mocks.onAuthStateChanged.mock.calls[0][1](null));
  expect(screen.getByText('Signed out')).toBeInTheDocument();
  expect(mocks.push).toHaveBeenCalledWith('/auth');
});

it('shows configuration errors without registering a listener', () => {
  mocks.valid = false;
  mocks.auth = null;
  render(
    <AuthProvider>
      <Status />
    </AuthProvider>
  );
  expect(screen.getByText('Authentication Unavailable')).toBeInTheDocument();
  expect(mocks.onAuthStateChanged).not.toHaveBeenCalled();
});

it('shows auth listener errors without redirecting', () => {
  render(
    <AuthProvider>
      <Status />
    </AuthProvider>
  );
  act(() => mocks.onAuthStateChanged.mock.calls[0][2](new Error('connection failed')));
  expect(screen.getByText(/Auth listener error: connection failed/)).toBeInTheDocument();
  expect(mocks.push).not.toHaveBeenCalled();
});
