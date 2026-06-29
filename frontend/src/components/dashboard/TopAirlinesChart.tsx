'use client';

import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Plane, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface TopAirlinesChartProps {
  data: Array<{
    airlineName: string;
    totalLiters: number;
  }>;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// Neutral toned color palette for airlines
const COLORS = [
  '#0369a1', // sky-700
  '#0891b2', // cyan-600
  '#4f46e5', // indigo-600
  '#7c3aed', // violet-600
  '#0d9488', // teal-600
];

const TopAirlinesChart = ({
  data,
  loading,
  error,
  onRetry
}: TopAirlinesChartProps) => {
  // Take top 5 and format
  const topAirlines = data
    .sort((a, b) => b.totalLiters - a.totalLiters)
    .slice(0, 5);

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
          <p className="font-semibold text-slate-700 mb-1">{data.airlineName}</p>
          <p className="text-slate-900 font-semibold">
            {formatNumber(data.totalLiters)} <span className="text-slate-400 font-normal">L</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
    >
      <Card className="bg-white rounded-2xl shadow-md border-0 h-full">
        <CardHeader className="pb-2 pt-5 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Plane className="h-4 w-4 text-indigo-500" />
              </div>
              Top 5 Aviokompanija
            </CardTitle>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="flex items-center gap-1 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <RefreshCw size={14} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-6 pb-5">
          {loading ? (
            // Loading skeleton
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-7 bg-slate-100 rounded w-24"></div>
                  <div className="h-7 bg-slate-100 rounded flex-1"></div>
                </div>
              ))}
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
          ) : topAirlines.length === 0 ? (
            // No data
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Nema dostupnih podataka
            </div>
          ) : (
            // Chart
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={topAirlines}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  dataKey="airlineName"
                  type="category"
                  width={120}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="totalLiters"
                  radius={[0, 4, 4, 0]}
                  animationDuration={1000}
                >
                  {topAirlines.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TopAirlinesChart;
