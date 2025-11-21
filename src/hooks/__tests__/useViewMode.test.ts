import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useViewMode } from '../useViewMode';

// Mock logger
vi.mock('@/lib/logger', () => ({
  createComponentLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
  })),
}));

describe('useViewMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with library view mode', () => {
    const { result } = renderHook(() => useViewMode());

    expect(result.current.viewMode).toBe('library');
    expect(result.current.isLibraryView).toBe(true);
    expect(result.current.isReaderView).toBe(false);
  });

  it('should navigate to library view', () => {
    const { result } = renderHook(() => useViewMode());

    act(() => {
      result.current.setViewMode('reader');
    });

    expect(result.current.isReaderView).toBe(true);

    act(() => {
      result.current.goToLibrary();
    });

    expect(result.current.viewMode).toBe('library');
    expect(result.current.isLibraryView).toBe(true);
    expect(result.current.isReaderView).toBe(false);
  });

  it('should navigate to reader view', () => {
    const { result } = renderHook(() => useViewMode());

    const mockBook = {
      id: 'book-1',
      title: 'Test Book',
    };

    act(() => {
      result.current.goToReader(mockBook as any);
    });

    expect(result.current.viewMode).toBe('reader');
    expect(result.current.isLibraryView).toBe(false);
    expect(result.current.isReaderView).toBe(true);
  });

  it('should toggle between views', () => {
    const { result } = renderHook(() => useViewMode());

    // Initially in library view
    expect(result.current.isLibraryView).toBe(true);

    const mockBook = {
      id: 'book-1',
      title: 'Test Book',
    };

    // Toggle to reader view
    act(() => {
      result.current.toggleView(mockBook as any);
    });

    expect(result.current.isReaderView).toBe(true);

    // Toggle back to library view
    act(() => {
      result.current.toggleView();
    });

    expect(result.current.isLibraryView).toBe(true);
  });

  it('should set view mode directly', () => {
    const { result } = renderHook(() => useViewMode());

    act(() => {
      result.current.setViewMode('reader');
    });

    expect(result.current.viewMode).toBe('reader');
    expect(result.current.isReaderView).toBe(true);
  });

  it('should handle navigation with and without books', () => {
    const { result } = renderHook(() => useViewMode());

    // Navigate to reader without book
    act(() => {
      result.current.goToReader();
    });

    expect(result.current.isReaderView).toBe(true);

    // Navigate to reader with book
    const mockBook = {
      id: 'book-2',
      title: 'Another Book',
    };

    act(() => {
      result.current.goToReader(mockBook as any);
    });

    expect(result.current.isReaderView).toBe(true);
  });

  it('should provide correct state computed properties', () => {
    const { result } = renderHook(() => useViewMode());

    // Library view
    expect(result.current.isLibraryView).toBe(true);
    expect(result.current.isReaderView).toBe(false);

    act(() => {
      result.current.setViewMode('reader');
    });

    // Reader view
    expect(result.current.isLibraryView).toBe(false);
    expect(result.current.isReaderView).toBe(true);
  });
});
