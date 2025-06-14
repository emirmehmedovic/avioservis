'use client';

import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamically import components with no SSR
const TankManagement = dynamic(() => import('@/components/fuel/TankManagement'), { ssr: false });
const FuelingOperations = dynamic(() => import('@/components/fuel/FuelingOperations'), { ssr: false });
const DrainedFuelOperations = dynamic(() => import('@/components/fuel/DrainedFuelOperations'), { ssr: false });
const AirlineManagement = dynamic(() => import('@/components/fuel/AirlineManagement'), { ssr: false });
const FixedTanksDisplay = dynamic(() => import('@/components/fuel/FixedTanksDisplay'), { ssr: false });
const FuelIntakeDisplay = dynamic(() => import('@/components/fuel/FuelIntakeDisplay'), { ssr: false });
const FuelPrices = dynamic(() => import('@/components/fuel/FuelPrices'), { ssr: false });

// Define the valid category IDs as a type
type CategoryId = 'fixed-tanks' | 'tanks' | 'fuel-intake' | 'fueling' | 'drained-fuel' | 'airlines' | 'fuel-prices';

// SVG Icons for categories with proper typing
const CategoryIcons: Record<CategoryId, React.ReactNode> = {
  'fixed-tanks': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10V7C20 5.34315 18.6569 4 17 4H7C5.34315 4 4 5.34315 4 7V10M20 10V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V10M20 10H4M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 10V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'fuel-prices': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 8L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 8L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  'tanks': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8H21L19 16H5L3 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 8V6C7 4.89543 7.89543 4 9 4H15C16.1046 4 17 4.89543 17 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="7" cy="19" r="2" stroke="currentColor" strokeWidth="2"/>
      <circle cx="17" cy="19" r="2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  'fuel-intake': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4V20M12 20L6 14M12 20L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 10C20 10 18 14 12 14C6 14 4 10 4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'fueling': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20V4M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 14C20 14 18 10 12 10C6 10 4 14 4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'drained-fuel': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 21L17 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 21L12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 13L16 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 13L8 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 8C20 8 18 4 12 4C6 4 4 8 4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'airlines': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 19L13 4.00001L20 14.5L15 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 4L9.04401 13.1224C9.01443 13.1921 9.01443 13.2685 9.04401 13.3382L11 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 19L11 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// No animated fuel drop component

export default function FuelManagement() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading for animation purposes
    setIsLoaded(true);
  }, []);

  // Define the category structure with proper typing
  type CategoryDetails = {
    id: CategoryId;
    description: string;
  };

  const categories: CategoryDetails[] = [
    { id: 'fixed-tanks', description: 'Rezervoari' },
    { id: 'tanks', description: 'Avio Cisterne' },
    { id: 'fuel-intake', description: 'Unos Goriva' },
    { id: 'fueling', description: 'Operacije Točenja' },
    { id: 'drained-fuel', description: 'Drenirano Gorivo' },
    { id: 'airlines', description: 'Avio Kompanije' },
    { id: 'fuel-prices', description: 'Cijene Goriva' },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-12 w-full overflow-x-hidden">
      <div className="px-2 sm:px-4 md:px-6 py-6 fuel-fixed-container">
        {/* Main Tab Interface */}
        <div className="fuel-fixed-container mx-auto" style={{ maxWidth: '1400px' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
          >
          <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
            <div className="bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] backdrop-blur-md border border-white/10 p-1 rounded-xl shadow-lg overflow-hidden relative">
              {/* Glass reflection effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
              <Tab.List className="flex gap-1 overflow-x-auto">
                {categories.map((category, idx) => (
                  <Tab
                    key={category.id}
                    className={({ selected }) =>
                      classNames(
                        'px-6 py-4 text-sm font-medium transition-all duration-200 ease-in-out flex items-center gap-2',
                        'focus:outline-none',
                        selected
                          ? 'backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white rounded-xl shadow-lg'
                          : 'text-white hover:bg-white/10 hover:text-white rounded-xl'
                      )
                    }
                  >
                    <span className="text-current">{CategoryIcons[category.id as CategoryId]}</span>
                    <span>{category.description}</span>
                  </Tab>
                ))}
              </Tab.List>
            </div>

            {/* Tab content with animations */}
            <Tab.Panels>
              <AnimatePresence mode="wait">
                <Tab.Panel key="fixed-tanks" className="p-8 focus:outline-none">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FixedTanksDisplay />
                  </motion.div>
                </Tab.Panel>

                <Tab.Panel key="tanks" className="p-8 focus:outline-none">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TankManagement />
                  </motion.div>
                </Tab.Panel>

                <Tab.Panel key="fuel-intake" className="p-8 focus:outline-none">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FuelIntakeDisplay />
                  </motion.div>
                </Tab.Panel>
                
                <Tab.Panel key="fueling" className="p-8 focus:outline-none">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fuel-content-wrapper"
                  >
                    <FuelingOperations />
                  </motion.div>
                </Tab.Panel>
                
                <Tab.Panel key="drained-fuel" className="p-8 focus:outline-none">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DrainedFuelOperations />
                  </motion.div>
                </Tab.Panel>
                
                <Tab.Panel key="airlines" className="p-8 focus:outline-none">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AirlineManagement />
                  </motion.div>
                </Tab.Panel>
                

                
                <Tab.Panel key="fuel-prices" className="p-8 focus:outline-none">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FuelPrices />
                  </motion.div>
                </Tab.Panel>
              </AnimatePresence>
            </Tab.Panels>
          </Tab.Group>
          </motion.div>
        </div>
      </div>
    </div>
  );
}