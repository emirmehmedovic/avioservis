import React, { useState, useEffect, useCallback } from 'react';
import { DocumentArrowDownIcon, ArrowDownTrayIcon, ChartBarIcon, ChartPieIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';
import { fetchWithAuth } from '@/lib/apiService';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';

// Recharts imports
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend as RechartsLegend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

interface Airline {
  id: number;
  name: string;
}

interface Tank {
  id: number;
  name: string;
  identifier: string;
  current_liters: number;
  capacity_liters: number;
}

interface FuelStatistics {
  totalFuelDispensed: number;
  fuelByAirline: {
    airlineName: string;
    totalLiters: number;
  }[];
  fuelByDay: {
    date: string;
    totalLiters: number;
  }[];
  fuelByDestination: {
    destination: string;
    totalLiters: number;
  }[];
  currentTankLevels: {
    tankName: string;
    currentLiters: number;
    capacityLiters: number;
    utilizationPercentage: number;
    fuelType: string;
  }[];
  tankerMetrics: {
    tankerId: number;
    tankerName: string;
    totalIntake: number;
    totalOutput: number;
    balance: number;
  }[];
  fixedTankMetrics: {
    fixedTankId: number;
    fixedTankName: string;
    totalIntake: number;
    totalOutput: number;
    balance: number;
  }[];
  consumptionByTrafficType: { trafficType: string; totalLiters: number }[];
  consumptionByCompanyType: { companyType: string; totalLiters: number }[];
}

export default function FuelReports() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
  });
  const [selectedAirlineId, setSelectedAirlineId] = useState<string>('all');
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [statistics, setStatistics] = useState<FuelStatistics | null>(null);
  const [loading, setLoading] = useState(false);

  // Define a modern color palette for Recharts
  const chartColors = [
    '#4FC3C7', // teal
    '#3B82F6', // blue
    '#FBBF24', // yellow
    '#F87171', // pink
    '#8B5CF6', // purple
    '#F97316', // orange
    '#84CC16', // green
    '#E67E22', // carrot
    '#3498DB', // peter river blue
    '#9333EA'  // wisteria (purple)
  ];
  
  // Animation configuration for charts
  const animationProps = {
    animationDuration: 1000,
    animationEasing: 'ease' as const
  };

  const fetchAirlines = useCallback(async () => {
    try {
      const data = await fetchWithAuth<Airline[]>('/api/fuel/airlines');
      setAirlines(data);
    } catch (error) {
      console.error('Error fetching airlines:', error);
    }
  }, [setAirlines]);

  const fetchTanks = useCallback(async () => {
    try {
      const data = await fetchWithAuth<Tank[]>('/api/fuel/tanks');
      setTanks(data);
    } catch (error) {
      console.error('Error fetching tanks:', error);
    }
  }, [setTanks]);

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/fuel/reports/statistics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      
      if (selectedAirlineId !== 'all') {
        url += `&airlineId=${selectedAirlineId}`;
      }
      
      const data = await fetchWithAuth<FuelStatistics>(url);
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Greška pri dohvaćanju statistike');
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate, selectedAirlineId, setLoading, setStatistics]);

  useEffect(() => {
    fetchAirlines();
    fetchTanks();
  }, [fetchAirlines, fetchTanks]);

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchStatistics();
    }
  }, [dateRange.startDate, dateRange.endDate, selectedAirlineId, fetchStatistics]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const handleAirlineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAirlineId(e.target.value);
  };

  const handleExportCSV = async () => {
    try {
      let url = `/api/fuel/reports/export?format=csv&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      
      if (selectedAirlineId !== 'all') {
        url += `&airlineId=${selectedAirlineId}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `fuel-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        toast.error('Greška pri izvozu podataka');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Greška pri izvozu podataka');
    }
  };

  const sampleStatistics: FuelStatistics = {
    totalFuelDispensed: 25000,
    fuelByAirline: [
      { airlineName: 'Air Serbia', totalLiters: 10000 },
      { airlineName: 'Lufthansa', totalLiters: 8000 },
      { airlineName: 'Turkish Airlines', totalLiters: 5000 },
      { airlineName: 'Wizz Air', totalLiters: 2000 },
    ],
    fuelByDay: [
      { date: '2023-05-01', totalLiters: 1200 },
      { date: '2023-05-02', totalLiters: 800 },
      { date: '2023-05-03', totalLiters: 1500 },
      { date: '2023-05-04', totalLiters: 1000 },
      { date: '2023-05-05', totalLiters: 750 },
      { date: '2023-05-06', totalLiters: 1800 },
      { date: '2023-05-07', totalLiters: 950 },
    ],
    fuelByDestination: [
      { destination: 'Belgrade', totalLiters: 8000 },
      { destination: 'Frankfurt', totalLiters: 6000 },
      { destination: 'Istanbul', totalLiters: 5000 },
      { destination: 'Vienna', totalLiters: 4000 },
      { destination: 'London', totalLiters: 2000 },
    ],
    currentTankLevels: [
      { tankName: 'Tank 1', currentLiters: 5000, capacityLiters: 10000, utilizationPercentage: 50, fuelType: 'Jet A-1' },
      { tankName: 'Tank 2', currentLiters: 3000, capacityLiters: 8000, utilizationPercentage: 37.5, fuelType: 'Jet A-1' },
      { tankName: 'Tank 3', currentLiters: 7500, capacityLiters: 15000, utilizationPercentage: 50, fuelType: 'Jet A-1' },
    ],
    tankerMetrics: [
      { tankerId: 1, tankerName: 'Tanker Alpha', totalIntake: 15000, totalOutput: 12000, balance: 3000 },
      { tankerId: 2, tankerName: 'Tanker Beta', totalIntake: 10000, totalOutput: 11000, balance: -1000 },
    ],
    fixedTankMetrics: [
      { fixedTankId: 101, fixedTankName: 'Fixed Storage A', totalIntake: 50000, totalOutput: 45000, balance: 5000 },
      { fixedTankId: 102, fixedTankName: 'Fixed Storage B', totalIntake: 60000, totalOutput: 58000, balance: 2000 },
    ],
    consumptionByTrafficType: [
      { trafficType: 'Izvoz', totalLiters: 18000 },
      { trafficType: 'Unutrašnji', totalLiters: 7000 },
    ],
    consumptionByCompanyType: [
      { companyType: 'Domaća', totalLiters: 12000 },
      { companyType: 'Strana', totalLiters: 13000 },
    ],
  };

  // Add console.log here to inspect the data
  console.log('Fetched API statistics:', JSON.stringify(statistics, null, 2));
  console.log('Sample statistics:', JSON.stringify(sampleStatistics, null, 2));

  const statsToUse = statistics || sampleStatistics;
  console.log('Stats being used for rendering (statsToUse):', JSON.stringify(statsToUse, null, 2));

  // Format data for Recharts - Airlines Pie Chart
  const airlineChartData = (statsToUse.fuelByAirline || []).map((item, index) => ({
    name: item.airlineName,
    value: item.totalLiters,
    fill: chartColors[index % chartColors.length]
  }));

  // Format data for Recharts - Destinations Bar Chart
  const destinationChartData = (statsToUse.fuelByDestination || []).map(item => ({
    name: item.destination,
    value: item.totalLiters,
    fill: chartColors[1]
  }));

  // Format data for Recharts - Daily Consumption Area Chart
  const dayChartData = (statsToUse.fuelByDay || []).map(item => ({
    date: dayjs(item.date).format('DD.MM'),
    value: item.totalLiters
  }));

  // Format data for Recharts - Tank Utilization Bar Chart
  const tankChartData = (statsToUse.currentTankLevels || []).map(item => ({
    name: item.tankName,
    value: item.utilizationPercentage,
    fill: item.utilizationPercentage < 20 ? '#F87171' : 
          item.utilizationPercentage < 50 ? '#FBBF24' : 
          '#4FC3C7'
  }));

  // Format data for Recharts - Traffic Type Pie Chart
  const trafficTypeChartData = (statsToUse.consumptionByTrafficType || []).map((item, index) => ({
    name: item.trafficType,
    value: item.totalLiters,
    fill: chartColors[index % chartColors.length]
  }));

  // Format data for Recharts - Company Type Pie Chart
  const companyTypeChartData = (statsToUse.consumptionByCompanyType || []).map((item, index) => ({
    name: item.companyType,
    value: item.totalLiters,
    fill: chartColors[index % chartColors.length]
  }));

  // Helper function to safely handle ValueType conversion to number
  const safeNumberValue = (value: any): number => {
    return typeof value === 'string' ? parseFloat(value) : Number(value);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('hr-HR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="hope-gradient rounded-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center">
            <div className="mr-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg">
              <ChartBarIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Izvještaji o Potrošnji Goriva</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-white mb-1">
                Od datuma
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 bg-white/90 backdrop-blur-sm rounded-md"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-white mb-1">
                Do datuma
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 bg-white/90 backdrop-blur-sm rounded-md"
              />
            </div>
            <div>
              <label htmlFor="airlineId" className="block text-sm font-medium text-white mb-1">
                Avio kompanija
              </label>
              <select
                id="airlineId"
                value={selectedAirlineId}
                onChange={handleAirlineChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 bg-white/90 backdrop-blur-sm rounded-md"
              >
                <option value="all">Sve avio kompanije</option>
                {airlines && airlines.length > 0 && airlines.map(airline => (
                  <option key={airline.id} value={airline.id}>
                    {airline.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              >
                <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" />
                Izvoz CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="hope-gradient p-1">
          <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Opšti Pregled', icon: <ChartBarIcon className="h-4 w-4" /> },
              { id: 'consumptionAnalysis', name: 'Analiza Potrošnje', icon: <ChartPieIcon className="h-4 w-4" /> },
              { id: 'inventoryStatus', name: 'Stanje Zaliha', icon: <DocumentArrowDownIcon className="h-4 w-4" /> },
              { id: 'details', name: 'Detaljni Prikazi', icon: <DocumentArrowDownIcon className="h-4 w-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-3 px-4 text-sm font-medium transition-all duration-200 ease-in-out flex items-center gap-2 rounded-t-lg ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-800 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {loading || !statsToUse ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-indigo-500">
              <h4 className="text-sm font-medium uppercase tracking-wider text-indigo-600">Ukupno Natočeno Gorivo</h4>
              <p className="text-3xl font-bold text-gray-800">{formatNumber(statsToUse.totalFuelDispensed)} L</p>
            </Card>
            <Card className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-emerald-500">
              <h4 className="text-sm font-medium uppercase tracking-wider text-emerald-600">Prosječno Dnevno</h4>
              <p className="text-3xl font-bold text-gray-800">
                {formatNumber(statsToUse.totalFuelDispensed / Math.max((statsToUse.fuelByDay || []).length, 1))} L
              </p>
            </Card>
            <Card className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-purple-500">
              <h4 className="text-sm font-medium uppercase tracking-wider text-purple-600">Najveći Potrošač</h4>
              <p className="text-3xl font-bold text-gray-800 break-words">
                {(statsToUse.fuelByAirline && statsToUse.fuelByAirline.length > 0) ? statsToUse.fuelByAirline[0].airlineName : 'N/A'}
              </p>
            </Card>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5 rounded-xl shadow-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Potrošnja po Avio Kompaniji</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={airlineChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={30}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        {...animationProps}
                      >
                        {airlineChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${formatNumber(safeNumberValue(value))} L`, 'Potrošnja']} />
                      <RechartsLegend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              
              <Card className="p-5 rounded-xl shadow-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Potrošnja po Destinaciji</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={destinationChartData} {...animationProps}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => [`${formatNumber(safeNumberValue(value))} L`, 'Potrošnja']} />
                      <Bar dataKey="value" name="Potrošnja (L)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              
              <Card className="p-5 rounded-xl shadow-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Dnevna Potrošnja</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dayChartData} {...animationProps}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => [`${formatNumber(safeNumberValue(value))} L`, 'Potrošnja']} />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        name="Dnevna potrošnja" 
                        stroke={chartColors[0]} 
                        fill={chartColors[0]} 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              
              <Card className="p-5 rounded-xl shadow-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Stanje Mobilnih Tankera (%)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tankChartData} {...animationProps}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip formatter={(value) => [`${value}%`, 'Popunjenost']} />
                      <Bar dataKey="value" name="Popunjenost (%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'consumptionAnalysis' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5 rounded-xl shadow-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Potrošnja po Tipu Saobraćaja</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={trafficTypeChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={30}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {trafficTypeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${formatNumber(Number(value))} L`, 'Potrošnja']} />
                      <RechartsLegend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="p-5 rounded-xl shadow-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Potrošnja po Tipu Kompanije</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={companyTypeChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={30}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {companyTypeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${formatNumber(Number(value))} L`, 'Potrošnja']} />
                      <RechartsLegend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'inventoryStatus' && (
            <div className="space-y-6">
              {/* Tanker Metrics Table */}
              <Card className="rounded-xl shadow-md overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Promet po Mobilnim Tankerima</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanker</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ukupni Ulaz (L)</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ukupni Izlaz (L)</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balans (L)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(statsToUse.tankerMetrics || []).map((tanker) => (
                        <tr key={tanker.tankerId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tanker.tankerName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(tanker.totalIntake)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(tanker.totalOutput)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${tanker.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatNumber(tanker.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Fixed Tank Metrics Table */}
              <Card className="rounded-xl shadow-md overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Promet po Fiksnim Rezervoarima</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rezervoar</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ukupni Ulaz (L)</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ukupni Izlaz (L)</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balans (L)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(statsToUse.fixedTankMetrics || []).map((tank) => (
                        <tr key={tank.fixedTankId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tank.fixedTankName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(tank.totalIntake)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(tank.totalOutput)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${tank.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatNumber(tank.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'details' && (
            <Card className="rounded-xl shadow-md overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Detalji po Destinaciji</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Destinacija
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Količina (L)
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Postotak od ukupno
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(statsToUse.fuelByDestination || []).map((destination, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {destination.destination}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatNumber(destination.totalLiters)} L
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {((destination.totalLiters / Math.max(statsToUse.totalFuelDispensed,1)) * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </motion.div>
  );
}