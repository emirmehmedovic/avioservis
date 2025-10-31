'use client';

import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Container,
  Truck,
  ArrowDown,
  Droplet,
  Zap,
  Plane,
  DollarSign,
  Cylinder,
} from 'lucide-react';

// Dynamically import components with no SSR
const TankManagement = dynamic(() => import('@/components/fuel/TankManagement'), { ssr: false });
const FuelingOperations = dynamic(() => import('@/components/fuel/FuelingOperations'), { ssr: false });
const DrainedFuelOperations = dynamic(() => import('@/components/fuel/DrainedFuelOperations'), { ssr: false });
const AirlineManagement = dynamic(() => import('@/components/fuel/AirlineManagement'), { ssr: false });
const FixedTanksDisplay = dynamic(() => import('@/components/fuel/FixedTanksDisplay'), { ssr: false });
const FuelIntakeDisplay = dynamic(() => import('@/components/fuel/FuelIntakeDisplay'), { ssr: false });
const FuelPrices = dynamic(() => import('@/components/fuel/FuelPrices'), { ssr: false });
const PhysicalTanksDisplay = dynamic(() => import('@/components/fuel/PhysicalTanksDisplay'), { ssr: false });

// Define the valid category IDs as a type
type CategoryId = 'fixed-tanks' | 'tanks' | 'fuel-intake' | 'fueling' | 'drained-fuel' | 'airlines' | 'fuel-prices' | 'physical-tanks';

// Icons for categories using lucide-react (same as sidebar)
const CategoryIcons: Record<CategoryId, React.ReactNode> = {
  'fixed-tanks': <Container className="w-5 h-5" />,
  'fuel-prices': <DollarSign className="w-5 h-5" />,
  'tanks': <Truck className="w-5 h-5" />,
  'fuel-intake': <ArrowDown className="w-5 h-5" />,
  'fueling': <Droplet className="w-5 h-5" />,
  'drained-fuel': <Zap className="w-5 h-5" />,
  'airlines': <Plane className="w-5 h-5" />,
  'physical-tanks': <Cylinder className="w-5 h-5" />,
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
    { id: 'fixed-tanks', description: 'Rezervoari (Robno stanje)' },
    { id: 'tanks', description: 'Avio Cisterne (Tip goriva)' },
    { id: 'fuel-intake', description: 'Unos Goriva (Ulazi)' },
    { id: 'fueling', description: 'Operacije Točenja (Izlazi)' },
    { id: 'drained-fuel', description: 'Drenirano Gorivo' },
    { id: 'airlines', description: 'Avio Kompanije' },
    { id: 'fuel-prices', description: 'Cijene Goriva' },
    { id: 'physical-tanks', description: 'Fizički Tankovi' },
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

                <Tab.Panel key="physical-tanks" className="p-8 focus:outline-none">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PhysicalTanksDisplay />
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