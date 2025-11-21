import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errorHandler, ErrorCategory, handleComponentError } from '../error-handler';

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle authentication errors', () => {
      const error = new Error('auth/invalid-credential');

      const result = errorHandler.handleError(error, {
        category: ErrorCategory.AUTHENTICATION,
      });

      expect(result).toEqual({
        title: 'Login Failed',
        message: 'Invalid email or password. Please check your credentials and try again.',
        actionable:
          "Verify your email and password, or try signing up if you don't have an account.",
        category: ErrorCategory.AUTHENTICATION,
        shouldReport: false,
      });
    });

    it('should handle email already in use error', () => {
      const error = new Error('auth/email-already-in-use');

      const result = errorHandler.handleError(error, {
        category: ErrorCategory.AUTHENTICATION,
      });

      expect(result).toEqual({
        title: 'Account Exists',
        message: 'An account with this email address already exists.',
        actionable: 'Try logging in instead, or use a different email address.',
        category: ErrorCategory.AUTHENTICATION,
        shouldReport: false,
      });
    });

    it('should handle AI initialization errors', () => {
      const error = new Error('AI is not initialized');

      const result = errorHandler.handleError(error, {
        category: ErrorCategory.AI,
      });

      expect(result).toEqual({
        title: 'AI Service Unavailable',
        message: 'AI features are currently unavailable.',
        actionable: 'AI features like summarization and quiz generation are temporarily disabled.',
        category: ErrorCategory.AI,
        shouldReport: true,
      });
    });

    it('should handle rate limit errors', () => {
      const error = new Error('rate limit exceeded');

      const result = errorHandler.handleError(error, {
        category: ErrorCategory.AI,
      });

      expect(result).toEqual({
        title: 'Request Limit Reached',
        message: 'Too many requests. Please wait a moment and try again.',
        category: ErrorCategory.AI,
        shouldReport: false,
      });
    });

    it('should handle network errors', () => {
      const error = new Error('fetch failed');

      const result = errorHandler.handleError(error, {
        category: ErrorCategory.NETWORK,
      });

      expect(result).toEqual({
        title: 'Connection Error',
        message: 'Unable to connect to our services.',
        actionable: 'Check your internet connection and try again.',
        category: ErrorCategory.NETWORK,
        shouldReport: false,
      });
    });

    it('should handle validation errors', () => {
      const error = new Error('Invalid input for validation');

      const result = errorHandler.handleError(error, {
        category: ErrorCategory.VALIDATION,
      });

      expect(result).toEqual({
        title: 'Invalid Input',
        message: 'Please check your input and try again.',
        actionable: 'Make sure all required fields are filled correctly.',
        category: ErrorCategory.VALIDATION,
        shouldReport: false,
      });
    });

    it('should handle unknown errors', () => {
      const error = new Error('Something unexpected happened');

      const result = errorHandler.handleError(error, {
        category: ErrorCategory.UNKNOWN,
      });

      expect(result).toEqual({
        title: 'Something went wrong',
        message:
          'An unexpected error occurred. Please try again or contact support if the problem persists.',
        category: ErrorCategory.UNKNOWN,
        shouldReport: true,
      });
    });

    it('should auto-detect error categories', () => {
      const authError = new Error('auth/user-not-found');

      const result = errorHandler.handleError(authError);

      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.title).toBe('Authentication Error');
    });

    it('should handle non-Error objects', () => {
      const error = 'String error message';

      const result = errorHandler.handleError(error, {
        category: ErrorCategory.UNKNOWN,
      });

      expect(result).toEqual({
        title: 'Something went wrong',
        message:
          'An unexpected error occurred. Please try again or contact support if the problem persists.',
        category: ErrorCategory.UNKNOWN,
        shouldReport: true,
      });
    });
  });

  describe('handleComponentError', () => {
    it('should include component name in context', () => {
      const error = new Error('Test error');

      const result = handleComponentError(error, 'TestComponent', {
        action: 'test_action',
      });

      expect(result.category).toBe(ErrorCategory.UNKNOWN);
      expect(result.shouldReport).toBe(true);
    });
  });

  describe('error pattern detection', () => {
    it('should detect auth errors from message content', () => {
      const error = new Error('User authentication failed: auth/invalid-credential');

      const result = errorHandler.handleError(error);

      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('should detect AI errors from message content', () => {
      const error = new Error('Failed to generate summary: API key not valid');

      const result = errorHandler.handleError(error);

      expect(result.category).toBe(ErrorCategory.AI);
    });

    it('should detect network errors from message content', () => {
      const error = new Error('Request failed: ECONNREFUSED');

      const result = errorHandler.handleError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK);
    });

    it('should detect validation errors from message content', () => {
      const error = new Error('Invalid input for validation');

      const result = errorHandler.handleError(error);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
    });
  });
});
