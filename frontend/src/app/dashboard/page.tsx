'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/Table';
import { motion } from 'framer-motion';
import { 
  Droplet, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3, 
  Calendar, 
  Truck, 
  Fuel, 
  RefreshCw, 
  ArrowRight, 
  ChevronRight,
  Clock,
  Activity,
  DropletIcon
} from 'lucide-react';
import {
  getTotalFuelSummary,
  getWeeklyConsumptionTrend,
  getMonthlyFlightRealization,
  getDashboardStatistics
} from '@/lib/apiService';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardKPIData } from '@/types/dashboard';
import KPICard from '@/components/dashboard/KPICard';
import FuelConsumptionChart from '@/components/dashboard/FuelConsumptionChart';
import TopAirlinesChart from '@/components/dashboard/TopAirlinesChart';
import DestinationsPieChart from '@/components/dashboard/DestinationsPieChart';
import { MapPin } from 'lucide-react';

// Helper function to format numbers with thousand separators
const formatNumber = (num: number): string => {
  return num.toLocaleString('bs-BA');
};

// Helper function to calculate fill percentage
const calculateFillPercentage = (current: number, capacity: number): number => {
  return Math.round((current / capacity) * 100);
};

// Helper function to get color based on fill percentage
const getFillColor = (percentage: number): string => {
  if (percentage < 20) return 'bg-red-500';
  if (percentage < 40) return 'bg-orange-500';
  if (percentage < 60) return 'bg-yellow-500';
  if (percentage < 80) return 'bg-blue-500';
  return 'bg-green-500';
};

export default function DashboardPage() {
  const { authUser, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [fuelSummary, setFuelSummary] = useState<{
    fixedTanksTotal: number;
    mobileTanksTotal: number;
    grandTotal: number;
    fixedTanksTotalKg: number;
    mobileTanksTotalKg: number;
    grandTotalKg: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New KPI State
  const [kpiData, setKpiData] = useState<DashboardKPIData>({
    dailyConsumption: { liters: 0, kg: 0, loading: true, error: null },
    weeklyConsumption: { average: 0, trend: 0, loading: true, error: null },
    topDestination: { name: '', volume: 0, percentage: 0, loading: true, error: null },
    flightRealization: { scheduled: 0, realized: 0, rate: 0, unplanned: 0, loading: true, error: null }
  });

  // Chart Data State
  const [chartsData, setChartsData] = useState<{
    fuelByDay: { data: any[]; loading: boolean; error: string | null };
    topAirlines: { data: any[]; loading: boolean; error: string | null };
    destinations: { data: any[]; loading: boolean; error: string | null };
  }>({
    fuelByDay: { data: [], loading: true, error: null },
    topAirlines: { data: [], loading: true, error: null },
    destinations: { data: [], loading: true, error: null }
  });

  // Helper function to get current month name
  const getCurrentMonthName = () => {
    const monthNames = [
      'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
      'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
    ];
    const today = new Date();
    return monthNames[today.getMonth()];
  };

  // Helper function to get date ranges
  const getDateRanges = () => {
    const today = new Date();
    const subDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() - days);
      return result;
    };
    const startOfMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    };
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const last30Days = { startDate: formatDate(subDays(today, 30)), endDate: formatDate(today) };
    const last4Weeks = { startDate: formatDate(subDays(today, 28)), endDate: formatDate(today) };
    const currentMonth = { startDate: formatDate(startOfMonth(today)), endDate: formatDate(today) };

    return { last30Days, last4Weeks, currentMonth };
  };

  // Consolidated fetch function for statistics (Daily consumption + Charts)
  const fetchConsolidatedStatistics = async () => {
    try {
      const { last30Days, currentMonth } = getDateRanges();

      // Fetch both periods in parallel - 2 API calls instead of 4!
      const [stats30Days, statsCurrentMonth] = await Promise.all([
        getDashboardStatistics(last30Days.startDate, last30Days.endDate),
        getDashboardStatistics(currentMonth.startDate, currentMonth.endDate)
      ]);

      // Calculate daily average from 30-day stats
      // Only count days that have operations (days with data)
      let totalLiters = 0;
      (stats30Days.fuelByDay || []).forEach((day: any) => {
        totalLiters += parseFloat(day.totalLiters || 0);
      });

      const daysWithOperations = (stats30Days.fuelByDay || []).length;
      const avgLiters = daysWithOperations > 0 ? totalLiters / daysWithOperations : 0;
      const avgKg = avgLiters * 0.804; // JET-A1 density

      // Update Daily Consumption KPI
      setKpiData(prev => ({
        ...prev,
        dailyConsumption: {
          liters: Math.round(avgLiters),
          kg: Math.round(avgKg),
          loading: false,
          error: null
        }
      }));

      // Update Charts Data (Line Chart + Bar Chart from 30-day stats)
      setChartsData(prev => ({
        ...prev,
        fuelByDay: {
          data: stats30Days.fuelByDay || [],
          loading: false,
          error: null
        },
        topAirlines: {
          data: stats30Days.fuelByAirline || [],
          loading: false,
          error: null
        }
      }));

      // Update Top Destination KPI from current month stats
      // OPTIMIZED: Use fuelByDestination from statistics instead of separate API call
      const destinations = statsCurrentMonth.fuelByDestination || [];
      if (destinations.length > 0) {
        const sortedDest = [...destinations].sort((a: any, b: any) => b.totalLiters - a.totalLiters);
        const topDest = sortedDest[0];
        const totalVolume = destinations.reduce((sum: number, dest: any) => sum + parseFloat(dest.totalLiters || 0), 0);
        const percentage = totalVolume > 0 ? (topDest.totalLiters / totalVolume) * 100 : 0;

        setKpiData(prev => ({
          ...prev,
          topDestination: {
            name: topDest.destination || 'N/A',
            volume: Math.round(topDest.totalLiters || 0),
            percentage: percentage,
            loading: false,
            error: null
          }
        }));
      } else {
        setKpiData(prev => ({
          ...prev,
          topDestination: { name: 'N/A', volume: 0, percentage: 0, loading: false, error: null }
        }));
      }

      // Update Pie Chart data from current month stats
      setChartsData(prev => ({
        ...prev,
        destinations: {
          data: statsCurrentMonth.fuelByDestination || [],
          loading: false,
          error: null
        }
      }));

    } catch (error: any) {
      console.error('Error fetching consolidated statistics:', error);

      // Update all related states with error
      setKpiData(prev => ({
        ...prev,
        dailyConsumption: {
          liters: 0,
          kg: 0,
          loading: false,
          error: error.message || 'Greška prilikom učitavanja'
        },
        topDestination: {
          name: '',
          volume: 0,
          percentage: 0,
          loading: false,
          error: error.message || 'Greška prilikom učitavanja'
        }
      }));

      setChartsData({
        fuelByDay: { data: [], loading: false, error: error.message || 'Greška prilikom učitavanja' },
        topAirlines: { data: [], loading: false, error: error.message || 'Greška prilikom učitavanja' },
        destinations: { data: [], loading: false, error: error.message || 'Greška prilikom učitavanja' }
      });
    }
  };

  const fetchWeeklyConsumption = async () => {
    try {
      const { last4Weeks } = getDateRanges();
      const data = await getWeeklyConsumptionTrend(last4Weeks.startDate, last4Weeks.endDate);
      setKpiData(prev => ({
        ...prev,
        weeklyConsumption: { ...data, loading: false, error: null }
      }));
    } catch (error: any) {
      console.error('Error fetching weekly consumption:', error);
      setKpiData(prev => ({
        ...prev,
        weeklyConsumption: { average: 0, trend: 0, loading: false, error: error.message || 'Greška prilikom učitavanja' }
      }));
    }
  };

  const fetchFlightRealization = async () => {
    try {
      const { currentMonth } = getDateRanges();
      const data = await getMonthlyFlightRealization(currentMonth.startDate, currentMonth.endDate);
      setKpiData(prev => ({
        ...prev,
        flightRealization: { ...data, loading: false, error: null }
      }));
    } catch (error: any) {
      console.error('Error fetching flight realization:', error);
      setKpiData(prev => ({
        ...prev,
        flightRealization: { scheduled: 0, realized: 0, rate: 0, unplanned: 0, loading: false, error: error.message || 'Greška prilikom učitavanja' }
      }));
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading before fetching data
    if (authLoading) {
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch fuel summary (available to all authenticated users)
        const summary = await getTotalFuelSummary();
        setFuelSummary(summary);

        // Check if user has access to reports (ADMIN, KONTROLA, FUEL_OPERATOR)
        const hasReportAccess = authUser?.role && ['ADMIN', 'KONTROLA', 'FUEL_OPERATOR'].includes(authUser.role);

        if (hasReportAccess) {
          // OPTIMIZED: Fetch all KPIs and Charts data in parallel
          await Promise.allSettled([
            fetchConsolidatedStatistics(),
            fetchWeeklyConsumption(),
            fetchFlightRealization()
          ]);
        } else {
          // User doesn't have report access - set default values without errors
          setKpiData({
            dailyConsumption: { liters: 0, kg: 0, loading: false, error: null },
            weeklyConsumption: { average: 0, trend: 0, loading: false, error: null },
            topDestination: { name: 'N/A', volume: 0, percentage: 0, loading: false, error: null },
            flightRealization: { scheduled: 0, realized: 0, rate: 0, unplanned: 0, loading: false, error: null }
          });
          setChartsData({
            fuelByDay: { data: [], loading: false, error: null },
            topAirlines: { data: [], loading: false, error: null },
            destinations: { data: [], loading: false, error: null }
          });
        }

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Greška prilikom dohvatanja podataka');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [authLoading, authUser]);



  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <motion.div
          className="h-12 w-12 rounded-full border-2 border-slate-200 border-t-slate-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[80vh] flex-col">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Greška prilikom učitavanja podataka</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Pokušaj ponovo
        </Button>
      </div>
    );
  }

  // Define animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  // Format number with thousand separator
  const formatNumber = (num: number) => {
    return num.toLocaleString('bs-BA');
  };

  // Calculate fill percentage
  const calculateFillPercentage = (current: number, capacity: number) => {
    return Math.min(Math.round((current / capacity) * 100), 100);
  };

  // Get color based on fill percentage
  const getFillColor = (percentage: number) => {
    if (percentage < 20) return 'bg-red-500';
    if (percentage < 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <motion.div 
      className="space-y-8 px-4 md:px-6 lg:px-8 pb-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome header — no card, just inline */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 pt-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-400 mt-1 text-sm">
              Pregled stanja goriva i operacija
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5 px-4"
            >
              <RefreshCw size={14} />
              <span>Osvježi</span>
            </Button>
            <Button 
              size="sm" 
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all font-medium flex items-center gap-1.5 px-4"
            >
              <Fuel size={14} />
              <span>Unos Goriva</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Fuel summary — 3 cards: first dark "hero", other two light */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Hero card — Ukupno Stanje */}
          <Card className="bg-slate-900 rounded-2xl shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <Link href="/dashboard/reports">
                  <div className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <ArrowRight size={13} className="text-white/50" />
                  </div>
                </Link>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">Ukupno Stanje</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <p className="text-4xl font-bold text-white leading-none">
                  {fuelSummary ? formatNumber(parseFloat(fuelSummary.grandTotal.toFixed(0))) : '0'}
                </p>
                <span className="text-sm font-medium text-white/50">L</span>
              </div>
              <p className="text-xs text-white/40 mb-5">
                {fuelSummary ? formatNumber(parseFloat(fuelSummary.grandTotalKg.toFixed(0))) : '0'} kg ukupno
              </p>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white/50 rounded-full" style={{ width: '100%' }} />
              </div>
              <p className="text-xs text-white/30 mt-2">Svo gorivo u sistemu</p>
            </CardContent>
          </Card>

          {/* Light card — Fiksni Tankovi */}
          <Card className="bg-white rounded-2xl shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center">
                  <Droplet className="h-5 w-5 text-sky-500" />
                </div>
                <Link href="/dashboard/fuel">
                  <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <ArrowRight size={13} className="text-slate-400" />
                  </div>
                </Link>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Fiksni Tankovi</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <p className="text-4xl font-bold text-slate-900 leading-none">
                  {fuelSummary ? formatNumber(parseFloat(fuelSummary.fixedTanksTotal.toFixed(0))) : '0'}
                </p>
                <span className="text-sm font-medium text-slate-400">L</span>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                {fuelSummary ? formatNumber(parseFloat(fuelSummary.fixedTanksTotalKg.toFixed(0))) : '0'} kg
              </p>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-sky-400 rounded-full" style={{ width: '65%' }} />
              </div>
              <p className="text-xs text-slate-400 mt-2">65% ukupnog kapaciteta</p>
            </CardContent>
          </Card>

          {/* Light card — Mobilne Cisterne */}
          <Card className="bg-white rounded-2xl shadow-md border-0">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-indigo-500" />
                </div>
                <Link href="/dashboard/vehicles">
                  <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <ArrowRight size={13} className="text-slate-400" />
                  </div>
                </Link>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Mobilne Cisterne</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <p className="text-4xl font-bold text-slate-900 leading-none">
                  {fuelSummary ? formatNumber(parseFloat(fuelSummary.mobileTanksTotal.toFixed(0))) : '0'}
                </p>
                <span className="text-sm font-medium text-slate-400">L</span>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                {fuelSummary ? formatNumber(parseFloat(fuelSummary.mobileTanksTotalKg.toFixed(0))) : '0'} kg
              </p>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: '40%' }} />
              </div>
              <p className="text-xs text-slate-400 mt-2">40% ukupnog kapaciteta</p>
            </CardContent>
          </Card>

        </div>
      </motion.div>

      {/* KPI Metrics — first card hero (dark), rest light */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Prosječna Potrošnja Dnevno"
            value={kpiData.dailyConsumption.liters}
            unit="L/dan"
            subtitle={`${kpiData.dailyConsumption.kg.toLocaleString('bs-BA', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} kg/dan`}
            icon={TrendingUp}
            iconColor="text-white"
            iconBgColor="bg-white/15"
            isHero={true}
            loading={kpiData.dailyConsumption.loading}
            error={kpiData.dailyConsumption.error}
            onRetry={fetchConsolidatedStatistics}
          />

          <KPICard
            title="Prosječna Potrošnja Sedmično"
            value={kpiData.weeklyConsumption.average}
            unit="L/sedmica"
            subtitle="Zadnje 4 sedmice"
            icon={Calendar}
            iconColor="text-teal-600"
            iconBgColor="bg-teal-50"
            trend={kpiData.weeklyConsumption.trend !== 0 ? {
              value: kpiData.weeklyConsumption.trend,
              direction: kpiData.weeklyConsumption.trend > 0 ? 'up' : 'down'
            } : undefined}
            loading={kpiData.weeklyConsumption.loading}
            error={kpiData.weeklyConsumption.error}
            onRetry={fetchWeeklyConsumption}
          />

          <KPICard
            title="Najbolja Destinacija"
            value={kpiData.topDestination.name || 'N/A'}
            subtitle={kpiData.topDestination.volume > 0 ? `${kpiData.topDestination.volume.toLocaleString('bs-BA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} L (${kpiData.topDestination.percentage.toFixed(1)}%)` : 'Nema podataka'}
            icon={MapPin}
            iconColor="text-violet-600"
            iconBgColor="bg-violet-50"
            loading={kpiData.topDestination.loading}
            error={kpiData.topDestination.error}
            onRetry={fetchConsolidatedStatistics}
          />

          <KPICard
            title={`Realizacija — ${getCurrentMonthName()}`}
            value={kpiData.flightRealization.rate.toFixed(0)}
            unit="%"
            subtitle={`${kpiData.flightRealization.realized}/${kpiData.flightRealization.scheduled} planiranih${kpiData.flightRealization.unplanned > 0 ? ` (+${kpiData.flightRealization.unplanned})` : ''}`}
            icon={Activity}
            iconColor="text-amber-600"
            iconBgColor="bg-amber-50"
            loading={kpiData.flightRealization.loading}
            error={kpiData.flightRealization.error}
            onRetry={fetchFlightRealization}
          />
        </div>
      </motion.div>

      {/* Fuel Consumption Trend Chart */}
      <motion.div variants={itemVariants}>
        <FuelConsumptionChart
          data={chartsData.fuelByDay.data}
          loading={chartsData.fuelByDay.loading}
          error={chartsData.fuelByDay.error}
          onRetry={fetchConsolidatedStatistics}
        />
      </motion.div>

      {/* Airlines & Destinations */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopAirlinesChart
            data={chartsData.topAirlines.data}
            loading={chartsData.topAirlines.loading}
            error={chartsData.topAirlines.error}
            onRetry={fetchConsolidatedStatistics}
          />
          <DestinationsPieChart
            data={chartsData.destinations.data}
            loading={chartsData.destinations.loading}
            error={chartsData.destinations.error}
            onRetry={fetchConsolidatedStatistics}
          />
        </div>
      </motion.div>

      {/* Footer */}
      <motion.footer 
        className="text-center text-xs text-slate-300 py-4"
        variants={itemVariants}
      >
        © 2025 AvioServis. Sva prava pridržana.
      </motion.footer>
    </motion.div>
  );
}
