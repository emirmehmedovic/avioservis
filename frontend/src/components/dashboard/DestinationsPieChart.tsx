'use client';

import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

interface DestinationsPieChartProps {
  data: Array<{
    destination: string;
    totalLiters: number;
  }>;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// Refined neutral-toned palette for destinations
const COLORS = [
  '#0369a1', // sky-700
  '#4f46e5', // indigo-600
  '#0d9488', // teal-600
  '#7c3aed', // violet-600
  '#0891b2', // cyan-600
  '#6d28d9', // violet-700
  '#047857', // emerald-700
  '#1e40af', // blue-800
];

const DestinationsPieChart = ({
  data,
  loading,
  error,
  onRetry
}: DestinationsPieChartProps) => {
  // Take top 8 destinations and group rest as "Ostalo"
  const sortedData = [...data].sort((a, b) => b.totalLiters - a.totalLiters);
  const top8 = sortedData.slice(0, 8);
  const rest = sortedData.slice(8);

  const chartData = [...top8];
  if (rest.length > 0) {
    const restTotal = rest.reduce((sum, item) => sum + item.totalLiters, 0);
    chartData.push({
      destination: 'Ostalo',
      totalLiters: restTotal
    });
  }

  // Calculate total for percentages
  const total = chartData.reduce((sum, item) => sum + item.totalLiters, 0);

  // Format number with thousand separators
  const formatNumber = (num: number) => {
    return num.toLocaleString('bs-BA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Custom label for pie slices
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is > 5%
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.totalLiters / total) * 100).toFixed(1);
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-sm">
          <p className="font-semibold text-slate-700 mb-1.5">{data.destination}</p>
          <p className="text-slate-900 font-semibold">
            {formatNumber(data.totalLiters)} <span className="text-slate-400 font-normal">L</span>
          </p>
          <p className="text-slate-400 text-xs mt-0.5">{percentage}% od ukupnog</p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-slate-600 truncate">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="bg-white rounded-2xl shadow-md border-0 h-full">
        <CardHeader className="pb-2 pt-5 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-violet-500" />
              </div>
              Distribucija po Destinacijama
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
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-44 h-44 bg-slate-100 rounded-full mb-4"></div>
              <div className="grid grid-cols-2 gap-2 w-full">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-slate-100 rounded"></div>
                ))}
              </div>
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
          ) : chartData.length === 0 ? (
            // No data
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Nema dostupnih podataka
            </div>
          ) : (
            // Chart
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={90}
                  dataKey="totalLiters"
                  animationDuration={1000}
                  strokeWidth={1}
                  stroke="#fff"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DestinationsPieChart;
