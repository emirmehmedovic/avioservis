'use client';

import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import dynamic from 'next/dynamic';

// Dynamically import components with no SSR
const TankManagement = dynamic(() => import('@/components/fuel/TankManagement'), { ssr: false });
const FuelingOperations = dynamic(() => import('@/components/fuel/FuelingOperations'), { ssr: false });
const AirlineManagement = dynamic(() => import('@/components/fuel/AirlineManagement'), { ssr: false });
const FuelReports = dynamic(() => import('@/components/fuel/FuelReports'), { ssr: false });

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ImprovedFuelManagement() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const categories = {
    'Tankeri': { id: 'tanks' },
    'Točenje Goriva': { id: 'fueling' },
    'Avio Kompanije': { id: 'airlines' },
    'Izvještaji': { id: 'reports' },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="sm:flex sm:items-center mb-6">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Upravljanje Avio Gorivom</h1>
            <p className="mt-2 text-sm text-gray-700">
              Upravljajte tankerima, točenjem goriva, avio kompanijama i pregledajte izvještaje.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
            <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/10 p-1">
              {Object.keys(categories).map((category) => (
                <Tab
                  key={category}
                  className={({ selected }) =>
                    classNames(
                      'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                      'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                      selected
                        ? 'bg-white text-blue-700 shadow'
                        : 'text-gray-700 hover:bg-white/[0.12] hover:text-blue-600'
                    )
                  }
                >
                  {category}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels className="mt-2">
              <Tab.Panel key="tanks" className="rounded-xl bg-white p-3">
                <TankManagement />
              </Tab.Panel>
              
              <Tab.Panel key="fueling" className="rounded-xl bg-white p-3">
                <FuelingOperations />
              </Tab.Panel>
              
              <Tab.Panel key="airlines" className="rounded-xl bg-white p-3">
                <AirlineManagement />
              </Tab.Panel>
              
              <Tab.Panel key="reports" className="rounded-xl bg-white p-3">
                <FuelReports />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  );
} 