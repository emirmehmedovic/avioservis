/**
 * TrendChart.tsx
 * Komponenta za prikaz trend grafika koristeći recharts
 */

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { TrendChartProps, ChartSeries, ChartDataPoint } from '../../../types/fuelReportsTrends.types';

// Color palette za različite serije
const DEFAULT_COLORS = [
  '#2563eb', // blue-600
  '#dc2626', // red-600
  '#16a34a', // green-600
  '#ea580c', // orange-600
  '#7c3aed', // violet-600
  '#db2777', // pink-600
  '#0891b2', // cyan-600
  '#65a30d', // lime-600
];

// Custom tooltip komponenta
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.dataKey}:</span>
            <span className="font-medium text-gray-900">
              {typeof entry.value === 'number' 
                ? entry.value.toLocaleString('bs-BA', { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 2 
                  })
                : entry.value
              }
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Format funkcija za Y ose
const formatYAxisValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const TrendChart: React.FC<TrendChartProps> = ({
  title,
  data,
  height = 400,
  showLegend = true,
  showGrid = true,
  xAxisLabel,
  yAxisLabel,
  onDataPointClick,
}) => {
  // Transformiraj data u format koji recharts razumije
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    // Pronađi sve unikant x vrijednosti
    const allXValues = Array.from(
      new Set(data.flatMap(series => series.data.map(point => point.x)))
    ).sort();

    // Stvori chart data format
    return allXValues.map(x => {
      const dataPoint: any = { x };
      
      data.forEach(series => {
        const point = series.data.find(p => p.x === x);
        dataPoint[series.name] = point ? point.y : null;
      });
      
      return dataPoint;
    });
  }, [data]);

  // Odredi tip grafika na osnovu prvog series-a
  const chartType = data[0]?.type || 'line';

  // Handle click event
  const handleDataPointClick = (data: any, index: number) => {
    if (onDataPointClick) {
      // Pronađi pravu seriju i podatak
      const firstSeries = data[0];
      if (firstSeries) {
        const point: ChartDataPoint = {
          x: data.x,
          y: firstSeries.value,
        };
        const series = data.find((s: ChartSeries) => s.name === firstSeries.dataKey);
        if (series) {
          onDataPointClick(point, series);
        }
      }
    }
  };

  // Renderuj odgovarajući tip chart-a
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
      onClick: onDataPointClick ? handleDataPointClick : undefined,
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="x" />
            <YAxis tickFormatter={formatYAxisValue} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {data.map((series, index) => (
              <Area
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stackId="1"
                stroke={series.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                fill={series.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="x" />
            <YAxis tickFormatter={formatYAxisValue} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {data.map((series, index) => (
              <Bar
                key={series.name}
                dataKey={series.name}
                fill={series.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </BarChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="x" />
            <YAxis tickFormatter={formatYAxisValue} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {data.map((series, index) => (
              <Line
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={series.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            Nema podataka za prikaz
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {(xAxisLabel || yAxisLabel) && (
          <div className="text-sm text-gray-600">
            {xAxisLabel && <span>X-osa: {xAxisLabel}</span>}
            {xAxisLabel && yAxisLabel && <span> | </span>}
            {yAxisLabel && <span>Y-osa: {yAxisLabel}</span>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TrendChart; 