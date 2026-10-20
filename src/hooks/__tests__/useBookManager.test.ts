import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useBookManager } from '../useBookManager';

const mocks = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  loading: false,
  toast: vi.fn(),
  onSnapshot: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, loading: mocks.loading }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/firebase/clientApp', () => ({ db: {}, storage: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: mocks.onSnapshot,
  serverTimestamp: vi.fn(),
}));
vi.mock('firebase/storage', () => ({}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
  mocks.loading = false;
  mocks.onSnapshot.mockReturnValue(mocks.unsubscribe);
});

it('finishes loading an empty library when signed out', () => {
  const { result } = renderHook(useBookManager);
  expect(result.current.books).toEqual([]);
  expect(result.current.booksLoading).toBe(false);
  expect(mocks.onSnapshot).not.toHaveBeenCalled();
});

it('keeps one subscription and discards the previous user’s library on account changes', () => {
  mocks.user = { uid: 'first' };
  const { result, rerender, unmount } = renderHook(useBookManager);
  expect(result.current.booksLoading).toBe(true);
  const receiveFirst = mocks.onSnapshot.mock.calls[0][1];
  act(() => receiveFirst({ docs: [{ id: 'book', data: () => ({ title: 'A book' }) }] }));
  expect(result.current.books[0].title).toBe('A book');
  expect(result.current.booksLoading).toBe(false);
  rerender();
  expect(mocks.onSnapshot).toHaveBeenCalledTimes(1);
  mocks.user = { uid: 'second' };
  rerender();
  expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  expect(result.current.books).toEqual([]);
  expect(result.current.booksLoading).toBe(true);
  act(() => receiveFirst({ docs: [{ id: 'stale', data: () => ({ title: 'Stale book' }) }] }));
  expect(result.current.books).toEqual([]);
  act(() => mocks.onSnapshot.mock.calls[1][1]({ docs: [] }));
  expect(result.current.booksLoading).toBe(false);
  unmount();
  expect(mocks.unsubscribe).toHaveBeenCalledTimes(2);
});

it('stops loading and reports a subscription error', () => {
  mocks.user = { uid: 'first' };
  const { result } = renderHook(useBookManager);
  act(() => mocks.onSnapshot.mock.calls[0][2](new Error('permission denied')));
  expect(result.current.booksLoading).toBe(false);
  expect(mocks.toast).toHaveBeenCalledOnce();
});
