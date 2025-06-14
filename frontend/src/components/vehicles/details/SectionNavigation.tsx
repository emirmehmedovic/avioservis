'use client';

import React from 'react';
import { motion } from 'framer-motion';

// Define the section type
interface Section {
  key: string;
  label: string;
  icon: React.ElementType;
}

interface SectionNavigationProps {
  sections: Section[];
  activeSection: string;
  onSectionChange: (key: string) => void;
}

const SectionNavigation: React.FC<SectionNavigationProps> = ({
  sections,
  activeSection,
  onSectionChange
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
      <div className="bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] px-4 py-3">
        <h2 className="text-lg font-medium text-white">Navigacija</h2>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-1 gap-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            
            return (
              <motion.button
                key={section.key}
                onClick={() => onSectionChange(section.key)}
                className={`flex items-center px-4 py-2 rounded-lg text-left transition-colors ${
                  isActive 
                    ? 'bg-[#F08080]/30 text-white' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className={`mr-3 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span className="font-medium">{section.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SectionNavigation;
