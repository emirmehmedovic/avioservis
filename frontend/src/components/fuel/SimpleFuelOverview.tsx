/**
 * SimpleFuelOverview.tsx
 * Jednostavan pregled tab za statistike - bez kompleksnih API poziva
 */

import React from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend as RechartsLegend, ResponsiveContainer
} from 'recharts';
import { Card } from '@/components/ui/Card';

// Jednostavne boje za chartove
const SIMPLE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

interface FuelStatistics {
  totalFuelDispensed: number;
  fuelByAirline: { airlineName: string; totalLiters: number }[];
  fuelByDay: { date: string; totalLiters: number }[];
  fuelByDestination: { destination: string; totalLiters: number }[];
}

interface SimpleFuelOverviewProps {
  statistics: FuelStatistics | null;
  loading: boolean;
}

export default function SimpleFuelOverview({ statistics, loading }: SimpleFuelOverviewProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nema dostupnih podataka za prikaz</p>
      </div>
    );
  }

  // Pripremi podatke za chartove - pametno grupiranje avio kompanija
  const airlineData = (() => {
    const allAirlines = statistics.fuelByAirline || [];
    
    if (allAirlines.length <= 6) {
      // Ako imamo 6 ili manje, prikaži sve
      return allAirlines.map((item, index) => ({
        name: item.airlineName,
        value: item.totalLiters,
        fill: SIMPLE_COLORS[index % SIMPLE_COLORS.length]
      }));
    } else {
      // Ako imamo više od 6, prikaži top 5 + "Ostale"
      const topAirlines = allAirlines.slice(0, 5);
      const otherAirlines = allAirlines.slice(5);
      const otherTotal = otherAirlines.reduce((sum, item) => sum + item.totalLiters, 0);
      
      const result = topAirlines.map((item, index) => ({
        name: item.airlineName,
        value: item.totalLiters,
        fill: SIMPLE_COLORS[index % SIMPLE_COLORS.length]
      }));
      
      // Dodaj "Ostale" kategoriju
      result.push({
        name: `Ostale (${otherAirlines.length})`,
        value: otherTotal,
        fill: '#9ca3af' // Siva boja za "Ostale"
      });
      
      return result;
    }
  })();

  const destinationData = (statistics.fuelByDestination || []).slice(0, 10).map((item, index) => ({
    name: item.destination,
    value: item.totalLiters
  }));

  const dailyData = (statistics.fuelByDay || []).slice(-14).map(item => ({
    name: new Date(item.date).toLocaleDateString('sr-RS', { 
      month: 'short', 
      day: 'numeric' 
    }),
    value: item.totalLiters
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Potrošnja po avio kompanijama */}
      <Card className="p-6 rounded-xl shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          Potrošnja po Avio Kompanijama
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={airlineData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={2}
              >
                {airlineData.map((entry, index) => (
                  <Cell 
                    key={`airline-${index}`} 
                    fill={entry.fill} 
                  />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value, name) => [
                  `${Number(value).toLocaleString()} L`, 
                  name
                ]} 
              />
              <RechartsLegend 
                wrapperStyle={{ 
                  fontSize: '11px',
                  paddingTop: '10px'
                }}
                iconSize={8}
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                content={(props) => {
                  if (!props.payload) return null;
                  
                  return (
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      paddingTop: '10px',
                      maxWidth: '100%'
                    }}>
                      {props.payload.map((entry, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          marginBottom: '4px',
                          maxWidth: '120px'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: entry.color,
                            marginRight: '4px',
                            borderRadius: '2px',
                            flexShrink: 0
                          }} />
                          <span style={{ 
                            color: '#374151',
                            fontSize: '10px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Potrošnja po destinacijama */}
      <Card className="p-6 rounded-xl shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          Potrošnja po Destinaciji
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={destinationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip 
                formatter={(value) => [`${Number(value).toLocaleString()} L`, 'Potrošnja']} 
              />
              <Bar 
                dataKey="value" 
                name="Potrošnja (L)" 
                fill="#10b981"
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Dnevna potrošnja - preko 2 kolone */}
      <Card className="lg:col-span-2 p-6 rounded-xl shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          Dnevna Potrošnja Goriva (Poslednje 2 nedelje)
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip 
                formatter={(value) => [`${Number(value).toLocaleString()} L`, 'Potrošnja']} 
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Ukupna statistika */}
      <Card className="lg:col-span-2 p-6 rounded-xl shadow-lg border-0 bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          Ukupne Statistike
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-blue-600">
              {statistics.totalFuelDispensed.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Ukupno litara</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {statistics.fuelByAirline?.length || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Avio kompanija</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-purple-600">
              {statistics.fuelByDestination?.length || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Destinacija</div>
          </div>
        </div>
      </Card>
    </div>
  );
}