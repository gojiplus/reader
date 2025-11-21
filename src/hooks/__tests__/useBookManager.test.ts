import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBookManager } from '../useBookManager';

// Mock all dependencies statically to avoid memory leaks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/firebase/clientApp', () => ({
  db: null,
  storage: null,
}));

vi.mock('firebase/firestore', () => ({}));
vi.mock('firebase/storage', () => ({}));

describe.skip('useBookManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable and callable', () => {
    expect(() => {
      renderHook(() => useBookManager());
    }).not.toThrow();
  });

  it.skip('should provide expected interface', () => {
    const { result } = renderHook(() => useBookManager());

    // Check that the hook returns expected properties
    expect(result.current).toHaveProperty('books');
    expect(result.current).toHaveProperty('booksLoading');
    expect(result.current).toHaveProperty('selectedBook');
    expect(result.current).toHaveProperty('setSelectedBook');
    expect(result.current).toHaveProperty('audioState');
    expect(result.current).toHaveProperty('setAudioState');
    expect(result.current).toHaveProperty('textExtractionState');
    expect(result.current).toHaveProperty('setTextExtractionState');
    expect(result.current).toHaveProperty('handleBookUpload');
    expect(result.current).toHaveProperty('handleDeleteBook');

    // Check initial values
    expect(Array.isArray(result.current.books)).toBe(true);
    expect(typeof result.current.booksLoading).toBe('boolean');
    expect(result.current.selectedBook).toBe(null);
    expect(typeof result.current.audioState).toBe('object');
    expect(typeof result.current.textExtractionState).toBe('object');
    expect(typeof result.current.handleBookUpload).toBe('function');
    expect(typeof result.current.handleDeleteBook).toBe('function');
  });
});
