'use client';

import React, { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { ColumnDef } from '@tanstack/react-table';
import { format, subMonths } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { DateRangePicker } from './DateRangePicker';
import { DataTable } from './DataTable';
import { ProfitChart } from './ProfitChart';
import { ExportButton } from './ExportButton';
import financialReportsService, { AirlineProfitabilityItem } from '@/services/financialReportsService';

export function AirlineProfitabilityTab() {
  // Stanje za datumski raspon - defaultno posljednih 3 mjeseca
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });

  // Stanje za podatke
  const [reportData, setReportData] = useState<AirlineProfitabilityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Definicija kolona za tabelu
  const columns: ColumnDef<AirlineProfitabilityItem>[] = [
    {
      accessorKey: 'airlineName',
      header: 'Aviokompanija',
    },
    {
      accessorKey: 'flightCount',
      header: 'Broj letova',
    },
    {
      accessorKey: 'quantity_liters',
      header: 'Količina (L)',
      cell: ({ row }) => row.original.quantity_liters.toFixed(2),
    },
    {
      accessorKey: 'quantity_kg',
      header: 'Količina (kg)',
      cell: ({ row }) => row.original.quantity_kg.toFixed(2),
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

  // Sažetak podataka
  const summary = React.useMemo(() => {
    if (!reportData.length) return {
      totalFlights: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      averageMargin: 0,
      totalQuantityLiters: 0,
      totalQuantityKg: 0,
    };
    
    const totalFlights = reportData.reduce((sum, item) => sum + item.flightCount, 0);
    const totalRevenue = reportData.reduce((sum, item) => sum + item.revenue, 0);
    const totalCost = reportData.reduce((sum, item) => sum + item.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    // Provjera da ne dijelimo s nulom
    const averageMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const totalQuantityLiters = reportData.reduce((sum, item) => sum + item.quantity_liters, 0);
    const totalQuantityKg = reportData.reduce((sum, item) => sum + item.quantity_kg, 0);
    
    return {
      totalFlights,
      totalRevenue,
      totalCost,
      totalProfit,
      averageMargin,
      totalQuantityLiters,
      totalQuantityKg,
    };
  }, [reportData]);

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
      
      const data = await financialReportsService.getAirlineProfitabilityReport(params);
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

  // Priprema podataka za grafikon
  const chartData = React.useMemo(() => {
    if (!reportData.length) return { labels: [], revenues: [], costs: [], profits: [] };
    
    // Uzimamo top 10 aviokompanija sortirano po profitu
    const topItems = [...reportData]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
    
    return {
      labels: topItems.map(item => item.airlineName),
      revenues: topItems.map(item => item.revenue),
      costs: topItems.map(item => item.cost),
      profits: topItems.map(item => item.profit),
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
        
        {reportData.length > 0 && (
          <ExportButton 
            data={reportData} 
            filename={`aviokompanija-profitabilnost-${format(new Date(), 'yyyy-MM-dd')}`} 
          />
        )}
      </div>
      
      {/* Učitavanje */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
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
      {!loading && !error && reportData.length > 0 && (
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
                  }).format(summary.totalRevenue)}
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
                  }).format(summary.totalCost)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Ukupni profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                  {new Intl.NumberFormat('bs-BA', {
                    style: 'currency',
                    currency: 'BAM',
                  }).format(summary.totalProfit)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Prosječna marža</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.averageMargin >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                  {summary.averageMargin.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Grafikon */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="text-lg text-gray-800">Top 10 aviokompanija po profitabilnosti</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ProfitChart
                chartType="bar"
                labels={chartData.labels}
                revenues={chartData.revenues}
                costs={chartData.costs}
                profits={chartData.profits}
              />
            </CardContent>
          </Card>
          
          {/* Tabela */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="text-lg text-gray-800">Profitabilnost po aviokompanijama - detalji</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <DataTable
                columns={columns}
                data={reportData}
                filterColumn="airlineName"
                filterPlaceholder="Pretraži po aviokompaniji..."
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
