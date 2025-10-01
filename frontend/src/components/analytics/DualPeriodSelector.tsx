'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  GitCompare, 
  ArrowRight,
  Clock
} from 'lucide-react';

interface PeriodRange {
  startDate: string;
  endDate: string;
  name: string;
}

interface DualPeriodSelectorProps {
  onPeriodsChange: (period1: PeriodRange, period2: PeriodRange) => void;
  loading?: boolean;
}

export default function DualPeriodSelector({ onPeriodsChange, loading }: DualPeriodSelectorProps) {
  const [period1, setPeriod1] = useState<PeriodRange>({
    startDate: '',
    endDate: '',
    name: 'Period 1'
  });

  const [period2, setPeriod2] = useState<PeriodRange>({
    startDate: '',
    endDate: '',
    name: 'Period 2'
  });

  const [customNames, setCustomNames] = useState({
    period1: '',
    period2: ''
  });

  // Predefined period options
  const getQuickPeriods = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return [
      {
        label: 'Ovaj mjesec vs Prošli mjesec',
        period1: {
          startDate: new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, currentMonth, 0).toISOString().split('T')[0],
          name: 'Prošli mjesec'
        },
        period2: {
          startDate: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0],
          name: 'Ovaj mjesec'
        }
      },
      {
        label: 'Avgust vs Septembar',
        period1: {
          startDate: new Date(currentYear, 7, 1).toISOString().split('T')[0], // August
          endDate: new Date(currentYear, 8, 0).toISOString().split('T')[0],
          name: 'Avgust'
        },
        period2: {
          startDate: new Date(currentYear, 8, 1).toISOString().split('T')[0], // September
          endDate: new Date(currentYear, 9, 0).toISOString().split('T')[0],
          name: 'Septembar'
        }
      },
      {
        label: 'Q3 vs Q4 (ova godina)',
        period1: {
          startDate: new Date(currentYear, 6, 1).toISOString().split('T')[0], // Q3
          endDate: new Date(currentYear, 9, 0).toISOString().split('T')[0],
          name: 'Q3'
        },
        period2: {
          startDate: new Date(currentYear, 9, 1).toISOString().split('T')[0], // Q4
          endDate: new Date(currentYear, 12, 0).toISOString().split('T')[0],
          name: 'Q4'
        }
      },
      {
        label: 'Ova godina vs Prošla godina (isti period)',
        period1: {
          startDate: new Date(currentYear - 1, 0, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear - 1, currentMonth, now.getDate()).toISOString().split('T')[0],
          name: `${currentYear - 1}`
        },
        period2: {
          startDate: new Date(currentYear, 0, 1).toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0],
          name: `${currentYear}`
        }
      }
    ];
  };

  const handleQuickPeriod = (quickPeriod: any) => {
    const updatedPeriod1 = { ...quickPeriod.period1 };
    const updatedPeriod2 = { ...quickPeriod.period2 };
    
    setPeriod1(updatedPeriod1);
    setPeriod2(updatedPeriod2);
    onPeriodsChange(updatedPeriod1, updatedPeriod2);
  };

  const handlePeriod1Change = (field: keyof PeriodRange, value: string) => {
    const updated = { ...period1, [field]: value };
    setPeriod1(updated);
    
    if (updated.startDate && updated.endDate && period2.startDate && period2.endDate) {
      onPeriodsChange(updated, period2);
    }
  };

  const handlePeriod2Change = (field: keyof PeriodRange, value: string) => {
    const updated = { ...period2, [field]: value };
    setPeriod2(updated);
    
    if (period1.startDate && period1.endDate && updated.startDate && updated.endDate) {
      onPeriodsChange(period1, updated);
    }
  };

  const handleCustomNameChange = (period: 'period1' | 'period2', name: string) => {
    setCustomNames(prev => ({ ...prev, [period]: name }));
    
    if (period === 'period1') {
      const updated = { ...period1, name: name || 'Period 1' };
      setPeriod1(updated);
      if (period1.startDate && period1.endDate && period2.startDate && period2.endDate) {
        onPeriodsChange(updated, period2);
      }
    } else {
      const updated = { ...period2, name: name || 'Period 2' };
      setPeriod2(updated);
      if (period1.startDate && period1.endDate && period2.startDate && period2.endDate) {
        onPeriodsChange(period1, updated);
      }
    }
  };

  const isValidPeriods = () => {
    return period1.startDate && period1.endDate && period2.startDate && period2.endDate;
  };

  return (
    <div className="space-y-6">
      {/* Quick period selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Brzi odabir perioda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {getQuickPeriods().map((quickPeriod, index) => (
              <button
                key={index}
                onClick={() => handleQuickPeriod(quickPeriod)}
                disabled={loading}
                className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-medium text-gray-900 mb-1">{quickPeriod.label}</div>
                <div className="text-sm text-gray-600">
                  {quickPeriod.period1.name} vs {quickPeriod.period2.name}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom period selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Period 1 */}
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Prvi period
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Naziv perioda
                </label>
                <input
                  type="text"
                  value={customNames.period1}
                  onChange={(e) => handleCustomNameChange('period1', e.target.value)}
                  placeholder="npr. Avgust, Q1, Prošli mjesec..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Od datuma
                </label>
                <input
                  type="date"
                  value={period1.startDate}
                  onChange={(e) => handlePeriod1Change('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Do datuma
                </label>
                <input
                  type="date"
                  value={period1.endDate}
                  onChange={(e) => handlePeriod1Change('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period 2 */}
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Drugi period
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Naziv perioda
                </label>
                <input
                  type="text"
                  value={customNames.period2}
                  onChange={(e) => handleCustomNameChange('period2', e.target.value)}
                  placeholder="npr. Septembar, Q2, Ovaj mjesec..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Od datuma
                </label>
                <input
                  type="date"
                  value={period2.startDate}
                  onChange={(e) => handlePeriod2Change('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Do datuma
                </label>
                <input
                  type="date"
                  value={period2.endDate}
                  onChange={(e) => handlePeriod2Change('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison summary */}
      {isValidPeriods() && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                {period1.name}
              </Badge>
              <ArrowRight className="h-4 w-4 text-purple-600" />
              <GitCompare className="h-5 w-5 text-purple-600" />
              <ArrowRight className="h-4 w-4 text-purple-600" />
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                {period2.name}
              </Badge>
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
              Spremno za komparaciju perioda
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
