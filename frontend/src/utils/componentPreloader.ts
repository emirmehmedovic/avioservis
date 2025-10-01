/**
 * componentPreloader.ts
 * Utility za preload-ovanje komponenti da se smanji flickering
 */

// Cache za preload-ovane komponente
const componentCache = new Map<string, Promise<any>>();

/**
 * Preload-uje komponentu i čuva je u cache-u
 */
export function preloadComponent(importFn: () => Promise<any>, key: string): Promise<any> {
  if (componentCache.has(key)) {
    return componentCache.get(key)!;
  }

  const promise = importFn();
  componentCache.set(key, promise);
  return promise;
}

/**
 * Preload-uje sve analytics komponente
 */
export function preloadAnalyticsComponents() {
  // Preload main analytics components
  preloadComponent(
    () => import('@/components/analytics/WeeklyFilteredAnalysis'),
    'WeeklyFilteredAnalysis'
  );
  
  preloadComponent(
    () => import('@/components/analytics/MonthlyFilteredAnalysis'),
    'MonthlyFilteredAnalysis'
  );
  
  preloadComponent(
    () => import('@/components/analytics/CustomFilteredAnalysis'),
    'CustomFilteredAnalysis'
  );
  
  preloadComponent(
    () => import('@/components/analytics/AirlineDestinationResults'),
    'AirlineDestinationResults'
  );
  
  preloadComponent(
    () => import('@/components/analytics/AirlineDestinationSelector'),
    'AirlineDestinationSelector'
  );

  // Preload loader components
  preloadComponent(
    () => import('@/components/analytics/AnalyticsLoader'),
    'AnalyticsLoader'
  );
  
  preloadComponent(
    () => import('@/components/analytics/AnalyticsLoader').then(module => ({ default: module.ChartSkeleton })),
    'ChartSkeleton'
  );
}

/**
 * Dobija cached komponentu ili je učitava
 */
export function getCachedComponent(importFn: () => Promise<any>, key: string) {
  if (componentCache.has(key)) {
    return componentCache.get(key)!;
  }
  return preloadComponent(importFn, key);
}

/**
 * Hook za preload-ovanje komponenti na mount
 */
export function useComponentPreloader() {
  React.useEffect(() => {
    // Preload komponente nakon što se glavna komponenta mount-uje
    const timer = setTimeout(() => {
      preloadAnalyticsComponents();
    }, 100);

    return () => clearTimeout(timer);
  }, []);
}

// Export React for the hook
import React from 'react';
