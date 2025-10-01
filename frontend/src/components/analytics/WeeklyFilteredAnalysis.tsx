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
  BarChart3
} from 'lucide-react';

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

interface WeeklyFilteredAnalysisProps {
  data: {
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
  };
  airlineName?: string;
  destinationName?: string;
}

export default function WeeklyFilteredAnalysis({ 
  data, 
  airlineName, 
  destinationName 
}: WeeklyFilteredAnalysisProps) {
  // Koristi utility funkcije za formatiranje
  // formatNumber, formatGrowth i formatBAM su importovani

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
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

  // Prepare chart data
  const chartData: ChartDataPoint[] = data.weeklyData.map(week => ({
    period: `${week.week}`,
    current: week.liters,
    previous: 0, // We don't have previous data in this format
    growth: week.growth.liters
  }));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      id="analytics-charts-container"
      data-export="analytics-content"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Sedmična analiza
          </h2>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Period:</span> {formatDateRangeBS(data.filters.startDate, data.filters.endDate)}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {airlineName && (
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-blue-200">
              <div className="p-3 bg-blue-100 rounded-full">
                <Plane className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Aviokompanija</p>
                <p className="text-xl font-bold text-blue-900">{airlineName}</p>
              </div>
            </div>
          )}
          
          {destinationName && (
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-green-200">
              <div className="p-3 bg-green-100 rounded-full">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Destinacija</p>
                <p className="text-xl font-bold text-green-900">{destinationName}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-600 mb-2 truncate">Ukupno sedmica</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{data.summary.totalWeeks}</p>
            <p className="text-xs text-gray-500 break-words">
              Prosjek: {formatNumber(data.summary.avgWeeklyLiters)} L/sedmica
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <Fuel className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-600 mb-2 truncate">Ukupno litara</p>
            <p className="text-3xl font-bold text-gray-900 break-words">{formatNumber(data.summary.totalLiters)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-600 mb-2 truncate">Ukupan prihod</p>
            <p className="text-2xl font-bold text-gray-900 break-words">{formatBAM(data.summary.totalRevenue)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-600 mb-2 truncate">Ukupno operacija</p>
            <p className="text-3xl font-bold text-gray-900">{data.summary.totalOperations}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sedmična potrošnja goriva</h3>
          <p className="text-sm text-gray-600">
            Prikaz potrošnje po sedmicama sa week-over-week rastom
          </p>
        </div>
        <ComparisonChart 
          data={chartData}
          title=""
          subtitle=""
          type="line"
          height={400}
          showGrowth={true}
        />
      </div>

      {/* Detailed Weekly Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Detaljan pregled po sedmicama</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-2 font-semibold text-gray-900">Sedmica</th>
                <th className="text-left py-4 px-2 font-semibold text-gray-900">Period</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Litri</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Kg</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Prihod (BAM)</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Operacije</th>
                <th className="text-center py-4 px-2 font-semibold text-gray-900">Rast (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.weeklyData.map((week, index) => (
                <tr key={week.week} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-2 font-medium">{week.week}</td>
                  <td className="py-4 px-2 text-sm text-gray-600">
                    {formatDateRangeBS(week.weekStart, week.weekEnd)}
                  </td>
                  <td className="text-right py-4 px-2 font-semibold">{formatNumber(week.liters)}</td>
                  <td className="text-right py-4 px-2 font-semibold">{formatNumber(week.kg)}</td>
                  <td className="text-right py-4 px-2 font-semibold">{formatBAM(week.revenue)}</td>
                  <td className="text-right py-4 px-2 font-semibold">{week.operations}</td>
                  <td className="text-center py-4 px-2">
                    <div className="flex items-center justify-center gap-2">
                      {getGrowthIcon(week.growth.liters)}
                      <Badge variant={getGrowthBadgeVariant(week.growth.liters)} className="text-xs">
                        {formatGrowth(week.growth.liters)}
                      </Badge>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
