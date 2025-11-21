'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { initializePerformanceTracking, trackPageLoad } from '@/lib/analytics';
import { createComponentLogger } from '@/lib/logger';

const logger = createComponentLogger('PerformanceMonitor');

export const PerformanceMonitor = () => {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize performance tracking on mount
    try {
      initializePerformanceTracking();
      logger.debug('Performance tracking initialized');
    } catch (error) {
      logger.error('Failed to initialize performance tracking', error);
    }
  }, []);

  useEffect(() => {
    // Track page changes
    if (pathname) {
      try {
        // Add a small delay to ensure the page has loaded
        const timer = setTimeout(() => {
          trackPageLoad(pathname);
          logger.debug(`Page load tracked: ${pathname}`);
        }, 100);

        return () => clearTimeout(timer);
      } catch (error) {
        logger.error('Failed to track page load', error, { pathname });
      }
    }
  }, [pathname]);

  // Performance monitoring runs silently, no UI needed
  return null;
};
