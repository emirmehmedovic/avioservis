'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface PeriodSelectorProps {
  selectedPeriod: DateRange;
  onPeriodChange: (period: DateRange) => void;
  onCompare?: () => void;
  loading?: boolean;
}

const PRESET_PERIODS = [
  {
    id: 'current-week',
    name: 'Trenutna sedmica',
    getValue: () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      };
    }
  },
  {
    id: 'last-week',
    name: 'Prošla sedmica',
    getValue: () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7; // Previous week
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      };
    }
  },
  {
    id: 'current-month',
    name: 'Trenutni mjesec',
    getValue: () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      };
    }
  },
  {
    id: 'last-month',
    name: 'Prošli mjesec',
    getValue: () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      };
    }
  },
  {
    id: 'last-30-days',
    name: 'Zadnjih 30 dana',
    getValue: () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      return {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0]
      };
    }
  },
  {
    id: 'last-90-days',
    name: 'Zadnjih 90 dana',
    getValue: () => {
      const now = new Date();
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(now.getDate() - 90);
      
      return {
        startDate: ninetyDaysAgo.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0]
      };
    }
  }
];

export default function PeriodSelector({ 
  selectedPeriod, 
  onPeriodChange, 
  onCompare,
  loading = false 
}: PeriodSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const handlePresetSelect = (preset: typeof PRESET_PERIODS[0]) => {
    const period = preset.getValue();
    setSelectedPreset(preset.id);
    onPeriodChange(period);
    setIsDropdownOpen(false);
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newPeriod = {
      ...selectedPeriod,
      [field]: value
    };
    onPeriodChange(newPeriod);
    setSelectedPreset(''); // Clear preset selection when custom dates are used
  };

  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Odabir perioda</h3>
        </div>
        
        {onCompare && (
          <button
            onClick={onCompare}
            disabled={loading || !selectedPeriod.startDate || !selectedPeriod.endDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Učitavam...' : 'Analiziraj'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Preset Periods Dropdown */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brzi odabir
          </label>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-700">
              {selectedPreset 
                ? PRESET_PERIODS.find(p => p.id === selectedPreset)?.name 
                : 'Odaberite period'}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg"
              >
                <div className="py-1">
                  {PRESET_PERIODS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Od datuma
            </label>
            <input
              type="date"
              value={selectedPeriod.startDate}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Do datuma
            </label>
            <input
              type="date"
              value={selectedPeriod.endDate}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Selected Period Display */}
        {selectedPeriod.startDate && selectedPeriod.endDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Odabrani period:</p>
                <p className="text-blue-700">
                  {formatDateForDisplay(selectedPeriod.startDate)} - {formatDateForDisplay(selectedPeriod.endDate)}
                </p>
              </div>
              <div className="text-sm text-blue-600">
                {(() => {
                  const start = new Date(selectedPeriod.startDate);
                  const end = new Date(selectedPeriod.endDate);
                  const diffTime = Math.abs(end.getTime() - start.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return `${diffDays} dana`;
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
