'use client';

import React, { useState, useEffect, ReactNode } from 'react';

interface ResponsiveAnalyticsLayoutProps {
  selectorPanel: ReactNode;
  resultsPanel: ReactNode;
  controlsPanel?: ReactNode;
}

export default function ResponsiveAnalyticsLayout({ 
  selectorPanel, 
  resultsPanel, 
  controlsPanel 
}: ResponsiveAnalyticsLayoutProps) {
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');

  // Praćenje veličine ekrana
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('sm');
      else if (width < 768) setScreenSize('md');
      else if (width < 1024) setScreenSize('lg');
      else if (width < 1280) setScreenSize('xl');
      else setScreenSize('2xl');
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Dinamičke funkcije
  const getGridLayout = () => {
    switch (screenSize) {
      case 'sm':
        return 'grid-cols-1'; // Mobile: sve u jednoj koloni
      case 'md':
        return 'grid-cols-1'; // Tablet portrait: sve u jednoj koloni
      case 'lg':
        return 'grid-cols-1 lg:grid-cols-3'; // Tablet landscape: 1:2 ratio
      case 'xl':
        return 'grid-cols-1 xl:grid-cols-4'; // Desktop: 1:3 ratio
      case '2xl':
        return 'grid-cols-1 2xl:grid-cols-5'; // Large desktop: 1:4 ratio
      default:
        return 'grid-cols-1 xl:grid-cols-4';
    }
  };

  const getSelectorSpan = () => {
    switch (screenSize) {
      case 'sm':
      case 'md':
        return 'col-span-1';
      case 'lg':
        return 'lg:col-span-1';
      case 'xl':
        return 'xl:col-span-1';
      case '2xl':
        return '2xl:col-span-1';
      default:
        return 'xl:col-span-1';
    }
  };

  const getResultsSpan = () => {
    switch (screenSize) {
      case 'sm':
      case 'md':
        return 'col-span-1';
      case 'lg':
        return 'lg:col-span-2';
      case 'xl':
        return 'xl:col-span-3';
      case '2xl':
        return '2xl:col-span-4';
      default:
        return 'xl:col-span-3';
    }
  };

  const getContainerPadding = () => {
    switch (screenSize) {
      case 'sm':
        return 'p-2 space-y-4';
      case 'md':
        return 'p-4 space-y-4';
      case 'lg':
        return 'p-4 space-y-6';
      case 'xl':
      case '2xl':
        return 'p-6 space-y-6';
      default:
        return 'p-4 space-y-6';
    }
  };

  const getControlsLayout = () => {
    switch (screenSize) {
      case 'sm':
        return 'flex-col space-y-4';
      case 'md':
        return 'flex-col lg:flex-row lg:items-end gap-4';
      case 'lg':
      case 'xl':
      case '2xl':
        return 'flex-col lg:flex-row lg:items-end gap-6';
      default:
        return 'flex-col lg:flex-row lg:items-end gap-6';
    }
  };

  return (
    <div className={getContainerPadding()}>
      {/* Controls Panel */}
      {controlsPanel && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className={`flex ${getControlsLayout()}`}>
            {controlsPanel}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`grid ${getGridLayout()} gap-6`}>
        {/* Selector Panel */}
        <div className={getSelectorSpan()}>
          {selectorPanel}
        </div>

        {/* Results Panel */}
        <div className={getResultsSpan()}>
          {resultsPanel}
        </div>
      </div>
    </div>
  );
}

// Export helper hook for other components
export function useResponsiveLayout() {
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('sm');
      else if (width < 768) setScreenSize('md');
      else if (width < 1024) setScreenSize('lg');
      else if (width < 1280) setScreenSize('xl');
      else setScreenSize('2xl');
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const getMetricsColumns = () => {
    switch (screenSize) {
      case 'sm':
        return 'grid-cols-1';
      case 'md':
        return 'grid-cols-2';
      case 'lg':
        return 'grid-cols-2 lg:grid-cols-4';
      case 'xl':
      case '2xl':
        return 'grid-cols-2 lg:grid-cols-4';
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    }
  };

  const getContainerMaxWidth = () => {
    switch (screenSize) {
      case 'sm':
        return 'max-w-full px-2';
      case 'md':
        return 'max-w-full px-4';
      case 'lg':
        return 'max-w-full px-6';
      case 'xl':
      case '2xl':
        return 'max-w-full px-8';
      default:
        return 'max-w-full px-6';
    }
  };

  const getContainerPadding = () => {
    switch (screenSize) {
      case 'sm':
        return 'p-2 space-y-4';
      case 'md':
        return 'p-4 space-y-4';
      case 'lg':
        return 'p-4 space-y-6';
      case 'xl':
      case '2xl':
        return 'p-6 space-y-6';
      default:
        return 'p-4 space-y-6';
    }
  };

  return {
    screenSize,
    getMetricsColumns,
    getContainerMaxWidth,
    getContainerPadding
  };
}
