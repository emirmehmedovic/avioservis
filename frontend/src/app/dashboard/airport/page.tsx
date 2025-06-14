"use client";

import React, { useState, useEffect } from 'react';
import FixedTanksDisplay from '@/components/fuel/FixedTanksDisplay';
import AllIntakesList from '@/components/customs/AllIntakesList'; 
import FuelOperationsReport from '@/components/reports/FuelOperationsReport';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/Button';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const AirportPage = () => {
  const [intakeListStartDate, setIntakeListStartDate] = useState<string>('');
  const [intakeListEndDate, setIntakeListEndDate] = useState<string>('');

  useEffect(() => {
    const today = new Date();
    setIntakeListStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
    setIntakeListEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-6">
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div className="flex items-center">
            <div className="mr-4 p-3 bg-[#e53e3e]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#e53e3e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Aerodrom</h1>
              <p className="text-gray-300 mt-1">Pregled fiksnih tankova i historijata ulaza goriva za aerodromske potrebe.</p>
            </div>
          </div>
        </div>
      </div>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Status Fiksnih Tankova</CardTitle>
          </CardHeader>
          <CardContent>
            <FixedTanksDisplay 
              showAddTankButton={false}
              showTransferButton={false}
              showEditTankButton={false}
              showDetailsButton={false}
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Historijat Svih Ulaza Goriva u Fiksne Tankove</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 border dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50">
              <h4 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Filter po datumu</h4>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 min-w-[150px]">
                  <label htmlFor="intakeListStartDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Početni datum</label>
                  <Input
                    type="date"
                    id="intakeListStartDate"
                    value={intakeListStartDate}
                    onChange={(e) => setIntakeListStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label htmlFor="intakeListEndDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Krajnji datum</label>
                  <Input
                    type="date"
                    id="intakeListEndDate"
                    value={intakeListEndDate}
                    onChange={(e) => setIntakeListEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            <AllIntakesList 
              startDate={intakeListStartDate} 
              endDate={intakeListEndDate} 
              title="Pregled Prijema Goriva"
              showDateFilterInfo={false} // Info is shown above the component now
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Pregled Izlaznih Operacija Goriva</CardTitle>
          </CardHeader>
          <CardContent>
            <FuelOperationsReport />
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AirportPage;
