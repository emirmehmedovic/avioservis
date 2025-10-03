'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets, 
  Weight, 
  DollarSign, 
  Activity, 
  TrendingUp,
  Plane,
  MapPin,
  Calendar
} from 'lucide-react';
import ComparisonChart from '../ComparisonChart';

interface DailyReportTemplateProps {
  reportData: any;
}

export default function DailyReportTemplate({ reportData }: DailyReportTemplateProps) {
  const { summary, charts, tables, schedule } = reportData;

  const formatNumber = (num: number) => num.toLocaleString('bs-BA');
  const formatCurrency = (num: number) => `KM ${num.toLocaleString('bs-BA', { minimumFractionDigits: 2 })}`;
  const formatNumberOnly = (num: number) => num.toLocaleString('bs-BA', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-8 w-full">
      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Droplets className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900">Ukupno litara</h3>
          </div>
          <p className="text-3xl font-bold text-blue-900">{formatNumber(summary.totalLiters)}</p>
          <p className="text-sm text-blue-700">Prosjecno: {formatNumber(summary.averageLitersPerOperation)} L/operacija</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Weight className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-900">Ukupno kg</h3>
          </div>
          <p className="text-3xl font-bold text-green-900">{formatNumber(summary.totalKg)}</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-purple-900">Ukupni prihod</h3>
          </div>
          <p className="text-3xl font-bold text-purple-900">{formatCurrency(summary.totalRevenue)}</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-orange-900">Operacije</h3>
          </div>
          <p className="text-3xl font-bold text-orange-900">{summary.totalOperations}</p>
          <p className="text-sm text-orange-700">Prosjecno: {summary.averageLitersPerOperation.toFixed(1)} L/operacija</p>
        </div>
      </motion.div>

      {/* Airline Statistics */}
      {charts.airlineBreakdown && charts.airlineBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Plane className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Potrošnja po aviokompaniji</h3>
          </div>
          
          <div className="space-y-4">
            {charts.airlineBreakdown.map((airline: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">{airline.name}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Ukupno</div>
                    <div className="text-lg font-bold text-blue-600">{formatNumber(airline.liters)} L</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Litara</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{formatNumber(airline.liters)}</div>
                    <div className="text-xs text-blue-700">{airline.percentage?.liters?.toFixed(1) || 0}% od ukupno</div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Weight className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Kilograma</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">{formatNumber(airline.kg)}</div>
                    <div className="text-xs text-green-700">{airline.percentage?.kg?.toFixed(1) || 0}% od ukupno</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Schedule Information */}
      {schedule && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Raspored vs Realizacija</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Očekivane operacije</h4>
              <p className="text-2xl font-bold text-blue-900">{schedule.expectedOperations}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Realizovane operacije</h4>
              <p className="text-2xl font-bold text-green-900">{schedule.realizedOperations}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">Stopa realizacije</h4>
              <p className="text-2xl font-bold text-purple-900">{schedule.realizationRate.toFixed(1)}%</p>
            </div>
          </div>

          {schedule.scheduledFlights.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Planirani letovi</h4>
              <div className="space-y-2">
                {schedule.scheduledFlights.map((flight: any, index: number) => {
                  const isRealized = flight.realizedOperations > 0;
                  const isFullyRealized = flight.realizedOperations >= flight.expectedOperations;
                  
                  return (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${
                      isFullyRealized 
                        ? 'bg-green-50 border-green-200' 
                        : isRealized 
                        ? 'bg-yellow-50 border-yellow-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          isFullyRealized ? 'bg-green-500' : isRealized ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <Plane className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">{flight.airline}</span>
                        <span className="text-gray-600">→ {flight.destination}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {isFullyRealized ? (
                            <span className="text-green-700">✓ Kompletno</span>
                          ) : isRealized ? (
                            <span className="text-yellow-700">⚠ Djelomično</span>
                          ) : (
                            <span className="text-red-700">✗ Nedostaje</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {flight.realizedOperations || 0} / {flight.expectedOperations} operacija
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Operations Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-900">Detaljne operacije</h3>
        </div>
        
        {tables.operations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Aviokompanija</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Destinacija</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Broj leta</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Litara</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Kg</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Prihod (BAM)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Operator</th>
                </tr>
              </thead>
              <tbody>
                {tables.operations.map((op: any, index: number) => (
                  <tr key={op.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{op.airline}</td>
                    <td className="py-3 px-4 text-gray-700">{op.destination}</td>
                    <td className="py-3 px-4 text-gray-700">{op.flightNumber || 'N/A'}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatNumber(op.liters)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatNumber(op.kg)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(op.revenue)}
                      {op.currency && op.currency !== 'BAM' && (
                        <span className="text-xs text-gray-500 ml-1">
                          (iz {op.currency}: {formatNumberOnly(op.originalAmount)})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{op.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Nema operacija za ovaj dan</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
