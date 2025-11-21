'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorHandler, ErrorCategory } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Handle the error using our centralized error handler
    const userFriendlyError = errorHandler.handleError(error, {
      category: ErrorCategory.UNKNOWN,
      component: 'ErrorBoundary',
      stack: errorInfo.componentStack,
    });

    // Call the optional onError prop
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error details
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Update state with user-friendly error message
    this.setState({
      errorInfo: userFriendlyError.message,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className='min-h-screen flex items-center justify-center p-4'>
          <Card className='w-full max-w-md'>
            <CardHeader className='text-center'>
              <div className='mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4'>
                <AlertCircle className='w-6 h-6 text-red-600' />
              </div>
              <CardTitle className='text-red-900'>Something went wrong</CardTitle>
              <CardDescription>
                {this.state.errorInfo ||
                  'An unexpected error occurred. Please try refreshing the page.'}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Button onClick={this.handleRetry} className='w-full' variant='outline'>
                <RefreshCw className='w-4 h-4 mr-2' />
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} className='w-full'>
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * A simpler functional error boundary hook for specific components
 */
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error | unknown) => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    setError(errorObj);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error; // This will be caught by the nearest Error Boundary
    }
  }, [error]);

  return { captureError, resetError };
};
