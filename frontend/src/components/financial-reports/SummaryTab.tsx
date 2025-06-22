'use client';

import React, { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { format, subMonths } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { DateRangePicker } from './DateRangePicker';
import { DataTable } from './DataTable';
import { ProfitChart } from './ProfitChart';
import { ExportButton } from './ExportButton';
import financialReportsService, { 
  SummaryFinancialReport, 
  MonthlyFinancialBreakdown,
  AirlineProfitabilityItem,
  DestinationProfitabilityItem
} from '@/services/financialReportsService';
import { ColumnDef } from '@tanstack/react-table';

export function SummaryTab() {
  // Stanje za datumski raspon - defaultno posljednih 6 mjeseci
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  // Stanje za podatke
  const [reportData, setReportData] = useState<SummaryFinancialReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Definicija kolona za tabelu mjesečnih podataka
  const monthlyColumns: ColumnDef<MonthlyFinancialBreakdown>[] = [
    {
      accessorKey: 'month',
      header: 'Mjesec',
    },
    {
      accessorKey: 'quantityLiters',
      header: 'Količina (L)',
      cell: ({ row }) => row.original.quantityLiters.toFixed(2),
    },
    {
      accessorKey: 'quantityKg',
      header: 'Količina (kg)',
      cell: ({ row }) => row.original.quantityKg.toFixed(2),
    },
    {
      accessorKey: 'revenue',
      header: 'Prihod',
      cell: ({ row }) => new Intl.NumberFormat('bs-BA', {
        style: 'currency',
        currency: 'BAM',
      }).format(row.original.revenue),
    },
    {
      accessorKey: 'cost',
      header: 'Trošak',
      cell: ({ row }) => new Intl.NumberFormat('bs-BA', {
        style: 'currency',
        currency: 'BAM',
      }).format(row.original.cost),
    },
    {
      accessorKey: 'profit',
      header: 'Profit',
      cell: ({ row }) => {
        const profit = row.original.profit;
        return (
          <div className={`font-medium ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {new Intl.NumberFormat('bs-BA', {
              style: 'currency',
              currency: 'BAM',
            }).format(profit)}
          </div>
        );
      },
    },
    {
      accessorKey: 'margin',
      header: 'Marža (%)',
      cell: ({ row }) => {
        const margin = row.original.margin;
        return (
          <div className={`font-medium ${margin >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {margin.toFixed(2)}%
          </div>
        );
      },
    },
  ];

  // Definicija kolona za tabelu top destinacija
  const destinationColumns: ColumnDef<DestinationProfitabilityItem>[] = [
    {
      accessorKey: 'destination',
      header: 'Destinacija',
    },
    {
      accessorKey: 'flightCount',
      header: 'Broj letova',
    },
    {
      accessorKey: 'profit',
      header: 'Profit',
      cell: ({ row }) => {
        const profit = row.original.profit;
        return (
          <div className={`font-medium ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {new Intl.NumberFormat('bs-BA', {
              style: 'currency',
              currency: 'BAM',
            }).format(profit)}
          </div>
        );
      },
    },
    {
      accessorKey: 'margin',
      header: 'Marža (%)',
      cell: ({ row }) => {
        const margin = row.original.margin;
        return (
          <div className={`font-medium ${margin >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {margin.toFixed(2)}%
          </div>
        );
      },
    },
  ];

  // Definicija kolona za tabelu top aviokompanija
  const airlineColumns: ColumnDef<AirlineProfitabilityItem>[] = [
    {
      accessorKey: 'airlineName',
      header: 'Aviokompanija',
    },
    {
      accessorKey: 'flightCount',
      header: 'Broj letova',
    },
    {
      accessorKey: 'profit',
      header: 'Profit',
      cell: ({ row }) => {
        const profit = row.original.profit;
        return (
          <div className={`font-medium ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {new Intl.NumberFormat('bs-BA', {
              style: 'currency',
              currency: 'BAM',
            }).format(profit)}
          </div>
        );
      },
    },
    {
      accessorKey: 'margin',
      header: 'Marža (%)',
      cell: ({ row }) => {
        const margin = row.original.margin;
        return (
          <div className={`font-medium ${margin >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {margin.toFixed(2)}%
          </div>
        );
      },
    },
  ];

  // Funkcija za dohvat podataka
  const fetchData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd'),
      };
      
      const data = await financialReportsService.getSummaryFinancialReport(params);
      setReportData(data);
    } catch (err) {
      console.error('Greška pri dohvatu podataka:', err);
      setError('Došlo je do greške pri učitavanju izvještaja. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  // Učitaj podatke kad se promijeni datumski raspon
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchData();
    }
  }, [dateRange]);

  // Priprema podataka za grafikon po mjesecima
  const monthlyChartData = React.useMemo(() => {
    if (!reportData?.monthlyBreakdown.length) return { 
      labels: [], 
      revenues: [], 
      costs: [], 
      profits: [] 
    };
    
    // Sortiramo mjesečne podatke po datumu
    const sortedData = [...reportData.monthlyBreakdown].sort((a, b) => {
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });
    
    return {
      labels: sortedData.map(item => format(new Date(item.month), 'MMM yyyy')),
      revenues: sortedData.map(item => item.revenue),
      costs: sortedData.map(item => item.cost),
      profits: sortedData.map(item => item.profit),
    };
  }, [reportData]);

  return (
    <div className="space-y-6">
      {/* Filteri i kontrole */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        
        {reportData?.monthlyBreakdown && reportData.monthlyBreakdown.length > 0 && (
          <ExportButton 
            data={reportData.monthlyBreakdown} 
            filename={`finansije-mjesecni-${format(new Date(), 'yyyy-MM-dd')}`} 
          />
        )}
      </div>
      
      {/* Učitavanje */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}
      
      {/* Greška */}
      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-900 text-white">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Greška</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Prikaz podataka */}
      {!loading && !error && reportData && (
        <>
          {/* Sažetak */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Ukupni prihod</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#10B981]">
                  {new Intl.NumberFormat('bs-BA', {
                    style: 'currency',
                    currency: 'BAM',
                  }).format(reportData.totalRevenue)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Ukupni trošak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {new Intl.NumberFormat('bs-BA', {
                    style: 'currency',
                    currency: 'BAM',
                  }).format(reportData.totalCost)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Ukupni profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reportData.totalProfit >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                  {new Intl.NumberFormat('bs-BA', {
                    style: 'currency',
                    currency: 'BAM',
                  }).format(reportData.totalProfit)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Prosječna marža</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reportData.averageMargin >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                  {reportData.averageMargin.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Mjesečni trend grafikon */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="text-lg text-gray-800">Financijski trend po mjesecima</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ProfitChart
                chartType="line"
                labels={monthlyChartData.labels}
                revenues={monthlyChartData.revenues}
                costs={monthlyChartData.costs}
                profits={monthlyChartData.profits}
              />
            </CardContent>
          </Card>
          
          {/* Top destinacije i aviokompanije */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 destinacija */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-lg text-gray-800">Top 5 destinacija po profitabilnosti</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <DataTable
                  columns={destinationColumns}
                  data={reportData.topDestinations.slice(0, 5)}
                  showPagination={false}
                  showColumnToggle={false}
                />
              </CardContent>
            </Card>
            
            {/* Top 5 aviokompanija */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-lg text-gray-800">Top 5 aviokompanija po profitabilnosti</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <DataTable
                  columns={airlineColumns}
                  data={reportData.topAirlines.slice(0, 5)}
                  showPagination={false}
                  showColumnToggle={false}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Mjesečni detalji */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="text-lg text-gray-800">Finansijski detalji po mjesecima</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <DataTable
                columns={monthlyColumns}
                data={reportData.monthlyBreakdown}
                filterColumn="month"
                filterPlaceholder="Pretraži po mjesecu..."
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
