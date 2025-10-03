'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Calendar, Activity, Loader2 } from 'lucide-react';
import { getStatistics, PeriodStatistics } from '@/services/flightScheduleService';
import { ChartSkeleton } from './AnalyticsLoader';
import ComparisonChart from './ComparisonChart';

interface ScheduleStatisticsProps {
  selectedDate?: string;
  airlineId?: number;
}

export default function ScheduleStatistics({ selectedDate, airlineId }: ScheduleStatisticsProps) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PeriodStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  // Initialize date range
  useEffect(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setDateRange({
      startDate: formatDate(sixMonthsAgo),
      endDate: formatDate(endOfMonth),
    });
  }, []);

  // Fetch statistics when parameters change
  useEffect(() => {
    if (!dateRange.startDate || !dateRange.endDate) return;

    const fetchStatistics = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getStatistics(period, dateRange.startDate, dateRange.endDate, airlineId);
        setData(result);
      } catch (err: any) {
        console.error('Error fetching statistics:', err);
        setError(err.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [period, dateRange, airlineId]);

  // Prepare chart data
  const chartData = data?.statistics.map((stat) => {
    const growth = stat.scheduled > 0 
      ? ((stat.realized - stat.scheduled) / stat.scheduled) * 100 
      : 0;
    return {
      period: stat.label,
      current: stat.realized,
      previous: stat.scheduled,
      growth,
    };
  }) || [];

  const realizationChartData = data?.statistics.map((stat) => {
    const growth = 100 > 0 ? ((stat.realizationRate - 100) / 100) * 100 : 0;
    return {
      period: stat.label,
      current: stat.realizationRate,
      previous: 100, // Target is 100%
      growth,
    };
  }) || [];

  const unplannedChartData = data?.statistics.map((stat) => ({
    period: stat.label,
    current: stat.unplanned,
    previous: 0,
    growth: 0, // No meaningful growth comparison for unplanned
  })) || [];

  // Calculate summary statistics
  const summary = data?.statistics.reduce(
    (acc, stat) => ({
      totalScheduled: acc.totalScheduled + stat.scheduled,
      totalRealized: acc.totalRealized + stat.realized,
      totalUnplanned: acc.totalUnplanned + stat.unplanned,
    }),
    { totalScheduled: 0, totalRealized: 0, totalUnplanned: 0 }
  );

  const overallRate = summary && summary.totalScheduled > 0
    ? (summary.totalRealized / summary.totalScheduled) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Statistika realizovanih operacija</h3>
            <p className="text-sm text-gray-600">Usporedba planiranih i realizovanih operacija po periodima</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Period Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  period === 'weekly'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Sedmično
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  period === 'monthly'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Mjesečno
              </button>
            </div>

            {/* Date Range */}
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">Ukupno planirano</p>
            <p className="text-3xl font-bold text-gray-900">{summary.totalScheduled}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">Ukupno realizovano</p>
            <p className="text-3xl font-bold text-gray-900">{summary.totalRealized}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">Neplanirane operacije</p>
            <p className="text-3xl font-bold text-gray-900">{summary.totalUnplanned}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">Stopa realizacije</p>
            <p className="text-3xl font-bold text-gray-900">{overallRate.toFixed(1)}%</p>
          </motion.div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <>
          <ChartSkeleton />
          <ChartSkeleton />
        </>
      )}

      {/* Charts */}
      {!loading && data && chartData.length > 0 && (
        <>
          {/* Scheduled vs Realized Bar Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Planirane vs Realizovane operacije
              </h3>
              <p className="text-sm text-gray-600">
                Uporedba broja planiranih i realizovanih operacija {period === 'weekly' ? 'po sedmicama' : 'po mjesecima'}
              </p>
            </div>
            <ComparisonChart
              data={chartData}
              title=""
              subtitle=""
              type="bar"
              height={800}
              showGrowth={false}
              period1Label="Planirano"
              period2Label="Realizovano"
              metricLabel="Broj operacija"
            />
          </div>

          {/* Realization Rate Line Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Stopa realizacije
              </h3>
              <p className="text-sm text-gray-600">
                Trend stope realizacije kroz {period === 'weekly' ? 'sedmice' : 'mjesece'}
              </p>
            </div>
            <ComparisonChart
              data={realizationChartData}
              title=""
              subtitle=""
              type="line"
              height={800}
              showGrowth={false}
              period1Label="Cilj"
              period2Label="Realizacija"
              metricLabel="Stopa"
              metricUnit="%"
            />
          </div>

          {/* Unplanned Operations Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Neplanirane operacije
              </h3>
              <p className="text-sm text-gray-600">
                Broj neplaniranih operacija {period === 'weekly' ? 'po sedmicama' : 'po mjesecima'}
              </p>
            </div>
            <ComparisonChart
              data={unplannedChartData}
              title=""
              subtitle=""
              type="bar"
              height={800}
              showGrowth={false}
              period1Label="Referentna"
              period2Label="Neplanirane"
              metricLabel="Broj operacija"
            />
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Detaljna tabela</h3>
              <p className="text-sm text-gray-600">
                Pregled svih {period === 'weekly' ? 'sedmica' : 'mjeseci'} sa detaljima
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Period</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Planirano</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Realizovano</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Neplanirano</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Stopa</th>
                  </tr>
                </thead>
                <tbody>
                  {data.statistics.map((stat, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{stat.label}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-right">{stat.scheduled}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {stat.realized}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {stat.unplanned > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {stat.unplanned}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            stat.realizationRate >= 100
                              ? 'bg-green-100 text-green-800'
                              : stat.realizationRate >= 80
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {stat.realizationRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && data && chartData.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nema podataka za prikaz</p>
            <p className="text-gray-400 text-sm mt-2">Pokušajte sa drugim datumskim opsegom</p>
          </div>
        </div>
      )}
    </div>
  );
}
