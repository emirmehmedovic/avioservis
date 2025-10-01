'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import ComparisonChart, { ChartDataPoint } from './ComparisonChart';
import { formatBAM, formatNumber, formatGrowth } from '@/utils/currencyFormatter';
import { formatDateRangeBS } from '@/utils/dateFormatter';
import { 
  TrendingUp, 
  TrendingDown, 
  Plane, 
  MapPin, 
  Fuel, 
  Weight, 
  DollarSign, 
  Activity,
  Minus 
} from 'lucide-react';

interface AirlineDestinationResultsProps {
  data: {
    summary: {
      totalCurrent: number;
      totalPrevious: number;
      growth: number;
      operationsCount: number;
    };
    detailed: {
      current: {
        liters: number;
        kg: number;
        revenue: number;
        operations: number;
      };
      previous: {
        liters: number;
        kg: number;
        revenue: number;
        operations: number;
      };
      growth: {
        liters: number;
        kg: number;
        revenue: number;
        operations: number;
      };
    };
    chartData: ChartDataPoint[];
    entityInfo: {
      airline: { name: string } | null;
      destination: { name: string; code: string; country: string } | null;
    };
  };
  period: {
    current: { startDate: string; endDate: string };
    previous: { startDate: string; endDate: string };
  };
}

export default function AirlineDestinationResults({ data, period }: AirlineDestinationResultsProps) {
  // Koristi utility funkcije za formatiranje
  // formatNumber, formatGrowth i formatBAM su importovani

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getGrowthColor = (growth: number): string => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthBadgeVariant = (growth: number): "default" | "secondary" | "destructive" | "outline" => {
    if (growth > 15) return 'default'; // Green for significant growth
    if (growth > 0) return 'secondary'; // Blue for moderate growth
    if (growth < -15) return 'destructive'; // Red for significant decline
    return 'outline'; // Gray for minimal change
  };

  return (
    <div className="space-y-6">
      {/* Header with Entity Info - Full Width */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Rezultati analize
          </h2>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Period:</span> {formatDateRangeBS(period.current.startDate, period.current.endDate)}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.entityInfo.airline && (
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-blue-200">
              <div className="p-3 bg-blue-100 rounded-full">
                <Plane className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Aviokompanija</p>
                <p className="text-xl font-bold text-blue-900">{data.entityInfo.airline.name}</p>
              </div>
            </div>
          )}
          
          {data.entityInfo.destination && (
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-green-200">
              <div className="p-3 bg-green-100 rounded-full">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Destinacija</p>
                <p className="text-xl font-bold text-green-900">{data.entityInfo.destination.name}</p>
                <p className="text-sm text-green-700">{data.entityInfo.destination.code}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics - Full Width Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 gap-4 lg:gap-6">
        {/* Liters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Fuel className="h-6 w-6 text-blue-600" />
            </div>
            <Badge variant={getGrowthBadgeVariant(data.detailed.growth.liters)} className="text-xs">
              {formatGrowth(data.detailed.growth.liters)}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Litri</p>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(data.detailed.current.liters)}</p>
            <p className="text-sm text-gray-500 mt-1">
              Prethodno: {formatNumber(data.detailed.previous.liters)}
            </p>
            <p className="text-sm font-medium mt-2">
              <span className={getGrowthColor(data.detailed.growth.liters)}>
                {data.detailed.current.liters > data.detailed.previous.liters ? '+' : ''}
                {formatNumber(data.detailed.current.liters - data.detailed.previous.liters)} litara
              </span>
            </p>
          </div>
        </div>

        {/* Kilograms */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Weight className="h-6 w-6 text-purple-600" />
            </div>
            <Badge variant={getGrowthBadgeVariant(data.detailed.growth.kg)} className="text-xs">
              {formatGrowth(data.detailed.growth.kg)}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Kilogrami</p>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(data.detailed.current.kg)}</p>
            <p className="text-sm text-gray-500 mt-1">
              Prethodno: {formatNumber(data.detailed.previous.kg)}
            </p>
            <p className="text-sm font-medium mt-2">
              <span className={getGrowthColor(data.detailed.growth.kg)}>
                {data.detailed.current.kg > data.detailed.previous.kg ? '+' : ''}
                {formatNumber(data.detailed.current.kg - data.detailed.previous.kg)} kg
              </span>
            </p>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <Badge variant={getGrowthBadgeVariant(data.detailed.growth.revenue)} className="text-xs">
              {formatGrowth(data.detailed.growth.revenue)}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Prihod</p>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(data.detailed.current.revenue)} €</p>
            <p className="text-sm text-gray-500 mt-1">
              Prethodno: {formatNumber(data.detailed.previous.revenue)} €
            </p>
            <p className="text-sm font-medium mt-2">
              <span className={getGrowthColor(data.detailed.growth.revenue)}>
                {data.detailed.current.revenue > data.detailed.previous.revenue ? '+' : ''}
                {formatNumber(data.detailed.current.revenue - data.detailed.previous.revenue)} €
              </span>
            </p>
          </div>
        </div>

        {/* Operations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <Badge variant={getGrowthBadgeVariant(data.detailed.growth.operations)} className="text-xs">
              {formatGrowth(data.detailed.growth.operations)}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Operacije</p>
            <p className="text-3xl font-bold text-gray-900">{data.detailed.current.operations}</p>
            <p className="text-sm text-gray-500 mt-1">
              Prethodno: {data.detailed.previous.operations}
            </p>
            <p className="text-sm font-medium mt-2">
              <span className={getGrowthColor(data.detailed.growth.operations)}>
                {data.detailed.current.operations > data.detailed.previous.operations ? '+' : ''}
                {data.detailed.current.operations - data.detailed.previous.operations} operacija
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Chart - Full Width */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Dnevna komparacija potrošnje</h3>
          <p className="text-sm text-gray-600">
            {`${data.entityInfo.airline?.name || ''} ${data.entityInfo.destination?.name || ''}`.trim()}
          </p>
        </div>
        <ComparisonChart 
          data={data.chartData}
          title=""
          subtitle=""
          type="line"
          height={400}
          showGrowth={true}
        />
      </div>

      {/* Detailed Breakdown Table - Full Width */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Detaljan pregled po metrikama</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-2 font-semibold text-gray-900">Metrika</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Trenutni period</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Prethodni period</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Apsolutna razlika</th>
                <th className="text-right py-4 px-2 font-semibold text-gray-900">Promjena (%)</th>
                <th className="text-center py-4 px-2 font-semibold text-gray-900">Trend</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-2">
                  <div className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Litri</span>
                  </div>
                </td>
                <td className="text-right py-4 px-2 font-semibold text-lg">{formatNumber(data.detailed.current.liters)}</td>
                <td className="text-right py-4 px-2 text-gray-600">{formatNumber(data.detailed.previous.liters)}</td>
                <td className="text-right py-4 px-2 font-medium">
                  {formatNumber(data.detailed.current.liters - data.detailed.previous.liters)}
                </td>
                <td className={`text-right py-4 px-2 font-bold text-lg ${getGrowthColor(data.detailed.growth.liters)}`}>
                  {formatGrowth(data.detailed.growth.liters)}
                </td>
                <td className="text-center py-4 px-2">
                  {getGrowthIcon(data.detailed.growth.liters)}
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-2">
                  <div className="flex items-center gap-2">
                    <Weight className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Kilogrami</span>
                  </div>
                </td>
                <td className="text-right py-4 px-2 font-semibold text-lg">{formatNumber(data.detailed.current.kg)}</td>
                <td className="text-right py-4 px-2 text-gray-600">{formatNumber(data.detailed.previous.kg)}</td>
                <td className="text-right py-4 px-2 font-medium">
                  {formatNumber(data.detailed.current.kg - data.detailed.previous.kg)}
                </td>
                <td className={`text-right py-4 px-2 font-bold text-lg ${getGrowthColor(data.detailed.growth.kg)}`}>
                  {formatGrowth(data.detailed.growth.kg)}
                </td>
                <td className="text-center py-4 px-2">
                  {getGrowthIcon(data.detailed.growth.kg)}
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Prihod (BAM)</span>
                  </div>
                </td>
                <td className="text-right py-4 px-2 font-semibold text-lg">{formatBAM(data.detailed.current.revenue)}</td>
                <td className="text-right py-4 px-2 text-gray-600">{formatBAM(data.detailed.previous.revenue)}</td>
                <td className="text-right py-4 px-2 font-medium">
                  {formatBAM(data.detailed.current.revenue - data.detailed.previous.revenue)}
                </td>
                <td className={`text-right py-4 px-2 font-bold text-lg ${getGrowthColor(data.detailed.growth.revenue)}`}>
                  {formatGrowth(data.detailed.growth.revenue)}
                </td>
                <td className="text-center py-4 px-2">
                  {getGrowthIcon(data.detailed.growth.revenue)}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">Operacije</span>
                  </div>
                </td>
                <td className="text-right py-4 px-2 font-semibold text-lg">{data.detailed.current.operations}</td>
                <td className="text-right py-4 px-2 text-gray-600">{data.detailed.previous.operations}</td>
                <td className="text-right py-4 px-2 font-medium">
                  {data.detailed.current.operations - data.detailed.previous.operations}
                </td>
                <td className={`text-right py-4 px-2 font-bold text-lg ${getGrowthColor(data.detailed.growth.operations)}`}>
                  {formatGrowth(data.detailed.growth.operations)}
                </td>
                <td className="text-center py-4 px-2">
                  {getGrowthIcon(data.detailed.growth.operations)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
