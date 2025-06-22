'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  DocumentTextIcon,
  ChartPieIcon,
  BuildingOfficeIcon,
  GlobeAmericasIcon 
} from '@heroicons/react/24/outline';
import { DollarSign } from 'lucide-react';

// Uvoz komponenti za finansijske izvještaje
import { MrnProfitabilityTab } from '@/components/financial-reports/MrnProfitabilityTab';
import { DestinationProfitabilityTab } from '@/components/financial-reports/DestinationProfitabilityTab';
import { AirlineProfitabilityTab } from '@/components/financial-reports/AirlineProfitabilityTab';
import { SummaryTab } from '@/components/financial-reports/SummaryTab';

export default function FinancialReportsPage() {
  const { authUser, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('mrn-profitability');

  useEffect(() => {
    console.log('DEBUG - authUser:', authUser);
    console.log('DEBUG - isLoading:', isLoading);
    console.log('DEBUG - authUser role:', authUser?.role);
    console.log('DEBUG - Role check:', authUser?.role !== 'ADMIN' && authUser?.role !== 'KONTROLA');
    
    if (!isLoading && authUser) {
      if (authUser.role !== 'ADMIN' && authUser.role !== 'KONTROLA') {
        console.log('DEBUG - Redirecting to dashboard due to insufficient permissions');
        router.push('/dashboard'); // Redirekcija za korisnike bez pristupa
      } else {
        console.log('DEBUG - User has correct permissions, staying on page');
      }
    }
    if (!isLoading && !authUser) {
      console.log('DEBUG - No authUser, redirecting to login');
      router.push('/login');
    }
  }, [authUser, isLoading, router]);

  if (isLoading || (!authUser || (authUser.role !== 'ADMIN' && authUser.role !== 'KONTROLA'))) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-[#e53e3e]/50 mb-4"></div>
          <p className="text-white font-medium">Učitavanje ili provjera pristupa...</p>
        </div>
      </div>
    );
  }

  // Definiši tabove za finansijske izvještaje
  const tabs = [
    { id: 'mrn-profitability', label: 'Profitabilnost po MRN', icon: <DocumentTextIcon className="h-5 w-5" /> },
    { id: 'destination-profitability', label: 'Profitabilnost po Destinaciji', icon: <GlobeAmericasIcon className="h-5 w-5" /> },
    { id: 'airline-profitability', label: 'Profitabilnost po Aviokompaniji', icon: <BuildingOfficeIcon className="h-5 w-5" /> },
    { id: 'summary-report', label: 'Ukupni Finansijski Izvještaj', icon: <ChartPieIcon className="h-5 w-5" /> },
  ];

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen pb-12 w-full overflow-x-hidden">
      <div className="px-2 sm:px-4 md:px-6 py-6">
        {/* Header sa glassmorphism efektom */}
        <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-8">
          {/* Suptilne zelene sjene u ćoškovima */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#10B981] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
                <DollarSign className="h-8 w-8 mr-3 text-[#10B981]" />
                Finansijski Izvještaji
              </h1>
              <p className="text-gray-300 mt-1 ml-11">Pregled profitabilnosti po MRN, destinaciji i aviokompaniji</p>
            </div>
          </div>
        </div>
        
        {/* Tabbed Navigation - Glassmorphism stil */}
        <div className="mb-6 overflow-x-auto scrollbar-hide -mx-2 sm:mx-0 px-2 sm:px-0">
          <div className="flex space-x-2 bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] p-2 rounded-xl shadow-lg border border-white/5 min-w-max w-full relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            
            {tabs.map((tab, index) => {
              // Definiši boje za tabove
              const colors = [
                '#10B981', // zelena za MRN profitabilnost
                '#3B82F6', // plava za destinacije
                '#8B5CF6', // ljubičasta za aviokompanije
                '#F97316', // narandžasta za ukupni izvještaj
              ];
              const color = colors[index % colors.length];
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium min-w-fit whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white/10 text-white shadow-inner'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                  style={{
                    boxShadow: activeTab === tab.id ? `inset 0 0 0 1px ${color}33, inset 0 1px 2px ${color}22` : ''
                  }}
                >
                  <div
                    className="mr-2 p-1 rounded-md"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    {tab.icon}
                  </div>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === 'mrn-profitability' && (
            <Card className="border border-gray-200 bg-white shadow-md">
              <CardHeader className="border-b border-gray-100 bg-gray-50">
                <CardTitle className="text-lg text-gray-800 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-[#10B981]" />
                  Profitabilnost po MRN
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <MrnProfitabilityTab />
              </CardContent>
            </Card>
          )}
          
          {activeTab === 'destination-profitability' && (
            <Card className="border border-gray-200 bg-white shadow-md">
              <CardHeader className="border-b border-gray-100 bg-gray-50">
                <CardTitle className="text-lg text-gray-800 flex items-center">
                  <GlobeAmericasIcon className="h-5 w-5 mr-2 text-[#3B82F6]" />
                  Profitabilnost po Destinaciji
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <DestinationProfitabilityTab />
              </CardContent>
            </Card>
          )}
          
          {activeTab === 'airline-profitability' && (
            <Card className="border border-gray-200 bg-white shadow-md">
              <CardHeader className="border-b border-gray-100 bg-gray-50">
                <CardTitle className="text-lg text-gray-800 flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 mr-2 text-[#8B5CF6]" />
                  Profitabilnost po Aviokompaniji
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <AirlineProfitabilityTab />
              </CardContent>
            </Card>
          )}
          
          {activeTab === 'summary-report' && (
            <Card className="border border-gray-200 bg-white shadow-md">
              <CardHeader className="border-b border-gray-100 bg-gray-50">
                <CardTitle className="text-lg text-gray-800 flex items-center">
                  <ChartPieIcon className="h-5 w-5 mr-2 text-[#F97316]" />
                  Ukupni Finansijski Izvještaj
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <SummaryTab />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
