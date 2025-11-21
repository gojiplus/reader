/**
 * Centralized error handling utilities for the audiobook reader application
 * Provides consistent error handling patterns and user-friendly error messages
 */

import { logger } from './logger';

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  FIREBASE = 'firebase',
  AI = 'ai',
  FILE_PROCESSING = 'file_processing',
  NETWORK = 'network',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  category: ErrorCategory;
  component?: string;
  userId?: string;
  bookId?: string;
  action?: string;
  originalError?: Error | unknown;
  [key: string]: string | number | boolean | Error | unknown;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  actionable?: string;
  category: ErrorCategory;
  shouldReport: boolean;
}

class ErrorHandler {
  private static instance: ErrorHandler;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Convert any error into a user-friendly error object
   */
  handleError(error: Error | unknown, context: Partial<ErrorContext> = {}): UserFriendlyError {
    const fullContext: ErrorContext = {
      category: ErrorCategory.UNKNOWN,
      originalError: error,
      ...context,
    };

    // Log the error with full context
    logger.error(`Error in ${context.component || 'unknown component'}`, error, fullContext);

    // Convert to user-friendly error
    return this.createUserFriendlyError(error, fullContext);
  }

  /**
   * Create user-friendly error messages based on error type and context
   */
  private createUserFriendlyError(
    error: Error | unknown,
    context: ErrorContext
  ): UserFriendlyError {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Authentication errors
    if (context.category === ErrorCategory.AUTHENTICATION || this.isAuthError(errorMessage)) {
      return this.handleAuthError(errorMessage, context);
    }

    // Firebase errors
    if (context.category === ErrorCategory.FIREBASE || this.isFirebaseError(errorMessage)) {
      return this.handleFirebaseError(errorMessage, context);
    }

    // AI errors
    if (context.category === ErrorCategory.AI || this.isAIError(errorMessage)) {
      return this.handleAIError(errorMessage, context);
    }

    // File processing errors
    if (context.category === ErrorCategory.FILE_PROCESSING || this.isFileError(errorMessage)) {
      return this.handleFileError(errorMessage, context);
    }

    // Network errors
    if (context.category === ErrorCategory.NETWORK || this.isNetworkError(errorMessage)) {
      return this.handleNetworkError(errorMessage, context);
    }

    // Validation errors
    if (context.category === ErrorCategory.VALIDATION || this.isValidationError(errorMessage)) {
      return this.handleValidationError(errorMessage, context);
    }

    // Default unknown error
    return {
      title: 'Something went wrong',
      message:
        'An unexpected error occurred. Please try again or contact support if the problem persists.',
      category: ErrorCategory.UNKNOWN,
      shouldReport: true,
    };
  }

  private isAuthError(message: string): boolean {
    const authPatterns = [
      'auth/invalid-credential',
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/email-already-in-use',
      'auth/weak-password',
      'auth/invalid-email',
      'auth/api-key-not-valid',
      'auth/operation-not-allowed',
    ];
    return authPatterns.some(pattern => message.includes(pattern));
  }

  private isFirebaseError(message: string): boolean {
    return (
      message.includes('Firebase') || message.includes('firestore') || message.includes('auth/')
    );
  }

  private isAIError(message: string): boolean {
    const aiPatterns = [
      'AI is not initialized',
      'API key not valid',
      'rate limit',
      'Billing account not configured',
      'Failed to generate',
    ];
    return aiPatterns.some(pattern => message.includes(pattern));
  }

  private isFileError(message: string): boolean {
    const filePatterns = [
      'Failed to read file',
      'Unsupported file type',
      'File is corrupted',
      'PDF parsing failed',
    ];
    return filePatterns.some(pattern => message.includes(pattern));
  }

  private isNetworkError(message: string): boolean {
    const networkPatterns = ['fetch failed', 'ECONNREFUSED', 'Network error', 'Connection timeout'];
    return networkPatterns.some(pattern => message.includes(pattern));
  }

  private isValidationError(message: string): boolean {
    return message.includes('validation') || message.includes('Invalid input');
  }

  private handleAuthError(message: string, _context: ErrorContext): UserFriendlyError {
    if (message.includes('auth/invalid-credential')) {
      return {
        title: 'Login Failed',
        message: 'Invalid email or password. Please check your credentials and try again.',
        actionable:
          "Verify your email and password, or try signing up if you don't have an account.",
        category: ErrorCategory.AUTHENTICATION,
        shouldReport: false,
      };
    }

    if (message.includes('auth/email-already-in-use')) {
      return {
        title: 'Account Exists',
        message: 'An account with this email address already exists.',
        actionable: 'Try logging in instead, or use a different email address.',
        category: ErrorCategory.AUTHENTICATION,
        shouldReport: false,
      };
    }

    return {
      title: 'Authentication Error',
      message: 'Unable to authenticate. Please try again.',
      actionable: 'Check your internet connection and try again.',
      category: ErrorCategory.AUTHENTICATION,
      shouldReport: true,
    };
  }

  private handleFirebaseError(_message: string, _context: ErrorContext): UserFriendlyError {
    return {
      title: 'Service Unavailable',
      message: 'Our services are temporarily unavailable.',
      actionable: 'Please try again in a moment.',
      category: ErrorCategory.FIREBASE,
      shouldReport: true,
    };
  }

  private handleAIError(message: string, _context: ErrorContext): UserFriendlyError {
    if (message.includes('AI is not initialized')) {
      return {
        title: 'AI Service Unavailable',
        message: 'AI features are currently unavailable.',
        actionable: 'AI features like summarization and quiz generation are temporarily disabled.',
        category: ErrorCategory.AI,
        shouldReport: true,
      };
    }

    if (message.includes('rate limit')) {
      return {
        title: 'Request Limit Reached',
        message: 'Too many requests. Please wait a moment and try again.',
        category: ErrorCategory.AI,
        shouldReport: false,
      };
    }

    return {
      title: 'AI Service Error',
      message: 'Unable to process your request using AI.',
      actionable: 'Try again or continue without AI features.',
      category: ErrorCategory.AI,
      shouldReport: true,
    };
  }

  private handleFileError(_message: string, _context: ErrorContext): UserFriendlyError {
    return {
      title: 'File Processing Error',
      message: 'Unable to process the selected file.',
      actionable: 'Try a different file or check that the file is not corrupted.',
      category: ErrorCategory.FILE_PROCESSING,
      shouldReport: false,
    };
  }

  private handleNetworkError(_message: string, _context: ErrorContext): UserFriendlyError {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to our services.',
      actionable: 'Check your internet connection and try again.',
      category: ErrorCategory.NETWORK,
      shouldReport: false,
    };
  }

  private handleValidationError(_message: string, _context: ErrorContext): UserFriendlyError {
    return {
      title: 'Invalid Input',
      message: 'Please check your input and try again.',
      actionable: 'Make sure all required fields are filled correctly.',
      category: ErrorCategory.VALIDATION,
      shouldReport: false,
    };
  }
}

// Export singleton instance and helper functions
export const errorHandler = ErrorHandler.getInstance();

/**
 * Helper function for components to handle errors consistently
 */
export const handleComponentError = (
  error: Error | unknown,
  component: string,
  context: Partial<ErrorContext> = {}
): UserFriendlyError => {
  return errorHandler.handleError(error, { component, ...context });
};

/**
 * Hook for React components to get standardized error handling
 */
export const useErrorHandler = (componentName: string) => ({
  handleError: (error: Error | unknown, context: Partial<ErrorContext> = {}) =>
    handleComponentError(error, componentName, context),
});
