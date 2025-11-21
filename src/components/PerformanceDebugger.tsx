'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPerformanceSummary, type PerformanceMetric, type CustomMetric } from '@/lib/analytics';

interface PerformanceDebuggerProps {
  enabled?: boolean;
}

export const PerformanceDebugger = ({
  enabled = process.env.NODE_ENV === 'development',
}: PerformanceDebuggerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [summary, setSummary] = useState<ReturnType<typeof getPerformanceSummary> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Update summary every 5 seconds
    const interval = setInterval(() => {
      setSummary(getPerformanceSummary());
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled) return null;

  const toggleVisibility = () => setIsVisible(!isVisible);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'bg-green-500';
      case 'needs-improvement':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <>
      {/* Toggle button */}
      <Button
        onClick={toggleVisibility}
        className='fixed bottom-4 left-4 z-50'
        variant='outline'
        size='sm'
      >
        📊 Perf
      </Button>

      {/* Performance panel */}
      {isVisible && summary && (
        <div className='fixed bottom-16 left-4 z-50 w-96 max-h-96 overflow-y-auto'>
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>Performance Metrics</CardTitle>
              <CardDescription className='text-xs'>
                {summary.summary.totalMetrics} metrics • {summary.summary.poorRatings} poor ratings
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {/* Core Web Vitals */}
              <div>
                <h4 className='text-xs font-semibold mb-1'>Core Web Vitals</h4>
                <div className='space-y-1'>
                  {summary.webVitals.slice(-5).map((metric: PerformanceMetric, index: number) => (
                    <div
                      key={metric.id ? `${metric.name}-${metric.id}` : `${metric.name}-${index}`}
                      className='flex items-center justify-between text-xs'
                    >
                      <span>{metric.name}</span>
                      <div className='flex items-center gap-1'>
                        <span>{metric.value.toFixed(2)}</span>
                        <Badge
                          className={`w-2 h-2 rounded-full ${getRatingColor(metric.rating)}`}
                          variant='outline'
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Metrics */}
              {summary.customMetrics.length > 0 && (
                <div>
                  <h4 className='text-xs font-semibold mb-1'>Custom Metrics</h4>
                  <div className='space-y-1'>
                    {summary.customMetrics.slice(-5).map((metric: CustomMetric) => (
                      <div
                        key={`${metric.name}-${metric.timestamp}`}
                        className='flex items-center justify-between text-xs'
                      >
                        <span>{metric.name}</span>
                        <span>{metric.value.toFixed(2)}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div>
                <h4 className='text-xs font-semibold mb-1'>Session Summary</h4>
                <div className='text-xs space-y-1'>
                  <div>Duration: {(summary.summary.sessionDuration / 1000).toFixed(1)}s</div>
                  {Object.entries(summary.summary.averageValues || {}).map(
                    ([name, value]: [string, number]) => (
                      <div key={name}>
                        Avg {name}: {value.toFixed(2)}
                      </div>
                    )
                  )}
                </div>
              </div>

              <Button
                onClick={() => console.warn('Full Performance Data:', summary)}
                variant='outline'
                size='sm'
                className='w-full text-xs'
              >
                Log Full Data
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
