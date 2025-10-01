'use client';

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { formatDateBS, formatDateRangeBS } from '@/utils/dateFormatter';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Fuel,
  Plane,
  DollarSign
} from 'lucide-react';

interface CustomFilteredAnalysisProps {
  data: any;
  airlineName?: string;
  destinationName?: string;
}

export default function CustomFilteredAnalysis({ 
  data, 
  airlineName, 
  destinationName 
}: CustomFilteredAnalysisProps) {
  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6">
            <BarChart3 className="w-12 h-12 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Prilagođena analiza
          </h3>
          <p className="text-gray-600">
            Odaberite period i filtere za detaljnu analizu.
          </p>
        </div>
      </div>
    );
  }

  const { summary, chartData, breakdown } = data;

  // Transform chartData for DailyTrendChart component
  const dailyChartData = chartData?.map((item: any) => ({
    date: item.date,
    liters: item.liters || 0,
    kg: item.kg || 0,
    operations: item.operations || 0,
    revenue: item.revenue || 0
  })) || [];

  // Import utility functions for formatting
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return new Intl.NumberFormat('bs-BA', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1
      }).format(num);
    }
    return new Intl.NumberFormat('bs-BA').format(Math.round(num));
  };

  const formatCurrency = (num: number): string => {
    // Svi prihodi su već konvertovani u BAM na backend-u
    return new Intl.NumberFormat('bs-BA', {
      style: 'currency',
      currency: 'BAM',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatGrowth = (growth: number): string => {
    const sign = growth > 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
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

  return (
    <div className="space-y-6">
      {/* Header with filters info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Prilagođena analiza</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {airlineName && (
              <div className="flex items-center space-x-2">
                <Plane className="w-4 h-4" />
                <span>{airlineName}</span>
              </div>
            )}
            {destinationName && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{destinationName}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Trenutni period:</span>
            <span className="ml-2 text-gray-600">
              {formatDateRangeBS(summary.currentPeriod.startDate, summary.currentPeriod.endDate)}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Period za poređenje:</span>
            <span className="ml-2 text-gray-600">
              {formatDateRangeBS(summary.comparisonPeriod.startDate, summary.comparisonPeriod.endDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Liters */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-0 flex-shrink-0"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Fuel className="h-6 w-6 text-blue-600" />
            </div>
            {getGrowthIcon(summary.growth.liters)}
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-gray-900 truncate">
              {formatNumber(summary.currentPeriod.liters)}
            </p>
            <p className="text-sm text-gray-600">Litara</p>
            <p className={`text-sm font-medium ${getGrowthColor(summary.growth.liters)}`}>
              {formatGrowth(summary.growth.liters)}
            </p>
          </div>
        </motion.div>

        {/* Kg */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-0 flex-shrink-0"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            {getGrowthIcon(summary.growth.kg)}
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-gray-900 truncate">
              {formatNumber(summary.currentPeriod.kg)}
            </p>
            <p className="text-sm text-gray-600">Kilograma</p>
            <p className={`text-sm font-medium ${getGrowthColor(summary.growth.kg)}`}>
              {formatGrowth(summary.growth.kg)}
            </p>
          </div>
        </motion.div>

        {/* Revenue */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-0 flex-shrink-0"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            {getGrowthIcon(summary.growth.revenue)}
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-gray-900 truncate">
              {formatCurrency(summary.currentPeriod.revenue)}
            </p>
            <p className="text-sm text-gray-600">Prihod (BAM)</p>
            <p className={`text-sm font-medium ${getGrowthColor(summary.growth.revenue)}`}>
              {formatGrowth(summary.growth.revenue)}
            </p>
          </div>
        </motion.div>

        {/* Operations */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-0 flex-shrink-0"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            {getGrowthIcon(summary.growth.operations)}
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-gray-900 truncate">
              {summary.currentPeriod.operations}
            </p>
            <p className="text-sm text-gray-600">Operacije</p>
            <p className={`text-sm font-medium ${getGrowthColor(summary.growth.operations)}`}>
              {formatGrowth(summary.growth.operations)}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dnevni trend</h3>
        {dailyChartData && dailyChartData.length > 0 ? (
          <Suspense fallback={
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-pulse" />
                <p className="text-gray-500">Učitavam chart...</p>
              </div>
            </div>
          }>
            {React.createElement(
              React.lazy(() => import('@/components/analytics/DailyTrendChart')),
              {
                data: dailyChartData,
                width: 800,
                height: 300
              }
            )}
          </Suspense>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Nema podataka za prikaz</p>
            </div>
          </div>
        )}
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Airlines Breakdown */}
        {breakdown?.airlines && breakdown.airlines.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Razloženo po aviokompanijama
            </h3>
            <div className="space-y-3">
              {breakdown.airlines.slice(0, 5).map((airline: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{airline.name}</p>
                    <p className="text-sm text-gray-600">
                      {airline.operations} operacija
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatNumber(airline.liters)} L
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(airline.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Destinations Breakdown */}
        {breakdown?.destinations && breakdown.destinations.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Razloženo po destinacijama
            </h3>
            <div className="space-y-3">
              {breakdown.destinations.slice(0, 5).map((destination: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{destination.name}</p>
                    <p className="text-sm text-gray-600">
                      {destination.operations} operacija
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatNumber(destination.liters)} L
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(destination.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
