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
import { getTotalFuelSummary, getTotalFixedTankIntake, getFixedTanks, getFuelIntakes, getFixedTankHistory } from '@/lib/apiService';
import { FixedStorageTank, TankTransaction, FuelIntakeRecord } from '@/types/fuel';

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
  const [isLoading, setIsLoading] = useState(true);
  const [fuelSummary, setFuelSummary] = useState<{
    fixedTanksTotal: number;
    mobileTanksTotal: number;
    grandTotal: number;
  } | null>(null);
  // We don't need monthly intake anymore as we'll show total fuel status instead
  const [fixedTanks, setFixedTanks] = useState<FixedStorageTank[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [fuelAlerts, setFuelAlerts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch fuel summary
        const summary = await getTotalFuelSummary();
        setFuelSummary(summary);
        
        // Fetch fixed tanks
        const tanks = await getFixedTanks();
        setFixedTanks(tanks);
        
        // Fetch recent fuel intakes
        const intakes = await getFuelIntakes();
        
        // Generate alerts based on tank levels
        const alerts = [];
        for (const tank of tanks) {
          const fillPercentage = (tank.current_quantity_liters / tank.capacity_liters) * 100;
          if (fillPercentage < 20) {
            alerts.push({
              id: `tank-low-${tank.id}`,
              title: 'Nizak nivo goriva',
              description: `Tank ${tank.tank_name} (${tank.tank_identifier}) ima manje od 20% kapaciteta`,
              severity: 'high'
            });
          }
        }
        
        // Add alerts for tanks with high levels (over 90%)
        for (const tank of tanks) {
          const fillPercentage = (tank.current_quantity_liters / tank.capacity_liters) * 100;
          if (fillPercentage > 90) {
            alerts.push({
              id: `tank-high-${tank.id}`,
              title: 'Visok nivo goriva',
              description: `Tank ${tank.tank_name} (${tank.tank_identifier}) je na preko 90% kapaciteta`,
              severity: 'medium'
            });
          }
        }
        
        // Limit to 3 alerts
        setFuelAlerts(alerts.slice(0, 3));
        
        // Fetch recent tank transactions for all tanks
        let allTransactions: (TankTransaction & { tankName?: string; tankIdentifier?: string })[] = [];
        for (const tank of tanks.slice(0, 2)) { // Limit to first 2 tanks to avoid too many requests
          try {
            const tankHistory = await getFixedTankHistory(tank.id);
            // Add tank name to each transaction
            const transactionsWithTankName = tankHistory.map(tx => ({
              ...tx,
              tankName: tank.tank_name,
              tankIdentifier: tank.tank_identifier
            }));
            allTransactions = [...allTransactions, ...transactionsWithTankName];
          } catch (error) {
            console.error(`Error fetching history for tank ${tank.id}:`, error);
          }
        }
        
        // Sort transactions by date (newest first) and take the first 5
        allTransactions.sort((a, b) => 
          new Date(b.transaction_datetime).getTime() - new Date(a.transaction_datetime).getTime()
        );
        
        // Convert transactions to activity format
        const activities = allTransactions.slice(0, 5).map(tx => {
          // Determine activity type and details based on transaction type
          let type = '';
          let details = '';
          let status = 'success';
          
          const tankName = tx.tankName || 'Nepoznat tank';
          const tankIdentifier = tx.tankIdentifier || '';
          
          switch(tx.type) {
            case 'intake':
              type = 'Unos goriva';
              details = `Unos ${tx.quantityLiters.toLocaleString('bs-BA')}L u tank ${tankName} (${tankIdentifier})`;
              break;
            case 'transfer_to_mobile':
              type = 'Transfer goriva';
              details = `Transfer ${tx.quantityLiters.toLocaleString('bs-BA')}L iz tanka ${tankName} (${tankIdentifier}) u mobilnu cisternu`;
              break;
            case 'fuel_drain':
              type = 'Drenaža goriva';
              details = `Drenaža ${Math.abs(tx.quantityLiters).toLocaleString('bs-BA')}L iz tanka ${tankName} (${tankIdentifier})`;
              status = 'warning';
              break;
            case 'internal_transfer_in':
              type = 'Interni transfer';
              details = `Primljeno ${tx.quantityLiters.toLocaleString('bs-BA')}L u tank ${tankName} (${tankIdentifier})`;
              break;
            case 'internal_transfer_out':
              type = 'Interni transfer';
              details = `Poslano ${Math.abs(tx.quantityLiters).toLocaleString('bs-BA')}L iz tanka ${tankName} (${tankIdentifier})`;
              break;
            default:
              type = 'Operacija s gorivom';
              details = `${tx.quantityLiters.toLocaleString('bs-BA')}L, tank ${tankName} (${tankIdentifier})`;
          }
          
          // Format date to dd.mm.yyyy format with time
          const date = new Date(tx.transaction_datetime);
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const formattedDate = `${day}.${month}.${year} ${hours}:${minutes}`;
          
          return {
            id: tx.id,
            type,
            details,
            timestamp: formattedDate,
            user: tx.user || 'sistem',
            status
          };
        });
        
        setRecentActivities(activities);
        
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Greška prilikom dohvatanja podataka');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);



  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <motion.div 
          className="h-16 w-16 rounded-full border-t-4 border-b-4 border-indigo-500"
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
      className="space-y-6 px-4 md:px-6 lg:px-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome section */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gray-600 rounded-full filter blur-3xl opacity-10 -translate-y-1/2 translate-x-1/4"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gray-800 rounded-full filter blur-3xl opacity-10 translate-y-1/2 -translate-x-1/4"></div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Dobrodošli u AvioServis Dashboard
              </h1>
              <p className="text-gray-300 mt-1">
                Pregled stanja goriva i operacija
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="backdrop-blur-md bg-white/10 border border-white/20 text-white shadow-lg hover:bg-white/20 transition-all flex items-center gap-1"
              >
                <RefreshCw size={14} />
                <span>Osvježi</span>
              </Button>
              <Button 
                size="sm" 
                className="backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium flex items-center gap-1"
              >
                <Fuel size={14} />
                <span>Unos Goriva</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fuel summary section */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-white/60 to-white/20 shadow-sm border border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Droplet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Fiksni Tankovi</h3>
                    <p className="text-2xl font-bold">{fuelSummary ? formatNumber(parseFloat(fuelSummary.fixedTanksTotal.toFixed(1))) : '0.0'} L</p>
                  </div>
                </div>
                <Link href="/dashboard/fuel" className="text-xs text-blue-600 flex items-center hover:underline">
                  Detalji <ChevronRight size={14} />
                </Link>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full" 
                  style={{ width: '65%' }} 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">65% ukupnog kapaciteta</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/60 to-white/20 shadow-sm border border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                    <Truck className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Mobilne Cisterne</h3>
                    <p className="text-2xl font-bold">{fuelSummary ? formatNumber(parseFloat(fuelSummary.mobileTanksTotal.toFixed(1))) : '0.0'} L</p>
                  </div>
                </div>
                <Link href="/dashboard/vehicles" className="text-xs text-indigo-600 flex items-center hover:underline">
                  Detalji <ChevronRight size={14} />
                </Link>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full" 
                  style={{ width: '40%' }} 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">40% ukupnog kapaciteta</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/60 to-white/20 shadow-sm border border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Ukupno Stanje</h3>
                    <p className="text-2xl font-bold">{fuelSummary ? formatNumber(parseFloat(fuelSummary.grandTotal.toFixed(1))) : '0.0'} L</p>
                  </div>
                </div>
                <Link href="/dashboard/reports" className="text-xs text-green-600 flex items-center hover:underline">
                  Izvještaji <ChevronRight size={14} />
                </Link>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600 rounded-full" 
                  style={{ width: '100%' }} 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Ukupna količina goriva u sistemu</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Tank status section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border border-white/10 overflow-hidden backdrop-blur-md bg-gradient-to-br from-white/60 to-white/20 shadow-lg">
            <CardHeader className="pb-3 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400 rounded-full filter blur-3xl opacity-5"></div>
              <CardTitle className="text-lg font-medium flex items-center">
                <div className="flex items-center justify-center p-2 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 mr-3">
                  <Droplet className="h-5 w-5 text-blue-500" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  Status Fiksnih Tankova
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tank</TableHead>
                      <TableHead>Tip Goriva</TableHead>
                      <TableHead>Kapacitet</TableHead>
                      <TableHead>Trenutno</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fixedTanks.length > 0 ? (
                      fixedTanks.map((tank) => {
                        const fillPercentage = calculateFillPercentage(
                          tank.current_quantity_liters || 0, 
                          tank.capacity_liters || 1
                        );
                        const fillColor = getFillColor(fillPercentage);
                        
                        return (
                          <TableRow key={tank.id}>
                            <TableCell className="font-medium">{tank.tank_name} ({tank.tank_identifier})</TableCell>
                            <TableCell>{tank.fuel_type || 'N/A'}</TableCell>
                            <TableCell>{formatNumber(tank.capacity_liters || 0)} L</TableCell>
                            <TableCell>{formatNumber(tank.current_quantity_liters || 0)} L</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 dark:bg-gray-700">
                                  <div className={`${fillColor} h-2.5 rounded-full`} style={{ width: `${fillPercentage}%` }}></div>
                                </div>
                                <span className="text-xs font-medium">{fillPercentage}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          Nema dostupnih podataka o tankovima
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/fuel" className="flex items-center gap-1">
                    <span>Upravljanje Tankovima</span>
                    <ArrowRight size={14} />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border border-white/10 overflow-hidden backdrop-blur-md bg-gradient-to-br from-white/60 to-white/20 shadow-lg">
            <CardHeader className="pb-3 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400 rounded-full filter blur-3xl opacity-5"></div>
              <CardTitle className="text-lg font-medium flex items-center">
                <div className="flex items-center justify-center p-2 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 mr-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-red-600">
                  Upozorenja
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-4">
                {fuelAlerts.map((alert) => (
                  <motion.div 
                    key={alert.id} 
                    className={`p-4 rounded-xl backdrop-blur-sm border ${
                      alert.severity === 'high' ? 'border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-500/5' : 
                      alert.severity === 'medium' ? 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-yellow-500/5' : 
                      'border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-blue-500/5'
                    }`}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  >
                    <h3 className={`font-semibold mb-1 ${
                      alert.severity === 'high' ? 'text-red-600' : 
                      alert.severity === 'medium' ? 'text-amber-600' : 
                      'text-blue-600'
                    }`}>{alert.title}</h3>
                    <p className="text-sm">{alert.description}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Recent fuel activities */}
      <motion.div variants={itemVariants}>
        <Card className="border border-white/10 overflow-hidden backdrop-blur-md bg-gradient-to-br from-white/60 to-white/20 shadow-lg">
          <CardHeader className="pb-3 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400 rounded-full filter blur-3xl opacity-5"></div>
            <CardTitle className="text-lg font-medium flex items-center">
              <div className="flex items-center justify-center p-2 rounded-full bg-gradient-to-r from-indigo-500/20 to-blue-500/20 mr-3">
                <Activity className="h-5 w-5 text-indigo-500" />
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
                Nedavne Aktivnosti s Gorivom
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="space-y-4">
              {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                <motion.div 
                  key={activity.id} 
                  className="flex items-start pb-4 border-b border-white/10 last:border-0 last:pb-0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center mr-3 border border-white/10">
                    <DropletIcon className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-indigo-600">{activity.type}</h4>
                      <span className="text-xs bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">{activity.timestamp}</span>
                    </div>
                    <p className="text-sm">{activity.details}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-green-500' : 
                        activity.status === 'warning' ? 'bg-amber-500' : 
                        'bg-red-500'
                      } mr-1`}></span>
                      Korisnik: {activity.user}
                    </p>
                  </div>
                </motion.div>
              )) : (
                <motion.div className="flex items-center justify-center py-8 text-muted-foreground">
                  Nema nedavnih aktivnosti za prikaz
                </motion.div>
              )}
            </div>
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/reports" className="flex items-center gap-1">
                  <span>Pogledaj sve aktivnosti</span>
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer */}
      <motion.footer 
        className="text-center text-sm text-muted-foreground py-6"
        variants={itemVariants}
      >
        <p className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent inline-block">
          © 2025 AvioServis. Sva prava pridržana.
        </p>
      </motion.footer>
    </motion.div>
  );
}