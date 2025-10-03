'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets, 
  Weight, 
  DollarSign, 
  Activity, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar
} from 'lucide-react';
import ComparisonChart from '../ComparisonChart';

interface ComparisonReportTemplateProps {
  reportData: any;
}

export default function ComparisonReportTemplate({ reportData }: ComparisonReportTemplateProps) {
  const { summary, comparison, charts, tables, trends } = reportData;

  const formatNumber = (num: number) => num.toLocaleString('bs-BA');
  const formatCurrency = (num: number) => `KM ${num.toLocaleString('bs-BA', { minimumFractionDigits: 2 })}`;
  const formatGrowth = (growth: number) => {
    const sign = growth > 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  return (
    <div className="space-y-8 w-full">
      {/* Period Comparison Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Period 1 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-blue-900">{comparison.period1.label}</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Litara</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{formatNumber(comparison.period1.liters)}</p>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Weight className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Kg</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{formatNumber(comparison.period1.kg)}</p>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Prihod</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(comparison.period1.revenue)}</p>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Operacije</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">{comparison.period1.operations}</p>
            </div>
          </div>
        </div>

        {/* Period 2 */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-semibold text-green-900">{comparison.period2.label}</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Litara</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{formatNumber(comparison.period2.liters)}</p>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Weight className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Kg</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{formatNumber(comparison.period2.kg)}</p>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Prihod</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(comparison.period2.revenue)}</p>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Operacije</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">{comparison.period2.operations}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Growth Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900">Analiza rasta</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-700">Litara</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {summary.growth.liters > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-2xl font-bold ${
                summary.growth.liters > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatGrowth(summary.growth.liters)}
              </span>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Weight className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-700">Kg</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {summary.growth.kg > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-2xl font-bold ${
                summary.growth.kg > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatGrowth(summary.growth.kg)}
              </span>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-gray-700">Prihod</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {summary.growth.revenue > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-2xl font-bold ${
                summary.growth.revenue > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatGrowth(summary.growth.revenue)}
              </span>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-gray-700">Operacije</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {summary.growth.operations > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-2xl font-bold ${
                summary.growth.operations > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatGrowth(summary.growth.operations)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Charts Section */}
      {charts && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Period Comparison Chart */}
          {charts.periodComparison && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">Komparativni pregled</h3>
              </div>
              <ComparisonChart
                data={charts.periodComparison}
                height={500}
                showGrowth={true}
                period1Label="Period 1"
                period2Label="Period 2"
                metricLabel="Vrijednost"
                metricUnit=""
              />
            </div>
          )}

          {/* Trend Analysis */}
          {trends && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">Analiza trendova</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Period 1</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Litara:</span>
                      <span className="font-medium">{formatNumber(trends.period1.liters)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kg:</span>
                      <span className="font-medium">{formatNumber(trends.period1.kg)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prihod:</span>
                      <span className="font-medium">{formatCurrency(trends.period1.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Operacije:</span>
                      <span className="font-medium">{trends.period1.operations}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Period 2</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Litara:</span>
                      <span className="font-medium">{formatNumber(trends.period2.liters)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kg:</span>
                      <span className="font-medium">{formatNumber(trends.period2.kg)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prihod:</span>
                      <span className="font-medium">{formatCurrency(trends.period2.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Operacije:</span>
                      <span className="font-medium">{trends.period2.operations}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Charts */}
          {charts.airlineComparison && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-900">Pregled po aviokompaniji</h3>
              </div>
              <ComparisonChart
                data={charts.airlineComparison}
                height={400}
                showGrowth={true}
                period1Label="Period 1"
                period2Label="Period 2"
                metricLabel="Litara"
                metricUnit="L"
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Tables Section */}
      {tables && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          {tables.operations && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-6 h-6 text-gray-600" />
                <h3 className="text-xl font-semibold text-gray-900">Detaljne operacije</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Period</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Litara</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Kg</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Prihod</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Operacije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.operations.map((row: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">{row.period}</td>
                        <td className="py-3 px-4 text-right text-gray-900">{formatNumber(row.liters)}</td>
                        <td className="py-3 px-4 text-right text-gray-900">{formatNumber(row.kg)}</td>
                        <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                        <td className="py-3 px-4 text-right text-gray-900">{row.operations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
