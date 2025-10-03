'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useResponsiveLayout } from '@/components/analytics/ResponsiveAnalyticsLayout';
import { formatBAM, formatNumber as formatNumberUtil, formatGrowth as formatGrowthUtil } from '@/utils/currencyFormatter';
import { useComponentPreloader, getCachedComponent } from '@/utils/componentPreloader';
import { formatDateBS, formatDateRangeBS } from '@/utils/dateFormatter';
import ExportControls from '@/components/analytics/ExportControls';
import { ExportData } from '@/services/analyticsExportService';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  BarChart3,
  PieChart,
  AlertTriangle,
  Download,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plane,
  MapPin,
  CalendarCheck,
  FileText
} from 'lucide-react';

// Interfaces for API responses
interface WeeklyData {
  week: string;
  weekStart: string;
  weekEnd: string;
  liters: number;
  kg: number;
  revenue: number;
  operations: number;
  growth: {
    liters: number;
    kg: number;
    revenue: number;
    operations: number;
  };
}

interface WeeklyAnalysisData {
  summary: {
    totalWeeks: number;
    totalLiters: number;
    totalRevenue: number;
    totalOperations: number;
    avgWeeklyLiters: number;
  };
  weeklyData: WeeklyData[];
  filters: {
    airlineId: number | null;
    destinationId: string | null;
    startDate: string;
    endDate: string;
  };
}

interface MonthlyData {
  month: string;
  monthName: string;
  liters: number;
  kg: number;
  revenue: number;
  operations: number;
  growth: {
    liters: number;
    kg: number;
    revenue: number;
    operations: number;
  };
}

interface MonthlyAnalysisData {
  summary: {
    totalMonths: number;
    totalLiters: number;
    totalRevenue: number;
    totalOperations: number;
    avgMonthlyLiters: number;
  };
  monthlyData: MonthlyData[];
  filters: {
    airlineId: number | null;
    destinationId: string | null;
    startDate: string;
    endDate: string;
  };
}

interface CustomAnalysisData {
  summary?: {
    currentPeriod?: {
      liters?: number;
      operations?: number;
    };
    comparisonPeriod?: {
      liters?: number;
    };
    growth?: {
      liters?: number;
    };
  };
  chartData?: Array<{
    date: string;
    liters: number;
  }>;
  breakdown?: {
    airlines?: Array<{
      name: string;
      liters: number;
    }>;
    destinations?: Array<{
      name: string;
      liters: number;
    }>;
  };
}

// Komponente za različite tabove
function WeeklyAnalysisTab() {
  const [analysisData, setAnalysisData] = useState<WeeklyAnalysisData | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [initialLoad, setInitialLoad] = useState(true);
  const [contentReady, setContentReady] = useState(false);
  const [selection, setSelection] = useState<{
    airlineId?: number;
    destinationId?: string;
    airlineName?: string;
    destinationName?: string;
  }>({});
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 mjeseci nazad
    endDate: new Date().toISOString().split('T')[0]
  });
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
      case 'sm': return 'grid-cols-1';
      case 'md': return 'grid-cols-1';
      case 'lg': return 'grid-cols-1 lg:grid-cols-3';
      case 'xl': return 'grid-cols-1 xl:grid-cols-4';
      case '2xl': return 'grid-cols-1 2xl:grid-cols-5';
      default: return 'grid-cols-1 xl:grid-cols-4';
    }
  };

  const getSelectorSpan = () => {
    switch (screenSize) {
      case 'sm': case 'md': return 'col-span-1';
      case 'lg': return 'lg:col-span-1';
      case 'xl': return 'xl:col-span-1';
      case '2xl': return '2xl:col-span-1';
      default: return 'xl:col-span-1';
    }
  };

  const getResultsSpan = () => {
    switch (screenSize) {
      case 'sm': case 'md': return 'col-span-1';
      case 'lg': return 'lg:col-span-2';
      case 'xl': return 'xl:col-span-3';
      case '2xl': return '2xl:col-span-4';
      default: return 'xl:col-span-3';
    }
  };

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      
      // Add minimum loading time to prevent flickering
      const [{ getWeeklyFilteredAnalysis }] = await Promise.all([
        import('@/services/analyticsApiService'),
        new Promise(resolve => setTimeout(resolve, initialLoad ? 1500 : 500))
      ]);
      
      const data = await getWeeklyFilteredAnalysis(
        dateRange.startDate,
        dateRange.endDate,
        selection.airlineId,
        selection.destinationId
      );
      
      setAnalysisData(data as WeeklyAnalysisData);
      setInitialLoad(false);
      
      // Preload komponente i pripremi content
      setTimeout(() => {
        setContentReady(true);
      }, 200);
    } catch (error) {
      console.error('Error loading weekly analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount with default 6 months
  useEffect(() => {
    handleAnalyze();
  }, []);

  // Create export data
  const createExportData = (): ExportData | null => {
    if (!analysisData) return null;

    return {
      title: 'Sedmična analiza',
      subtitle: `${selection.airlineName ? `Aviokompanija: ${selection.airlineName}` : ''} ${selection.destinationName ? `Destinacija: ${selection.destinationName}` : ''}`.trim() || 'Sve aviokompanije i destinacije',
      generatedAt: new Date(),
      period: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      },
      summary: {
        totalCurrent: analysisData.summary.totalLiters,
        totalPrevious: 0, // Weekly analysis doesn't have previous comparison
        growth: 0, // No average growth in new structure
        operationsCount: analysisData.summary.totalOperations
      },
      chartData: analysisData.weeklyData.map((week) => ({
        period: week.week,
        current: week.liters,
        previous: 0,
        growth: week.growth.liters
      }))
    };
  };

  // Show full-screen loader on initial load
  if (loading && initialLoad) {
    const AnalyticsLoader = React.lazy(() => import('@/components/analytics/AnalyticsLoader'));
    return (
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-gray-600">Učitavam...</p></div></div>}>
        <AnalyticsLoader type="weekly" message="Analiziram sedmične podatke za odabrani period..." />
      </Suspense>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-6">
          {/* Date Range */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Period analize</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Od datuma</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Do datuma</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filteri</h3>
            <div className="space-y-2">
              {selection.airlineName ? (
                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-2 rounded-md">
                  <Plane className="h-4 w-4" />
                  <span className="font-medium">{selection.airlineName}</span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Sve aviokompanje</div>
              )}
              
              {selection.destinationName ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-md">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">{selection.destinationName}</span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Sve destinacije</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analiziram...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Analiziraj
                </>
              )}
            </button>
            
            {/* Export Controls */}
            {analysisData && createExportData() && (
              <ExportControls 
                data={createExportData()!}
                onExportStart={() => console.log('Export started')}
                onExportComplete={() => console.log('Export completed')}
                onExportError={(error) => console.error('Export error:', error)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`grid ${getGridLayout()} gap-6`}>
        {/* Selector Panel */}
        <div className={getSelectorSpan()}>
          <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
            {React.createElement(
              React.lazy(() => import('@/components/analytics/AirlineDestinationSelector')),
              {
                onSelectionChange: setSelection,
                onAnalyze: handleAnalyze,
                loading: loading
              }
            )}
          </Suspense>
        </div>

        {/* Results Panel */}
        <div className={getResultsSpan()}>
          {loading && !initialLoad ? (
            <div className="space-y-6">
              <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
                {React.createElement(
                  React.lazy(() => import('@/components/analytics/AnalyticsLoader').then(module => ({ default: module.ChartSkeleton }))),
                  {}
                )}
              </Suspense>
              <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
                {React.createElement(
                  React.lazy(() => import('@/components/analytics/AnalyticsLoader').then(module => ({ default: module.ChartSkeleton }))),
                  {}
                )}
              </Suspense>
            </div>
          ) : analysisData && contentReady ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Suspense fallback={
                <div className="space-y-6">
                  <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
                    {React.createElement(
                      React.lazy(() => getCachedComponent(
                        () => import('@/components/analytics/AnalyticsLoader').then(module => ({ default: module.ChartSkeleton })),
                        'ChartSkeleton'
                      )),
                      {}
                    )}
                  </Suspense>
                </div>
              }>
                {React.createElement(
                  React.lazy(() => getCachedComponent(
                    () => import('@/components/analytics/WeeklyFilteredAnalysis'),
                    'WeeklyFilteredAnalysis'
                  )),
                  {
                    data: analysisData,
                    airlineName: selection.airlineName,
                    destinationName: selection.destinationName
                  }
                )}
              </Suspense>
            </motion.div>
          ) : analysisData && !contentReady ? (
            <div className="space-y-6">
              <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
                {React.createElement(
                  React.lazy(() => getCachedComponent(
                    () => import('@/components/analytics/AnalyticsLoader').then(module => ({ default: module.ChartSkeleton })),
                    'ChartSkeleton'
                  )),
                  {}
                )}
              </Suspense>
              <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
                {React.createElement(
                  React.lazy(() => getCachedComponent(
                    () => import('@/components/analytics/AnalyticsLoader').then(module => ({ default: module.ChartSkeleton })),
                    'ChartSkeleton'
                  )),
                  {}
                )}
              </Suspense>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-full flex items-center justify-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6">
                  <Calendar className="w-12 h-12 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Sedmična analiza
                </h3>
                <p className="text-gray-600 mb-4">
                  Analizirajte sedmičnu potrošnju goriva, operacije i prihod. Možete filtrirati po aviokompaniji i/ili destinaciji.
                </p>
                <div className="text-sm text-gray-500">
                  <p>• Sedmica za sedmicom komparacija</p>
                  <p>• Zadnjih 6 mjeseci ili custom period</p>
                  <p>• Week-over-week rast</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthlyAnalysisTab() {
  const [analysisData, setAnalysisData] = useState<MonthlyAnalysisData | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [initialLoad, setInitialLoad] = useState(true);
  const [selection, setSelection] = useState<{
    airlineId?: number;
    destinationId?: string;
    airlineName?: string;
    destinationName?: string;
  }>({});
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 mjeseci nazad
    endDate: new Date().toISOString().split('T')[0]
  });

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      
      // Add minimum loading time to prevent flickering
      const [{ getMonthlyFilteredAnalysis }] = await Promise.all([
        import('@/services/analyticsApiService'),
        new Promise(resolve => setTimeout(resolve, initialLoad ? 1500 : 500))
      ]);
      
      const data = await getMonthlyFilteredAnalysis(
        dateRange.startDate,
        dateRange.endDate,
        selection.airlineId,
        selection.destinationId
      );
      
      setAnalysisData(data as MonthlyAnalysisData);
      setInitialLoad(false);
    } catch (error) {
      console.error('Error loading monthly analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount with default 12 months
  useEffect(() => {
    handleAnalyze();
  }, []);

  // Create export data
  const createExportData = (): ExportData | null => {
    if (!analysisData) return null;

    return {
      title: 'Mjesečna analiza',
      subtitle: `${selection.airlineName ? `Aviokompanija: ${selection.airlineName}` : ''} ${selection.destinationName ? `Destinacija: ${selection.destinationName}` : ''}`.trim() || 'Sve aviokompanije i destinacije',
      generatedAt: new Date(),
      period: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      },
      summary: {
        totalCurrent: analysisData.summary.totalLiters,
        totalPrevious: 0, // Monthly analysis doesn't have previous comparison
        growth: 0, // No average growth in new structure
        operationsCount: analysisData.summary.totalOperations
      },
      chartData: analysisData.monthlyData.map((month) => ({
        period: month.monthName,
        current: month.liters,
        previous: 0,
        growth: month.growth.liters
      }))
    };
  };

  // Show full-screen loader on initial load
  if (loading && initialLoad) {
    const AnalyticsLoader = React.lazy(() => import('@/components/analytics/AnalyticsLoader'));
    return (
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div><p className="text-gray-600">Učitavam...</p></div></div>}>
        <AnalyticsLoader type="monthly" message="Analiziram mjesečne podatke za odabrani period..." />
      </Suspense>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-6">
          {/* Date Range */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Period analize</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Od datuma</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Do datuma</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filteri</h3>
            <div className="space-y-2">
              {selection.airlineName ? (
                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-2 rounded-md">
                  <Plane className="h-4 w-4" />
                  <span className="font-medium">{selection.airlineName}</span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Sve aviokompanje</div>
              )}
              
              {selection.destinationName ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-md">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">{selection.destinationName}</span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Sve destinacije</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analiziram...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Analiziraj
                </>
              )}
            </button>
            
            {/* Export Controls */}
            {analysisData && createExportData() && (
              <ExportControls 
                data={createExportData()!}
                onExportStart={() => console.log('Export started')}
                onExportComplete={() => console.log('Export completed')}
                onExportError={(error) => console.error('Export error:', error)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Selector Panel */}
        <div className="xl:col-span-1">
          <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
            {React.createElement(
              React.lazy(() => import('@/components/analytics/AirlineDestinationSelector')),
              {
                onSelectionChange: setSelection,
                onAnalyze: handleAnalyze,
                loading: loading
              }
            )}
          </Suspense>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-3">
          {loading && !initialLoad ? (
            <div className="space-y-6">
              <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
                {React.createElement(
                  React.lazy(() => import('@/components/analytics/AnalyticsLoader').then(module => ({ default: module.ChartSkeleton }))),
                  {}
                )}
              </Suspense>
              <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
                {React.createElement(
                  React.lazy(() => import('@/components/analytics/AnalyticsLoader').then(module => ({ default: module.ChartSkeleton }))),
                  {}
                )}
              </Suspense>
              <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
                {React.createElement(
                  React.lazy(() => import('@/components/analytics/AnalyticsLoader').then(module => ({ default: module.ChartSkeleton }))),
                  {}
                )}
              </Suspense>
            </div>
          ) : analysisData ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Suspense fallback={
                <div className="space-y-6">
                  <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
                    {React.createElement(
                      React.lazy(() => import('@/components/analytics/AnalyticsLoader').then(module => ({ default: module.ChartSkeleton }))),
                      {}
                    )}
                  </Suspense>
                </div>
              }>
                {React.createElement(
                  React.lazy(() => import('@/components/analytics/MonthlyFilteredAnalysis')),
                  {
                    data: analysisData,
                    airlineName: selection.airlineName,
                    destinationName: selection.destinationName
                  }
                )}
              </Suspense>
            </motion.div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-full flex items-center justify-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6">
                  <BarChart3 className="w-12 h-12 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Mjesečna analiza
                </h3>
                <p className="text-gray-600 mb-4">
                  Analizirajte mjesečnu potrošnju goriva, operacije i prihod. Možete filtrirati po aviokompaniji i/ili destinaciji.
                </p>
                <div className="text-sm text-gray-500">
                  <p>• Mjesec za mjesecom komparacija</p>
                  <p>• Zadnjih 12 mjeseci ili custom period</p>
                  <p>• Month-over-month rast</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomAnalysisTab() {
  const [customData, setCustomData] = useState<CustomAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selection, setSelection] = useState<{
    airlineId?: number;
    destinationId?: string;
    airlineName?: string;
    destinationName?: string;
  }>({});

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      const { getCustomFilteredAnalysis } = await import('@/services/analyticsApiService');
      
      const data = await getCustomFilteredAnalysis(
        dateRange.startDate,
        dateRange.endDate,
        selection.airlineId,
        selection.destinationId
      );
      
      setCustomData(data as CustomAnalysisData);
    } catch (error) {
      console.error('Error loading custom analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount with default 30 days
  useEffect(() => {
    handleAnalyze();
  }, []);

  // Create export data
  const createExportData = (): ExportData | null => {
    if (!customData) return null;

    return {
      title: 'Prilagođena analiza',
      subtitle: `${selection.airlineName ? `Aviokompanija: ${selection.airlineName}` : ''} ${selection.destinationName ? `Destinacija: ${selection.destinationName}` : ''}`.trim() || 'Sve aviokompanije i destinacije',
      generatedAt: new Date(),
      period: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      },
      summary: {
        totalCurrent: customData.summary?.currentPeriod?.liters || 0,
        totalPrevious: customData.summary?.comparisonPeriod?.liters || 0,
        growth: customData.summary?.growth?.liters || 0,
        operationsCount: customData.summary?.currentPeriod?.operations || 0
      },
      chartData: customData.chartData?.map((item: any) => ({
        period: item.date,
        current: item.liters,
        previous: 0,
        growth: 0
      })) || [],
      airlines: customData.breakdown?.airlines?.map((airline: any) => ({
        name: airline.name,
        current: airline.liters,
        previous: 0,
        growth: 0,
        marketShare: 0
      })) || [],
      destinations: customData.breakdown?.destinations?.map((dest: any) => ({
        name: dest.name,
        current: dest.liters,
        previous: 0,
        growth: 0,
        marketShare: 0
      })) || []
    };
  };

  const controlsPanel = (
    <>
      {/* Date Range Selector */}
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">Od datuma</label>
        <input
          type="date"
          value={dateRange.startDate}
          onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">Do datuma</label>
        <input
          type="date"
          value={dateRange.endDate}
          onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="flex items-end">
        <div className="flex gap-3">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Analiziram...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analiziraj
              </>
            )}
          </button>
          
          {/* Export Controls */}
          {customData && createExportData() && (
            <ExportControls 
              data={createExportData()!}
              onExportStart={() => console.log('Export started')}
              onExportComplete={() => console.log('Export completed')}
              onExportError={(error) => console.error('Export error:', error)}
            />
          )}
        </div>
      </div>
    </>
  );

  const selectorPanel = (
    <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
      {React.createElement(
        React.lazy(() => import('@/components/analytics/AirlineDestinationSelector')),
        {
          onSelectionChange: setSelection,
          onAnalyze: handleAnalyze,
          loading: loading
        }
      )}
    </Suspense>
  );

  const resultsPanel = customData ? (
    <Suspense fallback={<div className="p-6 text-center">Učitavam rezultate...</div>}>
      {React.createElement(
        React.lazy(() => import('@/components/analytics/CustomFilteredAnalysis')),
        {
          data: customData,
          airlineName: selection.airlineName,
          destinationName: selection.destinationName
        }
      )}
    </Suspense>
  ) : (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-full flex items-center justify-center">
      <div className="max-w-md mx-auto">
        <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6">
          <BarChart3 className="w-12 h-12 text-gray-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Prilagođena analiza
        </h3>
        <p className="text-gray-600 mb-4">
          Analizirajte bilo koji period sa mogućnošću filtriranja po aviokompaniji i/ili destinaciji.
        </p>
        <div className="text-sm text-gray-500">
          <p>• Fleksibilni datumski opseg</p>
          <p>• Automatska komparacija sa prethodnim periodom</p>
          <p>• Detaljni breakdown po aviokompanijama i destinacijama</p>
        </div>
      </div>
    </div>
  );

  return (
    <Suspense fallback={<div className="p-6 text-center">Učitavam layout...</div>}>
      {React.createElement(
        React.lazy(() => import('@/components/analytics/ResponsiveAnalyticsLayout')),
        {
          controlsPanel,
          selectorPanel,
          resultsPanel
        }
      )}
    </Suspense>
  );
}

function PeriodComparisonTab() {
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<{
    airlineId?: number;
    destinationId?: string;
    airlineName?: string;
    destinationName?: string;
  }>({});
  const [periods, setPeriods] = useState<{
    period1?: { startDate: string; endDate: string; name: string };
    period2?: { startDate: string; endDate: string; name: string };
  }>({});

  const handlePeriodsChange = (period1: any, period2: any) => {
    setPeriods({ period1, period2 });
  };

  const handleAnalyze = async () => {
    if (!periods.period1 || !periods.period2) {
      return;
    }

    try {
      setLoading(true);
      const { getPeriodComparison } = await import('@/services/analyticsApiService');
      
      const data = await getPeriodComparison(
        periods.period1,
        periods.period2,
        selection.airlineId,
        selection.destinationId
      );
      
      setComparisonData(data);
    } catch (error) {
      console.error('Error loading period comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-6">
          {/* Period Selection Info */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Odabrani periodi</h3>
            <div className="space-y-2">
              {periods.period1 ? (
                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-2 rounded-md">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{periods.period1.name}</span>
                  <span className="text-sm">({periods.period1.startDate} - {periods.period1.endDate})</span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Prvi period nije odabran</div>
              )}
              
              {periods.period2 ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-md">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{periods.period2.name}</span>
                  <span className="text-sm">({periods.period2.startDate} - {periods.period2.endDate})</span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Drugi period nije odabran</div>
              )}
            </div>
          </div>

          {/* Selection Summary */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filteri</h3>
            <div className="space-y-2">
              {selection.airlineName ? (
                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-2 rounded-md">
                  <Plane className="h-4 w-4" />
                  <span className="font-medium">{selection.airlineName}</span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Sve aviokompanje</div>
              )}
              
              {selection.destinationName ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-md">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">{selection.destinationName}</span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Sve destinacije</div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex-shrink-0">
            <button
              onClick={handleAnalyze}
              disabled={(!periods.period1 || !periods.period2) || loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analiziram...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Kompariraj
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Selector Panel */}
        <div className="xl:col-span-1 space-y-6">
          {/* Period Selector */}
          <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
            {React.createElement(
              React.lazy(() => import('@/components/analytics/DualPeriodSelector')),
              {
                onPeriodsChange: handlePeriodsChange,
                loading: loading
              }
            )}
          </Suspense>

          {/* Airline/Destination Selector */}
          <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
            {React.createElement(
              React.lazy(() => import('@/components/analytics/AirlineDestinationSelector')),
              {
                onSelectionChange: setSelection,
                onAnalyze: handleAnalyze,
                loading: loading
              }
            )}
          </Suspense>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-3">
          {comparisonData ? (
            <Suspense fallback={<div className="p-6 text-center">Učitavam rezultate...</div>}>
              {React.createElement(
                React.lazy(() => import('@/components/analytics/PeriodComparisonAnalysis')),
                {
                  data: comparisonData,
                  airlineName: selection.airlineName,
                  destinationName: selection.destinationName
                }
              )}
            </Suspense>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-full flex items-center justify-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6">
                  <TrendingUp className="w-12 h-12 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Komparacija perioda
                </h3>
                <p className="text-gray-600 mb-4">
                  Odaberite dva perioda za komparaciju iz panela lijevo, zatim kliknite "Kompariraj" da vidite detaljnu analizu.
                </p>
                <div className="text-sm text-gray-500">
                  <p>• Komparirajte bilo koja dva vremenska perioda</p>
                  <p>• Sedmica za sedmicom analiza</p>
                  <p>• Vizuelni prikaz razlika na chartu</p>
                  <p>• Detaljni breakdown po metrikama</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AirlineDestinationTab() {
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<{
    airlineId?: number;
    destinationId?: string;
    airlineName?: string;
    destinationName?: string;
  }>({});
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const handleAnalyze = async () => {
    if (!selection.airlineId && !selection.destinationId) {
      return;
    }

    try {
      setLoading(true);
      const { getAirlineDestinationComparison } = await import('@/services/analyticsApiService');
      
      const currentPeriod = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      
      const previousPeriod = {
        startDate: new Date(new Date(dateRange.startDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: dateRange.startDate
      };
      
      const data = await getAirlineDestinationComparison(
        currentPeriod,
        previousPeriod,
        selection.airlineId,
        selection.destinationId
      );
      
      setAnalysisData(data as any);
    } catch (error) {
      console.error('Error loading airline-destination analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-6">
          {/* Date Range */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Period analize</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Od datuma</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Do datuma</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trenutni odabir</h3>
            <div className="space-y-2">
              {selection.airlineName ? (
                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-2 rounded-md">
                  <Plane className="h-4 w-4" />
                  <span className="font-medium">{selection.airlineName}</span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Aviokompanija nije odabrana</div>
              )}
              
              {selection.destinationName ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-md">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">{selection.destinationName}</span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Destinacija nije odabrana</div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex-shrink-0">
            <button
              onClick={handleAnalyze}
              disabled={(!selection.airlineId && !selection.destinationId) || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analiziram...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Analiziraj
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Selector Panel */}
        <div className="xl:col-span-1">
          <Suspense fallback={<div className="p-6 text-center">Učitavam...</div>}>
            {React.createElement(
              React.lazy(() => import('@/components/analytics/AirlineDestinationSelector')),
              {
                onSelectionChange: setSelection,
                onAnalyze: handleAnalyze,
                loading: loading
              }
            )}
          </Suspense>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-3">
          {analysisData ? (
            <Suspense fallback={<div className="p-6 text-center">Učitavam rezultate...</div>}>
              {React.createElement(
                React.lazy(() => import('@/components/analytics/AirlineDestinationResults')),
                {
                  data: analysisData,
                  period: {
                    current: {
                      startDate: dateRange.startDate,
                      endDate: dateRange.endDate
                    },
                    previous: {
                      startDate: new Date(new Date(dateRange.startDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      endDate: dateRange.startDate
                    }
                  }
                }
              )}
            </Suspense>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-full flex items-center justify-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6">
                  <TrendingUp className="w-12 h-12 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Spremno za analizu
                </h3>
                <p className="text-gray-600 mb-4">
                  Odaberite aviokompaniju i/ili destinaciju iz panela lijevo, zatim kliknite "Analiziraj" da vidite detaljnu komparaciju.
                </p>
                <div className="text-sm text-gray-500">
                  <p>• Možete odabrati samo aviokompaniju</p>
                  <p>• Možete odabrati samo destinaciju</p>
                  <p>• Možete kombinirati oba filtera</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tipovi za podatke
interface CachedAnalytics {
  lastWeekComparison: {
    totalQuantity: number;
    previousQuantity: number;
    growth: number;
    operationsCount: number;
    revenue: number;
    revenueGrowth: number;
    kg: number;
    topDestinations: { name: string; quantity: number; growth: number; operations: number; revenue: number }[];
    topAirlines: { name: string; quantity: number; growth: number; operations: number; revenue: number }[];
  };
  lastMonthComparison: {
    totalQuantity: number;
    previousQuantity: number;
    growth: number;
    operationsCount: number;
    revenue: number;
    revenueGrowth: number;
    kg: number;
  };
  lastYearComparison: {
    totalQuantity: number;
    previousQuantity: number;
    growth: number;
    operationsCount: number;
    revenue: number;
    revenueGrowth: number;
    kg: number;
  };
  performanceMetrics: {
    avgOperationSize: number;
    avgRevenuePerOperation: number;
    avgRevenuePerLiter: number;
    totalOperations: number;
    totalLiters: number;
    totalRevenue: number;
  };
  dailyTrend: Array<{
    date: string;
    liters: number;
    kg: number;
    operations: number;
    revenue: number;
  }>;
  recentAlerts: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    affectedEntity: {
      type: string;
      name: string;
    };
    metrics: {
      changePercent: number;
    };
  }>;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

export default function AnalitikaiKomparacijaPage() {
  const [cachedData, setCachedData] = useState<CachedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'weekly' | 'monthly' | 'custom' | 'period-comparison' | 'airline-destination' | 'schedule' | 'generate-report'>('overview');
  
  // Preload komponente
  useComponentPreloader();
  const [selectedPeriod, setSelectedPeriod] = useState<DateRange>({
    startDate: '',
    endDate: ''
  });
  
  // Use responsive layout hook
  const { screenSize, getMetricsColumns, getContainerMaxWidth, getContainerPadding } = useResponsiveLayout();

  // Učitaj cached podatke na početku
  useEffect(() => {
    loadCachedData();
  }, []);

  const loadCachedData = async () => {
    try {
      setLoading(true);
      // Import API service functions
      const { getCachedAnalytics } = await import('@/services/analyticsApiService');
      const data = await getCachedAnalytics();
      setCachedData(data as CachedAnalytics);
    } catch (error) {
      console.error('Error loading cached analytics:', error);
      // Set fallback data if API fails
      setCachedData({
        lastWeekComparison: {
          totalQuantity: 0,
          previousQuantity: 0,
          growth: 0,
          operationsCount: 0,
          revenue: 0,
          revenueGrowth: 0,
          kg: 0,
          topDestinations: [],
          topAirlines: []
        },
        lastMonthComparison: {
          totalQuantity: 0,
          previousQuantity: 0,
          growth: 0,
          operationsCount: 0,
          revenue: 0,
          revenueGrowth: 0,
          kg: 0
        },
        lastYearComparison: {
          totalQuantity: 0,
          previousQuantity: 0,
          growth: 0,
          operationsCount: 0,
          revenue: 0,
          revenueGrowth: 0,
          kg: 0
        },
        performanceMetrics: {
          avgOperationSize: 0,
          avgRevenuePerOperation: 0,
          avgRevenuePerLiter: 0,
          totalOperations: 0,
          totalLiters: 0,
          totalRevenue: 0
        },
        dailyTrend: [],
        recentAlerts: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return formatNumberUtil(num);
  };

  const formatGrowth = (growth: number): string => {
    return formatGrowthUtil(growth);
  };

  const formatCurrency = (amount: number): string => {
    // Svi prihodi su već konvertovani u BAM na backend-u
    return formatBAM(amount);
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (growth < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getGrowthColor = (growth: number): string => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-lg text-gray-600">Učitavam analitiku...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100`}>
      <div className={`w-full ${getContainerMaxWidth()} ${getContainerPadding()}`}>
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analitika i komparacija</h1>
                <p className="text-gray-600">Napredna analiza potrošnje goriva kroz vrijeme</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={loadCachedData}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Osvježi</span>
              </button>
              
              <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4" />
                <span>Eksport</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-2"
        >
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'overview', name: 'Pregled', icon: BarChart3 },
              { id: 'weekly', name: 'Sedmična analiza', icon: Calendar },
              { id: 'monthly', name: 'Mjesečna analiza', icon: PieChart },
              { id: 'custom', name: 'Prilagođena analiza', icon: Filter },
              { id: 'period-comparison', name: 'Komparacija perioda', icon: TrendingUp },
              { id: 'airline-destination', name: 'Aviokompanija/Destinacija', icon: Plane },
              { id: 'schedule', name: 'Raspored', icon: CalendarCheck },
              { id: 'generate-report', name: 'Generiši izvještaj', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Overview Tab - Cached Data */}
        {activeTab === 'overview' && cachedData && (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className={`grid ${getMetricsColumns()} gap-6`}>
              
              {/* Sedmična potrošnja */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sedmična potrošnja</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(cachedData.lastWeekComparison.totalQuantity)} L
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  {getGrowthIcon(cachedData.lastWeekComparison.growth)}
                  <span className={`text-sm font-medium ml-1 ${getGrowthColor(cachedData.lastWeekComparison.growth)}`}>
                    {formatGrowth(cachedData.lastWeekComparison.growth)}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs prošla sedmica</span>
                </div>
              </motion.div>

              {/* Mjesečna potrošnja */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Mjesečna potrošnja</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(cachedData.lastMonthComparison.totalQuantity)} L
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  {getGrowthIcon(cachedData.lastMonthComparison.growth)}
                  <span className={`text-sm font-medium ml-1 ${getGrowthColor(cachedData.lastMonthComparison.growth)}`}>
                    {formatGrowth(cachedData.lastMonthComparison.growth)}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs prošli mjesec</span>
                </div>
              </motion.div>

              {/* Broj operacija */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Operacije (sedmica)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(cachedData.lastWeekComparison.operationsCount)}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <PieChart className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">Ukupno operacija</span>
                </div>
              </motion.div>

              {/* Upozorenja */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Aktivna upozorenja</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {cachedData.recentAlerts.length}
                    </p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">Zahtijeva pažnju</span>
                </div>
              </motion.div>
            </div>

            {/* Performance Metrics */}
            {cachedData.performanceMetrics && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrije</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="p-3 bg-blue-50 rounded-lg mb-3">
                      <BarChart3 className="w-8 h-8 text-blue-600 mx-auto" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(cachedData.performanceMetrics.avgOperationSize)} L
                    </p>
                    <p className="text-sm text-gray-600">Prosječna veličina operacije</p>
                  </div>
                  <div className="text-center">
                    <div className="p-3 bg-green-50 rounded-lg mb-3">
                      <TrendingUp className="w-8 h-8 text-green-600 mx-auto" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {new Intl.NumberFormat('bs-BA', { style: 'currency', currency: 'BAM' }).format(cachedData.performanceMetrics.avgRevenuePerOperation)}
                    </p>
                    <p className="text-sm text-gray-600">Prosječan prihod po operaciji</p>
                  </div>
                  <div className="text-center">
                    <div className="p-3 bg-purple-50 rounded-lg mb-3">
                      <PieChart className="w-8 h-8 text-purple-600 mx-auto" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {cachedData.performanceMetrics.avgRevenuePerLiter.toFixed(2)} BAM/L
                    </p>
                    <p className="text-sm text-gray-600">Prosječan prihod po litru</p>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Trend Chart */}
            {cachedData.dailyTrend && cachedData.dailyTrend.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                    Mjesečni trend (zadnjih 30 dana)
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Litri</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Prihod (BAM)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span>Operacije</span>
                    </div>
                  </div>
                </div>
                <Suspense fallback={
                  <div className="h-96 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
                      <p className="text-gray-500 text-lg">Učitavam mjesečni trend...</p>
                      <p className="text-gray-400 text-sm mt-2">Analiziram podatke za zadnjih 30 dana</p>
                    </div>
                  </div>
                }>
                  {React.createElement(
                    React.lazy(() => import('@/components/analytics/DailyTrendChart')),
                    {
                      data: cachedData.dailyTrend,
                      width: '100%',
                      height: 400,
                      showLegend: true,
                      showGrid: true,
                      animate: true
                    }
                  )}
                </Suspense>
              </div>
            )}

            {/* Top Destinacije i Aviokompanje */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Top Destinacije */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top destinacije (sedmica)</h3>
                <div className="space-y-3">
                  {cachedData.lastWeekComparison.topDestinations.slice(0, 5).map((dest, index) => (
                    <div key={dest.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{dest.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatNumber(dest.quantity)} L
                        </div>
                        <div className={`text-xs ${getGrowthColor(dest.growth)}`}>
                          {formatGrowth(dest.growth)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Top Aviokompanje */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top aviokompanje (sedmica)</h3>
                <div className="space-y-3">
                  {cachedData.lastWeekComparison.topAirlines.slice(0, 5).map((airline, index) => (
                    <div key={airline.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{airline.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatNumber(airline.quantity)} L
                        </div>
                        <div className={`text-xs ${getGrowthColor(airline.growth)}`}>
                          {formatGrowth(airline.growth)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Upozorenja */}
            {cachedData.recentAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Nedavna upozorenja</h3>
                <div className="space-y-3">
                  {cachedData.recentAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{alert.title}</h4>
                          <p className="text-sm mt-1 opacity-90">{alert.description}</p>
                          <div className="flex items-center mt-2 text-xs opacity-75">
                            <span>{alert.affectedEntity.type}: {alert.affectedEntity.name}</span>
                            <span className="mx-2">•</span>
                            <span>Promjena: {formatGrowth(alert.metrics.changePercent)}</span>
                          </div>
                        </div>
                        <span className="text-xs font-medium uppercase px-2 py-1 rounded">
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Sedmična analiza */}
        {activeTab === 'weekly' && (
          <WeeklyAnalysisTab />
        )}

        {/* Mjesečna analiza */}
        {activeTab === 'monthly' && (
          <MonthlyAnalysisTab />
        )}

        {/* Prilagođena analiza */}
        {activeTab === 'custom' && (
          <CustomAnalysisTab />
        )}

        {/* Komparacija perioda */}
        {activeTab === 'period-comparison' && (
          <PeriodComparisonTab />
        )}

        {/* Aviokompanija/Destinacija analiza */}
        {activeTab === 'airline-destination' && (
          <AirlineDestinationTab />
        )}

        {/* Raspored letenja */}
        {activeTab === 'schedule' && (
          <Suspense fallback={<div className="p-6 text-center">Učitavam raspored...</div>}>
            {React.createElement(
              React.lazy(() => import('@/components/analytics/ScheduleTab')),
              {}
            )}
          </Suspense>
        )}

        {/* Generiši izvještaj */}
        {activeTab === 'generate-report' && (
          <Suspense fallback={<div className="p-6 text-center">Učitavam generiranje izvještaja...</div>}>
            {React.createElement(
              React.lazy(() => import('@/components/analytics/GenerateReportTab')),
              {}
            )}
          </Suspense>
        )}
      </div>
    </div>
  );
}
