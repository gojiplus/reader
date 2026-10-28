import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Firebase
vi.mock('@/lib/firebase/clientApp', () => ({
  auth: null,
  db: null,
  storage: null,
  firebaseConfigValid: false,
  initError: null,
}));

// Mock environment variables
for (const [name, value] of Object.entries({
  NODE_ENV: 'test',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'test-app-id',
})) {
  vi.stubEnv(name, value);
}

// Mock window object for client-side tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// biome-ignore lint/complexity/useArrowFunction: Observer mocks must support construction with new.
global.IntersectionObserver = vi.fn().mockImplementation(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
});

// biome-ignore lint/complexity/useArrowFunction: Observer mocks must support construction with new.
global.ResizeObserver = vi.fn().mockImplementation(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
});
