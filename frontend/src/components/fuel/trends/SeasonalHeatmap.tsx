/**
 * SeasonalHeatmap.tsx
 * Komponenta za prikaz sezonskog heatmap-a potrošnje goriva
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { SeasonalHeatmapProps, SeasonalPattern } from '../../../types/fuelReportsTrends.types';

// Color scale za heatmap (od najmanje do najveće potrošnje)
const getHeatmapColor = (value: number): string => {
  // Normalized value između 0 i 1
  const normalized = Math.max(0, Math.min(1, value));
  
  if (normalized < 0.2) return '#dbeafe'; // very light blue
  if (normalized < 0.4) return '#93c5fd'; // light blue
  if (normalized < 0.6) return '#3b82f6'; // blue
  if (normalized < 0.8) return '#1d4ed8'; // dark blue
  return '#1e3a8a'; // very dark blue
};

// Mapiranje sezone na naziv
const getSeasonDisplayName = (season: string): string => {
  const seasonMap: Record<string, string> = {
    spring: 'Proljeće',
    summer: 'Ljeto',
    autumn: 'Jesen',
    winter: 'Zima',
  };
  return seasonMap[season] || season;
};

// Mapiranje mjeseca na naziv
const getMonthDisplayName = (month: string): string => {
  const monthMap: Record<string, string> = {
    '01': 'Jan',
    '02': 'Feb',
    '03': 'Mar',
    '04': 'Apr',
    '05': 'Maj',
    '06': 'Jun',
    '07': 'Jul',
    '08': 'Aug',
    '09': 'Sep',
    '10': 'Okt',
    '11': 'Nov',
    '12': 'Dec',
  };
  
  // Ako je već kratak naziv, vrati kakav jeste
  if (month.length <= 3) return month;
  
  // Inače pokušaj mapirati
  return monthMap[month] || month;
};

const SeasonalHeatmap: React.FC<SeasonalHeatmapProps> = ({
  data,
  title = 'Sezonski uzorci potrošnje',
  height = 300,
  onCellClick,
}) => {
  // Sorting podataka po sezoni (proljeće, ljeto, jesen, zima)
  const sortedData = React.useMemo(() => {
    const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
    return [...data].sort((a, b) => {
      return seasonOrder.indexOf(a.season) - seasonOrder.indexOf(b.season);
    });
  }, [data]);

  // Izračunaj min i max vrijednosti za normalzaciju
  const { minValue, maxValue } = React.useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    
    data.forEach(season => {
      season.months.forEach(month => {
        if (month.index < min) min = month.index;
        if (month.index > max) max = month.index;
      });
    });
    
    return { minValue: min, maxValue: max };
  }, [data]);

  // Normalizuj vrijednost
  const normalizeValue = (value: number): number => {
    if (maxValue === minValue) return 0.5;
    return (value - minValue) / (maxValue - minValue);
  };

  // Handle cell click
  const handleCellClick = (season: SeasonalPattern, month: any) => {
    if (onCellClick) {
      onCellClick(season.season, month.month, month.index);
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
        <div className="text-sm text-gray-600">
          Intenzitet boje predstavlja sezonski indeks potrošnje
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" style={{ height: `${height}px` }}>
          {/* Legend */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Manja potrošnja</span>
            <div className="flex space-x-1">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((value) => (
                <div
                  key={value}
                  className="w-4 h-4 border border-gray-300"
                  style={{ backgroundColor: getHeatmapColor(value) }}
                />
              ))}
            </div>
            <span>Veća potrošnja</span>
          </div>

          {/* Heatmap grid */}
          <div className="space-y-3">
            {sortedData.map((season) => (
              <div key={season.season} className="space-y-2">
                {/* Season header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    {getSeasonDisplayName(season.season)}
                  </h4>
                  <div className="text-xs text-gray-500">
                    Prosjek: {season.averageConsumption.toLocaleString('bs-BA', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })} L
                  </div>
                </div>
                
                {/* Months grid */}
                <div className="grid grid-cols-3 gap-2">
                  {season.months.map((month) => (
                    <div
                      key={month.month}
                      className={`
                        p-3 rounded-lg border cursor-pointer transition-all duration-200
                        hover:scale-105 hover:shadow-md
                        ${onCellClick ? 'hover:border-gray-400' : ''}
                      `}
                      style={{
                        backgroundColor: getHeatmapColor(normalizeValue(month.index)),
                        color: normalizeValue(month.index) > 0.6 ? 'white' : 'black',
                      }}
                      onClick={() => handleCellClick(season, month)}
                      title={`${getMonthDisplayName(month.month)}: ${month.consumption.toLocaleString('bs-BA')} L (indeks: ${month.index.toFixed(2)})`}
                    >
                      <div className="text-xs font-medium">
                        {getMonthDisplayName(month.month)}
                      </div>
                      <div className="text-xs mt-1">
                        {month.consumption.toLocaleString('bs-BA', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })} L
                      </div>
                      <div className="text-xs mt-1 opacity-80">
                        {month.index.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary statistics */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="text-sm font-medium text-gray-900 mb-3">
              Sažetak sezonskih uzoraka
            </h5>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {sortedData.map((season) => (
                <div key={season.season} className="text-center">
                  <div className="font-medium text-gray-900">
                    {getSeasonDisplayName(season.season)}
                  </div>
                  <div className="text-gray-600 mt-1">
                    {season.averageConsumption.toLocaleString('bs-BA', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })} L
                  </div>
                  <div className="text-gray-500 mt-1">
                    Indeks: {season.seasonalIndex.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeasonalHeatmap; 