/**
 * Performance monitoring and analytics utilities
 * Tracks Core Web Vitals and custom performance metrics
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';
import { logger } from './logger';

// Google Analytics interface
interface GoogleAnalytics {
  gtag: (command: string, targetId: string, parameters?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    gtag?: GoogleAnalytics['gtag'];
  }
}

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
}

export interface CustomMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, string | number | boolean>;
}

class PerformanceTracker {
  private static instance: PerformanceTracker;
  private metrics: PerformanceMetric[] = [];
  private customMetrics: CustomMetric[] = [];
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  /**
   * Initialize Core Web Vitals tracking
   */
  initializeWebVitals(): void {
    if (typeof window === 'undefined') {
      return; // Skip on server side
    }

    try {
      // Track Cumulative Layout Shift
      onCLS(this.handleMetric.bind(this));

      // Track Interaction to Next Paint (replaces FID)
      onINP(this.handleMetric.bind(this));

      // Track First Contentful Paint
      onFCP(this.handleMetric.bind(this));

      // Track Largest Contentful Paint
      onLCP(this.handleMetric.bind(this));

      // Track Time to First Byte
      onTTFB(this.handleMetric.bind(this));

      logger.debug('Core Web Vitals tracking initialized');
    } catch (error) {
      logger.error('Failed to initialize Web Vitals tracking', error);
    }
  }

  /**
   * Handle Core Web Vitals metric
   */
  private handleMetric(metric: Metric): void {
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now(),
    };

    this.metrics.push(performanceMetric);

    // Log metric for debugging
    logger.debug(`Core Web Vital: ${metric.name}`, {
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    });

    // Send to analytics in production
    if (this.isProduction) {
      this.sendMetricToAnalytics(performanceMetric);
    }

    // Log performance issues
    if (metric.rating === 'poor') {
      logger.warn(`Poor performance detected: ${metric.name}`, {
        value: metric.value,
        threshold: this.getThreshold(metric.name),
      });
    }
  }

  /**
   * Track custom application metrics
   */
  trackCustomMetric(
    name: string,
    value: number,
    metadata?: Record<string, string | number | boolean>
  ): void {
    const customMetric: CustomMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.customMetrics.push(customMetric);

    logger.debug(`Custom metric: ${name}`, {
      value,
      metadata,
    });

    if (this.isProduction) {
      this.sendCustomMetricToAnalytics(customMetric);
    }
  }

  /**
   * Track page load times
   */
  trackPageLoad(pageName: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        const domContentLoaded =
          navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        const ttfb = navigation.responseStart - navigation.requestStart;

        this.trackCustomMetric('page_load_time', loadTime, {
          page: pageName,
          type: 'full_load',
        });

        this.trackCustomMetric('dom_content_loaded', domContentLoaded, {
          page: pageName,
          type: 'dom_ready',
        });

        this.trackCustomMetric('time_to_first_byte', ttfb, {
          page: pageName,
          type: 'network',
        });
      }
    } catch (error) {
      logger.error('Failed to track page load metrics', error, { page: pageName });
    }
  }

  /**
   * Track user interactions
   */
  trackUserAction(
    action: string,
    metadata?: Record<string, string | number | boolean>
  ): () => void {
    const startTime = Date.now();

    // Return a function to measure action duration
    return () => {
      const duration = Date.now() - startTime;
      this.trackCustomMetric('user_action_duration', duration, {
        action,
        ...metadata,
      });
    };
  }

  /**
   * Track resource loading times
   */
  trackResourceLoad(resourceName: string, startTime: number): void {
    const loadTime = Date.now() - startTime;
    this.trackCustomMetric('resource_load_time', loadTime, {
      resource: resourceName,
    });

    // Log slow resources
    if (loadTime > 2000) {
      logger.warn(`Slow resource load: ${resourceName}`, {
        loadTime,
        threshold: 2000,
      });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    webVitals: PerformanceMetric[];
    customMetrics: CustomMetric[];
    summary: {
      totalMetrics: number;
      poorRatings: number;
      averageValues: Record<string, number>;
      sessionDuration: number;
    };
  } {
    const summary = {
      totalMetrics: this.metrics.length + this.customMetrics.length,
      poorRatings: this.metrics.filter(m => m.rating === 'poor').length,
      averageValues: this.calculateAverages(),
      sessionDuration: Date.now() - (this.metrics[0]?.timestamp || Date.now()),
    };

    return {
      webVitals: this.metrics,
      customMetrics: this.customMetrics,
      summary,
    };
  }

  /**
   * Send metric to analytics service
   */
  private sendMetricToAnalytics(metric: PerformanceMetric): void {
    // In a real implementation, you would send to your analytics provider
    // Example: Google Analytics 4, Datadog, New Relic, etc.

    try {
      // Example: Google Analytics 4
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vital', {
          metric_name: metric.name,
          metric_value: metric.value,
          metric_rating: metric.rating,
          metric_id: metric.id,
        });
      }

      // Example: Custom analytics endpoint
      if (this.isProduction && process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'web_vital',
            ...metric,
          }),
        }).catch(error => {
          logger.error('Failed to send metric to analytics', error);
        });
      }
    } catch (error) {
      logger.error('Failed to send metric to analytics', error);
    }
  }

  /**
   * Send custom metric to analytics service
   */
  private sendCustomMetricToAnalytics(metric: CustomMetric): void {
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'custom_metric', {
          metric_name: metric.name,
          metric_value: metric.value,
          ...metric.metadata,
        });
      }

      if (this.isProduction && process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'custom_metric',
            ...metric,
          }),
        }).catch(error => {
          logger.error('Failed to send custom metric to analytics', error);
        });
      }
    } catch (error) {
      logger.error('Failed to send custom metric to analytics', error);
    }
  }

  /**
   * Get performance thresholds for rating
   */
  private getThreshold(metricName: string): number {
    const thresholds: Record<string, number> = {
      CLS: 0.1,
      INP: 200,
      FCP: 1800,
      LCP: 2500,
      TTFB: 800,
    };

    return thresholds[metricName] || 0;
  }

  /**
   * Calculate average values for metrics
   */
  private calculateAverages(): Record<string, number> {
    const averages: Record<string, number> = {};

    // Group metrics by name
    const groupedMetrics = this.metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = [];
        }
        acc[metric.name].push(metric.value);
        return acc;
      },
      {} as Record<string, number[]>
    );

    // Calculate averages
    for (const [name, values] of Object.entries(groupedMetrics)) {
      averages[name] = values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    return averages;
  }
}

// Export singleton instance
export const performanceTracker = PerformanceTracker.getInstance();

// Convenience functions
export const initializePerformanceTracking = () => {
  performanceTracker.initializeWebVitals();
};

export const trackPageLoad = (pageName: string) => {
  performanceTracker.trackPageLoad(pageName);
};

export const trackUserAction = (
  action: string,
  metadata?: Record<string, string | number | boolean>
) => {
  return performanceTracker.trackUserAction(action, metadata);
};

export const trackResourceLoad = (resourceName: string, startTime: number) => {
  performanceTracker.trackResourceLoad(resourceName, startTime);
};

export const getPerformanceSummary = () => {
  return performanceTracker.getPerformanceSummary();
};
