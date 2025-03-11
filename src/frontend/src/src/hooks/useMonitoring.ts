import { useCallback } from 'react';

interface MetricLabels {
  [key: string]: string | number;
}

export const useMonitoring = () => {
  const recordMetric = useCallback(async (
    name: string,
    value: number,
    labels: MetricLabels = {}
  ) => {
    try {
      await fetch('/api/database/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          value,
          labels: {
            environment: process.env.NODE_ENV,
            ...labels,
          },
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }, []);

  const recordEvent = useCallback(async (
    name: string,
    data: Record<string, any> = {},
    labels: MetricLabels = {}
  ) => {
    try {
      await fetch('/api/database/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          data,
          labels: {
            environment: process.env.NODE_ENV,
            ...labels,
          },
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to record event:', error);
    }
  }, []);

  const startTimer = useCallback((name: string) => {
    const startTime = performance.now();
    return {
      stop: async (labels: MetricLabels = {}) => {
        const duration = performance.now() - startTime;
        await recordMetric(`${name}_duration`, duration, labels);
        return duration;
      },
    };
  }, [recordMetric]);

  return {
    recordMetric,
    recordEvent,
    startTimer,
  };
}; 