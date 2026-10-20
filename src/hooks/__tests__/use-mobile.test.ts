import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useIsMobile } from '../use-mobile';

afterEach(() => vi.unstubAllGlobals());

it('reads the current viewport and updates when it crosses the mobile breakpoint', () => {
  vi.stubGlobal('innerWidth', 1200);
  const { result } = renderHook(useIsMobile);
  expect(result.current).toBe(false);
  act(() => {
    vi.stubGlobal('innerWidth', 390);
    window.dispatchEvent(new Event('resize'));
  });
  expect(result.current).toBe(true);
  act(() => {
    vi.stubGlobal('innerWidth', 1200);
    window.dispatchEvent(new Event('resize'));
  });
  expect(result.current).toBe(false);
});
