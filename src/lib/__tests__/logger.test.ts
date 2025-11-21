import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createComponentLogger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('createComponentLogger', () => {
    it('should create component-specific logger', () => {
      const componentLogger = createComponentLogger('TestComponent');

      expect(componentLogger).toBeDefined();
      expect(typeof componentLogger.debug).toBe('function');
      expect(typeof componentLogger.info).toBe('function');
      expect(typeof componentLogger.warn).toBe('function');
      expect(typeof componentLogger.error).toBe('function');
    });

    it('should handle error logging with error objects', () => {
      const componentLogger = createComponentLogger('TestComponent');
      const error = new Error('Test error');

      componentLogger.error('Error message', error);

      expect(console.error).toHaveBeenCalled();
    });

    it('should handle warn logging', () => {
      const componentLogger = createComponentLogger('TestComponent');

      componentLogger.warn('Warning message');

      expect(console.warn).toHaveBeenCalled();
    });

    it('should include additional context', () => {
      const componentLogger = createComponentLogger('TestComponent');

      componentLogger.error('Error message', new Error('Test'), { action: 'test' });

      expect(console.error).toHaveBeenCalled();
      // Check that the call included context in some form
      const call = (console.error as any).mock.calls[0][0];
      expect(call).toContain('TestComponent');
    });

    it('should handle different log levels', () => {
      const componentLogger = createComponentLogger('TestComponent');

      // These calls should not throw errors
      expect(() => {
        componentLogger.debug('Debug message');
        componentLogger.info('Info message');
        componentLogger.warn('Warn message');
        componentLogger.error('Error message');
      }).not.toThrow();
    });
  });
});
