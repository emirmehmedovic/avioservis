'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Activity, BarChart3, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

// Dynamically import components with no SSR to prevent client-side errors
const FuelReports = dynamic(() => import('@/components/fuel/FuelReports'), { ssr: false });
const FuelProjections = dynamic(() => import('@/components/fuel/FuelProjections'), { ssr: false });

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState("reports");
  
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#4d4c4c] to-[#1a1a1a] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-500" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Statistika i projekcije
                </h1>
                <p className="text-gray-300 text-sm mt-1">Analitički pregled podataka i projekcije potrošnje</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="reports" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-white border border-gray-200 rounded-lg p-1">
          <TabsTrigger value="reports" className="flex items-center justify-center text-gray-700 font-medium data-[state=active]:text-gray-900 data-[state=active]:bg-gray-50">
            <BarChart3 className="h-4 w-4 mr-2" />
            Izvještaji
          </TabsTrigger>
          <TabsTrigger value="projections" className="flex items-center justify-center text-gray-700 font-medium data-[state=active]:text-gray-900 data-[state=active]:bg-gray-50">
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
