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
import financialReportsService, { MrnProfitabilityItem, MrnProfitabilityReport } from '@/services/financialReportsService';

export function MrnProfitabilityTab() {
  // Stanje za datumski raspon - defaultno posljednih 3 mjeseca
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });

  // Stanje za podatke
  const [reportData, setReportData] = useState<MrnProfitabilityReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Definicija kolona za tabelu
  const columns: ColumnDef<MrnProfitabilityItem>[] = [
    {
      accessorKey: 'mrn',
      header: 'MRN Broj',
    },
    {
      accessorKey: 'intakeDate',
      header: 'Datum nabavke',
      cell: ({ row }) => {
        const date = row.original.intakeDate ? new Date(row.original.intakeDate) : null;
        return date && !isNaN(date.getTime()) 
          ? format(date, 'dd.MM.yyyy')
          : 'N/A';
      },
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
      accessorKey: 'cost',
      header: 'Ukupni trošak',
      cell: ({ row }) => new Intl.NumberFormat('bs-BA', {
        style: 'currency',
        currency: 'BAM',
      }).format(row.original.cost),
    },
    {
      accessorKey: 'initialQuantity',
      header: 'Početna količina',
      cell: ({ row }) => row.original.initialQuantity?.toFixed(2) || 'N/A',
    },
    {
      accessorKey: 'revenue',
      header: 'Ukupni prihod',
      cell: ({ row }) => new Intl.NumberFormat('bs-BA', {
        style: 'currency',
        currency: 'BAM',
      }).format(row.original.revenue),
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
      
      const data = await financialReportsService.getMrnProfitabilityReport(params);
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
    if (!reportData?.items.length) return { labels: [], revenues: [], costs: [], profits: [] };
    
    // Uzimamo top 10 MRN-ova sortirano po profitu
    const topItems = [...reportData.items]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
    
    return {
      labels: topItems.map(item => item.mrn.slice(-8)), // Prikazujemo samo posljednjih 8 znakova MRN-a
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
        
        {reportData && (
          <ExportButton 
            data={reportData.items} 
            filename={`mrn-profitabilnost-${format(new Date(), 'yyyy-MM-dd')}`} 
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
                  }).format(reportData.summary.totalRevenue)}
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
                  }).format(reportData.summary.totalCost)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Ukupni profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reportData.summary.totalProfit >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                  {new Intl.NumberFormat('bs-BA', {
                    style: 'currency',
                    currency: 'BAM',
                  }).format(reportData.summary.totalProfit)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Prosječna marža</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reportData.summary.averageMargin >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                  {reportData.summary.averageMargin.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Grafikon */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="text-lg text-gray-800">Top 10 MRN-ova po profitabilnosti</CardTitle>
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
              <CardTitle className="text-lg text-gray-800">MRN profitabilnost - detalji</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <DataTable
                columns={columns}
                data={reportData.items}
                filterColumn="mrn"
                filterPlaceholder="Pretraži po MRN-u..."
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
