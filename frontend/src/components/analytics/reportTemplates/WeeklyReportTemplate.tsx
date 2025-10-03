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
  Calendar,
  BarChart3,
  LineChart,
  Plane,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import ComparisonChart from '../ComparisonChart';

interface WeeklyReportTemplateProps {
  reportData: any;
}

export default function WeeklyReportTemplate({ reportData }: WeeklyReportTemplateProps) {
  const { summary, charts, comparisons, airlineStats, scheduleComparison } = reportData;
  const [expandedDays, setExpandedDays] = React.useState<Set<string>>(new Set());

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };
  
  // Pripremi podatke za line chart sa usporedbom
  const prepareChartData = () => {
    const currentWeek = charts.dailyBreakdown || [];
    const previousWeek = charts.previousWeekDaily || [];
    
    // Kreiraj mapu prethodne sedmice za lakše pronalaženje
    const prevWeekMap = new Map();
    previousWeek.forEach((day: any) => {
      prevWeekMap.set(day.date, day);
    });
    
    return currentWeek.map((day: any) => {
      const prevDay = prevWeekMap.get(day.date);
      const prevLiters = prevDay ? prevDay.liters : 0;
      const prevKg = prevDay ? prevDay.kg : 0;
      const prevRevenue = prevDay ? prevDay.revenue : 0;
      const prevOperations = prevDay ? prevDay.operations : 0;
      
      return {
        period: formatDate(day.date),
        current: day.liters,
        previous: prevLiters,
        growth: prevLiters > 0 ? ((day.liters - prevLiters) / prevLiters) * 100 : 0,
        // Dodatni podaci za tooltip
        currentKg: day.kg,
        previousKg: prevKg,
        currentRevenue: day.revenue,
        previousRevenue: prevRevenue,
        currentOperations: day.operations,
        previousOperations: prevOperations
      };
    });
  };

  const formatNumber = (num: number) => num.toLocaleString('bs-BA');
  const formatCurrency = (num: number) => `KM ${num.toLocaleString('bs-BA', { minimumFractionDigits: 2 })}`;
  const formatGrowth = (growth: number) => {
    const sign = growth > 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const toggleDayExpansion = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

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
        </div>
      </motion.div>

      {/* Week over Week Growth */}
      {comparisons?.previousWeek && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Sedmična komparacija</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Prethodna sedmica</h4>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(comparisons.previousWeek.liters)} L</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Rast u odnosu na prethodnu sedmicu</h4>
              <div className="flex items-center gap-2">
                {summary.weekOverWeekGrowth > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
                <span className={`text-2xl font-bold ${
                  summary.weekOverWeekGrowth > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatGrowth(summary.weekOverWeekGrowth)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Daily Breakdown Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-semibold text-gray-900">Dnevni pregled</h3>
        </div>
        
        {charts.dailyBreakdown.length > 0 ? (
          <div className="space-y-6">
            <div className="text-sm text-gray-600">
              Usporedba trenutne sedmice sa prethodnom sedmicom
            </div>
            
            {/* Line Chart za litara */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-600" />
                Dnevni pregled - Litara
              </h4>
              <ComparisonChart
                data={prepareChartData()}
                height={400}
                showGrowth={true}
              />
            </div>
            
            {/* Detaljni pregled po danima */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                Detaljni pregled po danima
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {charts.dailyBreakdown.map((day: any, index: number) => {
                  const prevDay = charts.previousWeekDaily?.find((d: any) => d.date === day.date);
                  const growth = prevDay && prevDay.liters > 0 ? ((day.liters - prevDay.liters) / prevDay.liters) * 100 : 0;
                  
                  return (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">
                          {formatDate(day.date)}
                        </h5>
                        <span className={`text-sm font-medium ${
                          growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Litara:</span>
                          <div className="text-right">
                            <div className="font-medium">{formatNumber(day.liters)}</div>
                            {prevDay && (
                              <div className="text-xs text-gray-500">
                                Prethodno: {formatNumber(prevDay.liters)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Kg:</span>
                          <div className="text-right">
                            <div className="font-medium">{formatNumber(day.kg)}</div>
                            {prevDay && (
                              <div className="text-xs text-gray-500">
                                Prethodno: {formatNumber(prevDay.kg)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Prihod:</span>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(day.revenue)}</div>
                            {prevDay && (
                              <div className="text-xs text-gray-500">
                                Prethodno: {formatCurrency(prevDay.revenue)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Operacije:</span>
                          <div className="text-right">
                            <div className="font-medium">{day.operations}</div>
                            {prevDay && (
                              <div className="text-xs text-gray-500">
                                Prethodno: {prevDay.operations}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Nema podataka za dnevni pregled</p>
          </div>
        )}
      </motion.div>

      {/* Daily Stats Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-900">Dnevne statistike</h3>
        </div>
        
        {charts.dailyBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Datum</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Litara</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Kg</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Prihod</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Operacije</th>
                </tr>
              </thead>
              <tbody>
                {charts.dailyBreakdown.map((day: any, index: number) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">
                      {formatDate(day.date)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatNumber(day.liters)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatNumber(day.kg)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(day.revenue)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{day.operations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Nema podataka za dnevne statistike</p>
          </div>
        )}
      </motion.div>

      {/* Schedule vs Realization */}
      {scheduleComparison && scheduleComparison.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Planirane vs Realizovane operacije</h3>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Očekivane operacije</h4>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {scheduleComparison.reduce((sum: number, day: any) => sum + day.expectedOperations, 0)}
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-900">Realizovane operacije</h4>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {scheduleComparison.reduce((sum: number, day: any) => sum + day.realizedOperations, 0)}
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium text-purple-900">Stopa realizacije</h4>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {(() => {
                  const totalExpected = scheduleComparison.reduce((sum: number, day: any) => sum + day.expectedOperations, 0);
                  const totalRealized = scheduleComparison.reduce((sum: number, day: any) => sum + day.realizedOperations, 0);
                  return totalExpected > 0 ? ((totalRealized / totalExpected) * 100).toFixed(1) : '0.0';
                })()}%
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {scheduleComparison.map((day: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleDayExpansion(day.date)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {expandedDays.has(day.date) ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      )}
                      <span className="font-medium text-gray-900">
                        {formatDate(day.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Očekivane</div>
                        <div className="text-lg font-bold text-blue-600">{day.expectedOperations}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Realizovane</div>
                        <div className="text-lg font-bold text-green-600">{day.realizedOperations}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Stopa realizacije</div>
                        <div className={`text-lg font-bold ${
                          day.realizationRate >= 80 ? 'text-green-600' : 
                          day.realizationRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {day.realizationRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
                
                {expandedDays.has(day.date) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-gray-200 bg-white"
                  >
                    <div className="p-4">
                      <h5 className="font-medium text-gray-900 mb-3">Planirani letovi</h5>
                      <div className="space-y-2">
                        {day.flights.map((flight: any, flightIndex: number) => {
                          const isRealized = flight.realizedOperations > 0;
                          const isFullyRealized = flight.realizedOperations >= flight.expectedOperations;
                          
                          return (
                            <div key={flightIndex} className={`flex items-center justify-between p-3 rounded-lg border ${
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
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Airline Statistics */}
      {airlineStats && airlineStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Plane className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Pregled po aviokompaniji</h3>
          </div>
          
          <div className="space-y-4">
            {airlineStats.map((airline: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">{airline.airline}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Ukupno</div>
                    <div className="text-lg font-bold text-blue-600">{formatNumber(airline.liters)} L</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Litara</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{formatNumber(airline.liters)}</div>
                    <div className="text-xs text-blue-700">{airline.percentage.liters.toFixed(1)}% od ukupno</div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Weight className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Kilograma</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">{formatNumber(airline.kg)}</div>
                    <div className="text-xs text-green-700">{airline.percentage.kg.toFixed(1)}% od ukupno</div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Prihod</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">{formatCurrency(airline.revenue)}</div>
                    <div className="text-xs text-purple-700">{airline.percentage.revenue.toFixed(1)}% od ukupno</div>
                  </div>
                  
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">Operacije</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-900">{airline.operations}</div>
                    <div className="text-xs text-orange-700">{airline.percentage.operations.toFixed(1)}% od ukupno</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
