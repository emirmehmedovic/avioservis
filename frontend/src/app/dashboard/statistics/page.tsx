'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Activity, BarChart3, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import FuelReports from '@/components/fuel/FuelReports';
import FuelProjections from '@/components/fuel/FuelProjections';

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState("reports");
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-6">
        {/* Subtle shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <Activity className="h-8 w-8 mr-2 text-blue-500" />
              Statistika i projekcije
            </h2>
            <p className="text-gray-300 mt-1 ml-10">Analitički pregled podataka i projekcije potrošnje</p>
          </div>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="reports" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="reports" className="flex items-center justify-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Izvještaji
          </TabsTrigger>
          <TabsTrigger value="projections" className="flex items-center justify-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Projekcije potrošnje
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="w-full">
          <FuelReports />
        </TabsContent>
        
        <TabsContent value="projections" className="w-full">
          <FuelProjections />
        </TabsContent>
      </Tabs>
    </div>
  );
}
