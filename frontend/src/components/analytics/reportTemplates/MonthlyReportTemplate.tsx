'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets, 
  Weight, 
  DollarSign, 
  Activity, 
  Calendar,
  BarChart3,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Plane,
  Fuel
} from 'lucide-react';
import ComparisonChart from '../ComparisonChart';

interface MonthlyReportTemplateProps {
  reportData: any;
}

export default function MonthlyReportTemplate({ reportData }: MonthlyReportTemplateProps) {
  const { summary, charts, airlineStats, scheduleComparison } = reportData;
  const [expandedWeeks, setExpandedWeeks] = React.useState<Set<number>>(new Set());
  const [expandedDays, setExpandedDays] = React.useState<Set<string>>(new Set());
  const [showScheduleComparison, setShowScheduleComparison] = React.useState(false);
  
  console.log('Debug - MonthlyReportTemplate reportData:', reportData);
  console.log('Debug - MonthlyReportTemplate summary:', summary);
  console.log('Debug - MonthlyReportTemplate charts:', charts);

  const formatNumber = (num: number) => num.toLocaleString('bs-BA');
  const formatCurrency = (num: number) => `KM ${num.toLocaleString('bs-BA', { minimumFractionDigits: 2 })}`;
  const formatGrowth = (growth: number) => {
    if (isNaN(growth) || !isFinite(growth)) return '0.0%';
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };
  const getGrowthColor = (growth: number) => {
    if (isNaN(growth) || !isFinite(growth)) return 'text-gray-500';
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const toggleWeekExpansion = (weekIndex: number) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekIndex)) {
      newExpanded.delete(weekIndex);
    } else {
      newExpanded.add(weekIndex);
    }
    setExpandedWeeks(newExpanded);
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

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
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
          <p className="text-3xl font-bold text-blue-900">{formatNumber(summary.current.totalLiters)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-600">Prethodni mjesec: {formatNumber(summary.previous.totalLiters)}</span>
            <span className={`text-sm font-medium ${getGrowthColor(summary.growth.liters)}`}>
              {formatGrowth(summary.growth.liters)}
            </span>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Weight className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-900">Ukupno kg</h3>
          </div>
          <p className="text-3xl font-bold text-green-900">{formatNumber(summary.current.totalKg)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-600">Prethodni mjesec: {formatNumber(summary.previous.totalKg)}</span>
            <span className={`text-sm font-medium ${getGrowthColor(summary.growth.kg)}`}>
              {formatGrowth(summary.growth.kg)}
            </span>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-purple-900">Ukupni prihod</h3>
          </div>
          <p className="text-3xl font-bold text-purple-900">{formatCurrency(summary.current.totalRevenue)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-600">Prethodni mjesec: {formatCurrency(summary.previous.totalRevenue)}</span>
            <span className={`text-sm font-medium ${getGrowthColor(summary.growth.revenue)}`}>
              {formatGrowth(summary.growth.revenue)}
            </span>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-orange-900">Operacije</h3>
          </div>
          <p className="text-3xl font-bold text-orange-900">{summary.current.totalOperations}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-600">Prethodni mjesec: {summary.previous.totalOperations}</span>
            <span className={`text-sm font-medium ${getGrowthColor(summary.growth.operations)}`}>
              {formatGrowth(summary.growth.operations)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Weekly Breakdown Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900">Sedmični pregled</h3>
        </div>
        
        {charts.weeklyBreakdown.length > 0 ? (
          <div className="space-y-6">
            {/* Dijagram */}
            <ComparisonChart
              data={charts.weeklyBreakdown.map((item: any, index: number) => {
                // Pronađi odgovarajuću sedmicu iz prošlog mjeseca
                const previousWeek = charts.previousMonthWeeklyBreakdown?.[index] || { liters: 0 };
                
                return {
                  period: `Sedmica ${index + 1}`,
                  current: item.liters,
                  previous: previousWeek.liters,
                  growth: previousWeek.liters > 0 ? ((item.liters - previousWeek.liters) / previousWeek.liters) * 100 : 0
                };
              })}
              height={500}
              showGrowth={true}
              period1Label="Prošli mjesec"
              period2Label="Trenutni mjesec"
              metricLabel="Litara"
              metricUnit="L"
            />
            
            {/* Accordion sa detaljima */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Sedmične statistike</h4>
              {charts.weeklyBreakdown.map((week: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleWeekExpansion(index)}
                    className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {expandedWeeks.has(index) ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                        <span className="font-medium text-gray-900">
                          Sedmica {index + 1}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        ({formatDate(week.weekStart)} - {formatDate(week.weekEnd)})
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-blue-600">{formatNumber(week.liters)} L</div>
                        <div className="text-gray-500">Litara</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-green-600">{formatNumber(week.kg)} kg</div>
                        <div className="text-gray-500">Kilograma</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-purple-600">{formatCurrency(week.revenue)}</div>
                        <div className="text-gray-500">Prihod</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-orange-600">{week.operations}</div>
                        <div className="text-gray-500">Operacije</div>
                      </div>
                    </div>
                  </button>
                  
                  {expandedWeeks.has(index) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-200 bg-white"
                    >
                      <div className="p-4">
                        <h5 className="font-medium text-gray-900 mb-3">Dnevni pregled</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {week.dailyStats.map((day: any, dayIndex: number) => (
                            <div key={dayIndex} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Calendar className="w-4 h-4 text-gray-600" />
                                <span className="font-medium text-gray-900">
                                  {formatDate(day.day)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="text-center">
                                  <div className="font-medium text-blue-600">{formatNumber(day.liters)} L</div>
                                  <div className="text-gray-500">Litara</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-green-600">{formatNumber(day.kg)} kg</div>
                                  <div className="text-gray-500">Kilograma</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-purple-600">{formatCurrency(day.revenue)}</div>
                                  <div className="text-gray-500">Prihod</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-orange-600">{day.operations}</div>
                                  <div className="text-gray-500">Operacije</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Nema podataka za sedmični pregled</p>
          </div>
        )}
      </motion.div>

      {/* Month over Month Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900">Month over Month analiza</h3>
        </div>
        
        <div className="space-y-8">
          {/* Liters Trend */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Fuel className="w-5 h-5 text-blue-600" />
              Trend potrošnje - Litara (zadnjih 12 mjeseci)
            </h4>
            <ComparisonChart
              data={[
                {
                  period: "Prethodni mjesec",
                  current: summary.previous.totalLiters,
                  previous: 0,
                  growth: 0
                },
                {
                  period: "Trenutni mjesec", 
                  current: summary.current.totalLiters,
                  previous: summary.previous.totalLiters,
                  growth: summary.growth.liters
                }
              ]}
              height={400}
              showGrowth={true}
            />
          </div>

          {/* Kg Trend */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Weight className="w-5 h-5 text-green-600" />
              Trend potrošnje - Kilograma (zadnjih 12 mjeseci)
            </h4>
            <ComparisonChart
              data={[
                {
                  period: "Prethodni mjesec",
                  current: summary.previous.totalKg,
                  previous: 0,
                  growth: 0
                },
                {
                  period: "Trenutni mjesec",
                  current: summary.current.totalKg,
                  previous: summary.previous.totalKg,
                  growth: summary.growth.kg
                }
              ]}
              height={400}
              showGrowth={true}
            />
          </div>

          {/* Revenue Trend */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Trend prihoda - BAM (zadnjih 12 mjeseci)
            </h4>
            <ComparisonChart
              data={[
                {
                  period: "Prethodni mjesec",
                  current: summary.previous.totalRevenue,
                  previous: 0,
                  growth: 0
                },
                {
                  period: "Trenutni mjesec",
                  current: summary.current.totalRevenue,
                  previous: summary.previous.totalRevenue,
                  growth: summary.growth.revenue
                }
              ]}
              height={400}
              showGrowth={true}
            />
          </div>
        </div>
      </motion.div>

      {/* Schedule vs Realization */}
      {scheduleComparison && scheduleComparison.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">Planirane vs Realizovane operacije</h3>
            </div>
            <button
              onClick={() => setShowScheduleComparison(!showScheduleComparison)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              {showScheduleComparison ? (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Sakrij detalje
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  Prikaži detalje
                </>
              )}
            </button>
          </div>
          
          {showScheduleComparison && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          )}
        </motion.div>
      )}

      {/* Airline Statistics */}
      {airlineStats && airlineStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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

// Helper function to get week number
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function() {
  const date = new Date(this.getTime());
  const dayNum = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - dayNum);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};
