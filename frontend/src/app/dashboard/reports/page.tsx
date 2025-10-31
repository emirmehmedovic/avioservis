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
  DocumentTextIcon,
  TruckIcon,
  BeakerIcon,
  ArrowsRightLeftIcon,
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
    <div className="bg-white dark:bg-gray-900 min-h-screen pb-12 w-full overflow-x-hidden">
      <div className="px-2 sm:px-4 md:px-6 py-6">
        {/* Tabbed Navigation - Enhanced style */}
        <div className="mb-8 overflow-x-auto scrollbar-hide -mx-2 sm:mx-0 px-2 sm:px-0">
          <div className="flex space-x-2 bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] min-w-max w-full relative py-2 rounded-lg">
            <div className="absolute inset-0 pointer-events-none"></div>
            
            {tabs.map((tab, index) => {
              // Define colors for each tab - using design palette
              const colorSchemes = [
                { active: '#4FC3C7', hover: '#4FC3C720' }, // teal for fixed-tanks
                { active: '#e53e3e', hover: '#e53e3e20' }, // red for tanker-vehicles
                { active: '#FBBF24', hover: '#FBBF2420' }, // yellow for fuel-intake
                { active: '#8B5CF6', hover: '#8B5CF620' }, // purple for fuel-operations
                { active: '#3B82F6', hover: '#3B82F620' }, // blue for drained-fuel
                { active: '#10B981', hover: '#10B98120' }, // green for export-all
              ];
              const scheme = colorSchemes[index % colorSchemes.length];

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out flex items-center gap-2 rounded-lg whitespace-nowrap flex-shrink-0 relative z-10"
                  style={
                    activeTab === tab.id
                      ? {
                          color: scheme.active,
                          backgroundColor: 'transparent',
                        }
                      : {
                          color: '#9CA3AF',
                          backgroundColor: 'transparent',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.backgroundColor = scheme.hover;
                      e.currentTarget.style.color = scheme.active;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#9CA3AF';
                    }
                  }}
                >
                  <span>{tab.icon}</span>
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
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="p-0 sm:p-2 md:p-4">
                <FixedTanksReport />
              </div>
            </div>
          )}

          {/* Tanker Vehicles Tab */}
          {activeTab === 'tanker-vehicles' && (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="p-0 sm:p-2 md:p-4">
                <TankerVehiclesReport />
              </div>
            </div>
          )}

          {/* Fuel Intake Tab */}
          {activeTab === 'fuel-intake' && (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="p-0 sm:p-2 md:p-4">
                <FuelIntakeReport />
              </div>
            </div>
          )}

          {/* Fuel Operations Tab */}
          {activeTab === 'fuel-operations' && (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="p-0 sm:p-2 md:p-4">
                <FuelOperationsReport />
              </div>
            </div>
          )}

          {/* Drained Fuel Tab */}
          {activeTab === 'drained-fuel' && (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="p-0 sm:p-2 md:p-4">
                <FuelDrainReport />
              </div>
            </div>
          )}

          {/* Export All Reports Tab */}
          {activeTab === 'export-all' && (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
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
