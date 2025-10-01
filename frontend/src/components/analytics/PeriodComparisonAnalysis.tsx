'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import ComparisonChart, { ChartDataPoint } from './ComparisonChart';
import { formatBAM, formatNumber, formatGrowth } from '@/utils/currencyFormatter';
import { formatDateRangeBS } from '@/utils/dateFormatter';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Fuel, 
  Weight, 
  DollarSign, 
  Activity,
  Minus,
  Plane,
  MapPin,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  GitCompare
} from 'lucide-react';

interface WeeklyPeriodData {
  week: string;
  weekStart: string;
  weekEnd: string;
  liters: number;
  kg: number;
  revenue: number;
  operations: number;
}

interface PeriodComparisonData {
  period1: {
    name: string;
    startDate: string;
    endDate: string;
    summary: {
      totalWeeks: number;
      totalLiters: number;
      totalRevenue: number;
      totalOperations: number;
      avgWeeklyLiters: number;
    };
    weeklyData: WeeklyPeriodData[];
  };
  period2: {
    name: string;
    startDate: string;
    endDate: string;
    summary: {
      totalWeeks: number;
      totalLiters: number;
      totalRevenue: number;
      totalOperations: number;
      avgWeeklyLiters: number;
    };
    weeklyData: WeeklyPeriodData[];
  };
  comparison: {
    litersGrowth: number;
    revenueGrowth: number;
    operationsGrowth: number;
    avgWeeklyGrowth: number;
  };
  filters: {
    airlineId: number | null;
    destinationId: string | null;
  };
}

interface PeriodComparisonAnalysisProps {
  data: PeriodComparisonData;
  airlineName?: string;
  destinationName?: string;
}

export default function PeriodComparisonAnalysis({ 
  data, 
  airlineName, 
  destinationName 
}: PeriodComparisonAnalysisProps) {
  
  const [activeMetric, setActiveMetric] = useState<'liters' | 'kg' | 'revenue' | 'operations'>('liters');

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (growth < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getGrowthColor = (growth: number): string => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthBadgeVariant = (growth: number): "default" | "secondary" | "destructive" | "outline" => {
    if (growth > 15) return 'default';
    if (growth > 0) return 'secondary';
    if (growth < -15) return 'destructive';
    return 'outline';
  };

  // Prepare chart data based on active metric
  const getChartData = (): ChartDataPoint[] => {
    const maxWeeks = Math.max(data.period1.weeklyData.length, data.period2.weeklyData.length);
    const chartData: ChartDataPoint[] = [];

    for (let i = 0; i < maxWeeks; i++) {
      const week1 = data.period1.weeklyData[i];
      const week2 = data.period2.weeklyData[i];
      
      let current = 0;
      let previous = 0;
      let period = `Sedmica ${i + 1}`;

      if (week1 && week2) {
        switch (activeMetric) {
          case 'liters':
            current = week2.liters;
            previous = week1.liters;
            break;
          case 'kg':
            current = week2.kg;
            previous = week1.kg;
            break;
          case 'revenue':
            current = week2.revenue;
            previous = week1.revenue;
            break;
          case 'operations':
            current = week2.operations;
            previous = week1.operations;
            break;
        }
        
        const growth = previous > 0 ? ((current - previous) / previous) * 100 : 0;
        
        chartData.push({
          period,
          current,
          previous,
          growth
        });
      }
    }

    return chartData;
  };

  const getMetricLabel = (metric: string): string => {
    switch (metric) {
      case 'liters': return 'Litri';
      case 'kg': return 'Kilogrami';
      case 'revenue': return 'Prihod';
      case 'operations': return 'Operacije';
      default: return metric;
    }
  };

  const getMetricUnit = (metric: string): string => {
    switch (metric) {
      case 'liters': return 'L';
      case 'kg': return 'kg';
      case 'revenue': return 'BAM';
      case 'operations': return '';
      default: return '';
    }
  };

  const formatMetricValue = (value: number, metric: string): string => {
    switch (metric) {
      case 'liters':
        return formatNumber(value) + ' L';
      case 'kg':
        return formatNumber(value) + ' kg';
      case 'revenue':
        return formatBAM(value);
      case 'operations':
        return formatNumber(value);
      default:
        return formatNumber(value);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Header with period info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              {data.period1.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">
              {formatDateRangeBS(data.period1.startDate, data.period1.endDate)}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Sedmica:</span>
                <span className="ml-2 font-medium">{data.period1.summary.totalWeeks}</span>
              </div>
              <div>
                <span className="text-gray-500">Operacije:</span>
                <span className="ml-2 font-medium">{formatNumber(data.period1.summary.totalOperations)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              {data.period2.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">
              {formatDateRangeBS(data.period2.startDate, data.period2.endDate)}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Sedmica:</span>
                <span className="ml-2 font-medium">{data.period2.summary.totalWeeks}</span>
              </div>
              <div>
                <span className="text-gray-500">Operacije:</span>
                <span className="ml-2 font-medium">{formatNumber(data.period2.summary.totalOperations)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters info */}
      {(airlineName || destinationName) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Filteri:</span>
              {airlineName && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Plane className="h-3 w-3" />
                  {airlineName}
                </Badge>
              )}
              {destinationName && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {destinationName}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary comparison cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-white">
            <CardTitle className="text-lg flex items-center gap-2">
              <Fuel className="h-5 w-5 text-blue-600" />
              Potrošnja goriva
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">{data.period1.name}:</span>
                <span className="font-bold text-blue-900">{formatNumber(data.period1.summary.totalLiters)} L</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-700">{data.period2.name}:</span>
                <span className="font-bold text-green-900">{formatNumber(data.period2.summary.totalLiters)} L</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Promjena:</span>
                  <div className="flex items-center gap-2">
                    {getGrowthIcon(data.comparison.litersGrowth)}
                    <Badge variant={getGrowthBadgeVariant(data.comparison.litersGrowth)} className="font-semibold">
                      {formatGrowth(data.comparison.litersGrowth)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-white">
            <CardTitle className="text-lg flex items-center gap-2">
              <Weight className="h-5 w-5 text-orange-600" />
              Kilogrami
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">{data.period1.name}:</span>
                <span className="font-bold text-blue-900">{formatNumber(data.period1.weeklyData.reduce((sum, week) => sum + week.kg, 0))} kg</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-700">{data.period2.name}:</span>
                <span className="font-bold text-green-900">{formatNumber(data.period2.weeklyData.reduce((sum, week) => sum + week.kg, 0))} kg</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Promjena:</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const kg1 = data.period1.weeklyData.reduce((sum, week) => sum + week.kg, 0);
                      const kg2 = data.period2.weeklyData.reduce((sum, week) => sum + week.kg, 0);
                      const kgGrowth = kg1 > 0 ? ((kg2 - kg1) / kg1) * 100 : 0;
                      return (
                        <>
                          {getGrowthIcon(kgGrowth)}
                          <Badge variant={getGrowthBadgeVariant(kgGrowth)} className="font-semibold">
                            {formatGrowth(kgGrowth)}
                          </Badge>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-white">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Prihod
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">{data.period1.name}:</span>
                <span className="font-bold text-blue-900">{formatBAM(data.period1.summary.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-700">{data.period2.name}:</span>
                <span className="font-bold text-green-900">{formatBAM(data.period2.summary.totalRevenue)}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Promjena:</span>
                  <div className="flex items-center gap-2">
                    {getGrowthIcon(data.comparison.revenueGrowth)}
                    <Badge variant={getGrowthBadgeVariant(data.comparison.revenueGrowth)} className="font-semibold">
                      {formatGrowth(data.comparison.revenueGrowth)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-white">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Operacije
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">{data.period1.name}:</span>
                <span className="font-bold text-blue-900">{formatNumber(data.period1.summary.totalOperations)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-700">{data.period2.name}:</span>
                <span className="font-bold text-green-900">{formatNumber(data.period2.summary.totalOperations)}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Promjena:</span>
                  <div className="flex items-center gap-2">
                    {getGrowthIcon(data.comparison.operationsGrowth)}
                    <Badge variant={getGrowthBadgeVariant(data.comparison.operationsGrowth)} className="font-semibold">
                      {formatGrowth(data.comparison.operationsGrowth)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>

      {/* Chart section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card className="mb-8 shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <GitCompare className="h-6 w-6 text-purple-600" />
              Sedmična komparacija - {getMetricLabel(activeMetric)}
            </CardTitle>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(['liters', 'kg', 'revenue', 'operations'] as const).map((metric) => (
                <button
                  key={metric}
                  onClick={() => setActiveMetric(metric)}
                  className={`px-4 py-2 text-sm rounded-md transition-all duration-200 font-medium ${
                    activeMetric === metric
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {getMetricLabel(metric)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-blue-500 rounded-sm"></div>
              <span className="text-gray-600">{data.period2.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-blue-300 rounded-sm"></div>
              <span className="text-gray-600">{data.period1.name}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[500px] bg-gradient-to-br from-gray-50 to-white rounded-lg p-6">
            <ComparisonChart
              data={getChartData()}
              period1Label={data.period1.name}
              period2Label={data.period2.name}
              metricLabel={getMetricLabel(activeMetric)}
              metricUnit={getMetricUnit(activeMetric)}
            />
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Weekly breakdown table */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <Card className="overflow-hidden shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-gray-700" />
            Detaljni sedmični pregled
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Komparacija podataka po sedmicama između {data.period1.name} i {data.period2.name}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Sedmica</th>
                  <th className="text-right py-4 px-4 font-semibold text-blue-700">{data.period1.name}</th>
                  <th className="text-right py-4 px-4 font-semibold text-green-700">{data.period2.name}</th>
                  <th className="text-right py-4 px-4 font-semibold text-purple-700">Promjena</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-600">Prihod 1</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-600">Prihod 2</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-600">Operacije 1</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-600">Operacije 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: Math.max(data.period1.weeklyData.length, data.period2.weeklyData.length) }).map((_, index) => {
                  const week1 = data.period1.weeklyData[index];
                  const week2 = data.period2.weeklyData[index];
                  const litersDiff = (week2?.liters || 0) - (week1?.liters || 0);
                  const litersGrowth = week1?.liters ? (litersDiff / week1.liters) * 100 : 0;

                  return (
                    <tr key={index} className="hover:bg-blue-50 transition-colors duration-150">
                      <td className="py-4 px-6 font-medium text-gray-900 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          Sedmica {index + 1}
                        </div>
                      </td>
                      <td className="text-right py-4 px-4 font-medium text-blue-700">
                        {week1 ? (
                          <div>
                            <div className="text-lg">{formatNumber(week1.liters)} L</div>
                            <div className="text-xs text-gray-500">{formatNumber(week1.operations)} op.</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-right py-4 px-4 font-medium text-green-700">
                        {week2 ? (
                          <div>
                            <div className="text-lg">{formatNumber(week2.liters)} L</div>
                            <div className="text-xs text-gray-500">{formatNumber(week2.operations)} op.</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className={`text-right py-4 px-4 font-semibold`}>
                        {week1 && week2 ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                              litersGrowth > 0 
                                ? 'bg-green-100 text-green-700' 
                                : litersGrowth < 0 
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {getGrowthIcon(litersGrowth)}
                              {formatGrowth(litersGrowth)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-right py-4 px-4 text-gray-600">
                        {week1 ? formatBAM(week1.revenue) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="text-right py-4 px-4 text-gray-600">
                        {week2 ? formatBAM(week2.revenue) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="text-right py-4 px-4 text-gray-600">
                        {week1 ? formatNumber(week1.operations) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="text-right py-4 px-4 text-gray-600">
                        {week2 ? formatNumber(week2.operations) : <span className="text-gray-400">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Table footer with summary */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-center">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-sm text-gray-600">Ukupno litara</div>
                <div className="flex items-center justify-center gap-4 mt-1">
                  <span className="text-blue-700 font-semibold">{formatNumber(data.period1.summary.totalLiters)} L</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-700 font-semibold">{formatNumber(data.period2.summary.totalLiters)} L</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-sm text-gray-600">Ukupno kilogrami</div>
                <div className="flex items-center justify-center gap-4 mt-1">
                  <span className="text-blue-700 font-semibold">{formatNumber(data.period1.weeklyData.reduce((sum, week) => sum + week.kg, 0))} kg</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-700 font-semibold">{formatNumber(data.period2.weeklyData.reduce((sum, week) => sum + week.kg, 0))} kg</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-sm text-gray-600">Ukupan prihod</div>
                <div className="flex items-center justify-center gap-4 mt-1">
                  <span className="text-blue-700 font-semibold">{formatBAM(data.period1.summary.totalRevenue)}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-700 font-semibold">{formatBAM(data.period2.summary.totalRevenue)}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-sm text-gray-600">Ukupno operacija</div>
                <div className="flex items-center justify-center gap-4 mt-1">
                  <span className="text-blue-700 font-semibold">{formatNumber(data.period1.summary.totalOperations)}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-700 font-semibold">{formatNumber(data.period2.summary.totalOperations)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
}
