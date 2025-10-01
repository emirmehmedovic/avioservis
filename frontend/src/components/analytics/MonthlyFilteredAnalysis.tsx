'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ComparisonChart, { ChartDataPoint } from './ComparisonChart';
import { formatBAM, formatNumber, formatGrowth } from '@/utils/currencyFormatter';
import { formatDateRangeBS, formatMonthYearBS } from '@/utils/dateFormatter';
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

interface MonthlyFilteredAnalysisProps {
  data: {
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
  };
  airlineName?: string;
  destinationName?: string;
}

export default function MonthlyFilteredAnalysis({ 
  data, 
  airlineName, 
  destinationName 
}: MonthlyFilteredAnalysisProps) {
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

  // Prepare chart data for liters
  const litersChartData: ChartDataPoint[] = data.monthlyData.map(month => ({
    period: month.monthName,
    current: month.liters,
    previous: 0, // We don't have previous data in this format
    growth: month.growth.liters
  }));

  // Prepare chart data for revenue
  const revenueChartData: ChartDataPoint[] = data.monthlyData.map(month => ({
    period: month.monthName,
    current: month.revenue,
    previous: 0, // We don't have previous data in this format
    growth: month.growth.revenue
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
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Mjesečna analiza
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
            <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-600 mb-2 truncate">Ukupno mjeseci</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{data.summary.totalMonths}</p>
            <p className="text-xs text-gray-500 break-words">
              Prosjek: {formatNumber(data.summary.avgMonthlyLiters)} L/mjesec
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
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <DollarSign className="h-6 w-6 text-blue-600" />
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

      {/* Charts Section - Single Column Layout */}
      <div className="space-y-6">
        {/* Liters Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mjesečna potrošnja - Bar Chart</h3>
            <p className="text-sm text-gray-600">
              Prikaz potrošnje litara po mjesecima
            </p>
          </div>
          <ComparisonChart 
            data={litersChartData}
            title=""
            subtitle=""
            type="bar"
            height={400}
            showGrowth={true}
          />
        </div>

        {/* Liters Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Trend potrošnje - Line Chart</h3>
            <p className="text-sm text-gray-600">
              Trend potrošnje litara kroz mjesece
            </p>
          </div>
          <ComparisonChart 
            data={litersChartData}
            title=""
            subtitle=""
            type="line"
            height={400}
            showGrowth={true}
          />
        </div>

        {/* Revenue Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mjesečni prihod - Bar Chart</h3>
            <p className="text-sm text-gray-600">
              Prikaz prihoda u BAM po mjesecima
            </p>
          </div>
          <ComparisonChart 
            data={revenueChartData}
            title=""
            subtitle=""
            type="bar"
            height={400}
            showGrowth={true}
          />
        </div>

        {/* Revenue Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Trend prihoda - Line Chart</h3>
            <p className="text-sm text-gray-600">
              Trend prihoda u BAM kroz mjesece
            </p>
          </div>
          <ComparisonChart 
            data={revenueChartData}
            title=""
            subtitle=""
            type="line"
            height={400}
            showGrowth={true}
          />
        </div>
      </div>

      {/* Detailed Monthly Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Detaljan pregled po mjesecima</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-2 font-semibold text-gray-900">Mjesec</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Litri</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Kg</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Prihod (BAM)</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Operacije</th>
                <th className="text-center py-4 px-2 font-semibold text-gray-900">Rast litara (%)</th>
                <th className="text-center py-4 px-2 font-semibold text-gray-900">Rast prihoda (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.monthlyData.map((month, index) => (
                <tr key={month.month} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-2 font-medium">{month.monthName}</td>
                  <td className="text-right py-4 px-2 font-semibold">{formatNumber(month.liters)}</td>
                  <td className="text-right py-4 px-2 font-semibold">{formatNumber(month.kg)}</td>
                  <td className="text-right py-4 px-2 font-semibold">{formatBAM(month.revenue)}</td>
                  <td className="text-right py-4 px-2 font-semibold">{month.operations}</td>
                  <td className="text-center py-4 px-2">
                    <div className="flex items-center justify-center gap-2">
                      {getGrowthIcon(month.growth.liters)}
                      <Badge variant={getGrowthBadgeVariant(month.growth.liters)} className="text-xs">
                        {formatGrowth(month.growth.liters)}
                      </Badge>
                    </div>
                  </td>
                  <td className="text-center py-4 px-2">
                    <div className="flex items-center justify-center gap-2">
                      {getGrowthIcon(month.growth.revenue)}
                      <Badge variant={getGrowthBadgeVariant(month.growth.revenue)} className="text-xs">
                        {formatGrowth(month.growth.revenue)}
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
