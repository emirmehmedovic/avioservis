'use client';

import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface FuelConsumptionChartProps {
  data: Array<{
    date: string;
    totalLiters: number;
    totalKg?: number;
    operationsCount?: number;
  }>;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const FuelConsumptionChart = ({
  data,
  loading,
  error,
  onRetry
}: FuelConsumptionChartProps) => {
  // Format date for display (dd.mm)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  };

  // Format number with thousand separators
  const formatNumber = (num: number) => {
    return num.toLocaleString('bs-BA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-sm">
          <p className="font-semibold text-slate-700 mb-1.5">{data.date}</p>
          <div className="space-y-1">
            <p className="text-slate-600 flex items-center justify-between gap-6">
              <span>Litri:</span>
              <span className="font-semibold text-slate-900">{formatNumber(data.totalLiters)} L</span>
            </p>
            {data.totalKg && (
              <p className="text-slate-600 flex items-center justify-between gap-6">
                <span>Kilogrami:</span>
                <span className="font-semibold text-slate-900">{formatNumber(data.totalKg)} kg</span>
              </p>
            )}
            {data.operationsCount !== undefined && (
              <p className="text-slate-500 flex items-center justify-between gap-6">
                <span>Operacije:</span>
                <span className="font-semibold text-slate-700">{data.operationsCount}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-white rounded-2xl shadow-md border-0">
        <CardHeader className="pb-2 pt-5 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-sky-500" />
              </div>
              Trend Potrošnje Goriva — Zadnjih 30 Dana
            </CardTitle>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="flex items-center gap-1 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">Osvježi</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-6 pb-5">
          {loading ? (
            // Loading skeleton
            <div className="animate-pulse">
              <div className="h-64 bg-slate-100 rounded-lg"></div>
            </div>
          ) : error ? (
            // Error state
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-red-500 text-sm mb-3">{error}</p>
              {onRetry && (
                <Button onClick={onRetry} size="sm" variant="outline" className="border-slate-300 text-slate-600">
                  <RefreshCw size={14} className="mr-2" />
                  Pokušaj ponovo
                </Button>
              )}
            </div>
          ) : data.length === 0 ? (
            // No data
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Nema dostupnih podataka za prikaz
            </div>
          ) : (
            // Chart
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={data}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: '#64748b' }}
                  iconType="line"
                />
                <Area
                  type="monotone"
                  dataKey="totalLiters"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLiters)"
                  name="Litri"
                  dot={false}
                  activeDot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FuelConsumptionChart;
