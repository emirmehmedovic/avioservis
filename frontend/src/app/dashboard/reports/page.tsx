'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import FixedTanksReport from '@/components/reports/FixedTanksReport';
import TankerVehiclesReport from '@/components/reports/TankerVehiclesReport';
import FuelIntakeReport from '@/components/reports/FuelIntakeReport';
import FuelOperationsReport from '@/components/reports/FuelOperationsReport';
import FuelDrainReport from '@/components/reports/FuelDrainReport';
import ConsolidatedReportExport from '@/components/reports/ConsolidatedReportExport';
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  TruckIcon, 
  BeakerIcon,
  ArrowsRightLeftIcon,
  DocumentDuplicateIcon,
  ArchiveBoxXMarkIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

export default function ReportsPage() {
  const { authUser, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('fixed-tanks');

  useEffect(() => {
    if (!isLoading && authUser) {
      if (authUser.role !== 'ADMIN' && authUser.role !== 'KONTROLA' && authUser.role !== 'FUEL_OPERATOR') {
        router.push('/dashboard');
      }
    }
    if (!isLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isLoading, router]);

  if (isLoading || (!authUser || (authUser.role !== 'ADMIN' && authUser.role !== 'KONTROLA' && authUser.role !== 'FUEL_OPERATOR'))) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-[#e53e3e]/50 mb-4"></div>
          <p className="text-white font-medium">Učitavanje ili provjera pristupa...</p>
        </div>
      </div>
    );
  }

  // Define the tabs for our reports
  const tabs = [
    { id: 'fixed-tanks', label: 'Fiksni Tankovi', icon: <BeakerIcon className="h-5 w-5" /> },
    { id: 'tanker-vehicles', label: 'Avio Cisterne', icon: <TruckIcon className="h-5 w-5" /> },
    { id: 'fuel-intake', label: 'Ulaz Goriva', icon: <ArrowsRightLeftIcon className="h-5 w-5" /> },
    { id: 'fuel-operations', label: 'Operacije Točenja', icon: <DocumentTextIcon className="h-5 w-5" /> },
    { id: 'drained-fuel', label: 'Drenirano Gorivo', icon: <ArchiveBoxXMarkIcon className="h-5 w-5" /> },
    { id: 'export-all', label: 'Eksport svih izvještaja', icon: <DocumentArrowDownIcon className="h-5 w-5" /> },
  ];

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen pb-12 w-full overflow-x-hidden">
      <div className="px-2 sm:px-4 md:px-6 py-6">
        {/* Header with glassmorphism effect */}
        <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-8">
          {/* Subtle red shadows in corners */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
                <ChartBarIcon className="h-8 w-8 mr-3 text-[#e53e3e]" />
                Izvještaji i Statistika
              </h1>
              <p className="text-gray-300 mt-1 ml-11">Pregled svih ključnih podataka o gorivu i operacijama</p>
            </div>
          </div>
        </div>
        
        {/* Tabbed Navigation - Glassmorphism style */}
        <div className="mb-6 overflow-x-auto scrollbar-hide -mx-2 sm:mx-0 px-2 sm:px-0">
          <div className="flex space-x-2 bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] p-2 rounded-xl shadow-lg border border-white/5 min-w-max w-full relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            
            {tabs.map((tab, index) => {
              // Define color for each tab
              const colors = [
                '#4FC3C7', // teal for fixed-tanks
                '#e53e3e', // red for tanker-vehicles
                '#FBBF24', // yellow for fuel-intake
                '#8B5CF6', // purple for fuel-operations
                '#3B82F6', // blue for drained-fuel
                '#10B981', // green for export-all
              ];
              const color = colors[index % colors.length];
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out flex items-center gap-2 rounded-xl backdrop-blur-md whitespace-nowrap flex-shrink-0 relative z-10 ${activeTab === tab.id
                    ? 'text-white shadow-md border border-white/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                  style={{
                    background: activeTab === tab.id ? `linear-gradient(135deg, ${color}20, ${color}40)` : 'transparent',
                    borderBottom: activeTab === tab.id ? `2px solid ${color}` : 'none'
                  }}
                >
                  <span style={{ color: activeTab === tab.id ? color : 'currentColor' }}>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="inline sm:hidden">{tab.id === 'fuel-operations' ? 'Točenje' : tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content based on active tab - Responsive container */}
        <div className="transition-all duration-300 max-w-full overflow-hidden">
          {/* Fixed Tanks Tab */}
          {activeTab === 'fixed-tanks' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-0 sm:p-2 md:p-4">
                <FixedTanksReport />
              </div>
            </div>
          )}
          
          {/* Tanker Vehicles Tab */}
          {activeTab === 'tanker-vehicles' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-0 sm:p-2 md:p-4">
                <TankerVehiclesReport />
              </div>
            </div>
          )}
          
          {/* Fuel Intake Tab */}
          {activeTab === 'fuel-intake' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-0 sm:p-2 md:p-4">
                <FuelIntakeReport />
              </div>
            </div>
          )}
          
          {/* Fuel Operations Tab */}
          {activeTab === 'fuel-operations' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-0 sm:p-2 md:p-4">
                <FuelOperationsReport />
              </div>
            </div>
          )}
          
          {/* Drained Fuel Tab */}
          {activeTab === 'drained-fuel' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-0 sm:p-2 md:p-4">
                <FuelDrainReport />
              </div>
            </div>
          )}
          
          {/* Export All Reports Tab */}
          {activeTab === 'export-all' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-4">
                <ConsolidatedReportExport />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
