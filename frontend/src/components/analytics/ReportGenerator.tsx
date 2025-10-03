'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { generateReport, GenerateReportData } from '@/services/reportService';

interface ReportGeneratorProps {
  onReportGenerated?: (reportUrl: string) => void;
}

export default function ReportGenerator({ onReportGenerated }: ReportGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<GenerateReportData>({
    period1_start: '',
    period1_end: '',
    period2_start: '',
    period2_end: '',
    airlineId: undefined,
    destinationId: ''
  });
  const [airlines, setAirlines] = useState<Array<{ id: number; name: string }>>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [isComparison, setIsComparison] = useState(false);

  useEffect(() => {
    loadAirlines();
    loadDestinations();
  }, []);

  const loadAirlines = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/airlines', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAirlines(data);
      }
    } catch (error) {
      console.error('Error loading airlines:', error);
    }
  };

  const loadDestinations = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/fueling-operations/destinations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDestinations(data);
      }
    } catch (error) {
      console.error('Error loading destinations:', error);
    }
  };

  const handleInputChange = (field: keyof GenerateReportData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerate = async () => {
    if (!formData.period1_start || !formData.period1_end) {
      setError('Početni i završni datum su obavezni');
      return;
    }

    if (isComparison && (!formData.period2_start || !formData.period2_end)) {
      setError('Za komparaciju su potrebni oba perioda');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const dataToSend = {
        ...formData,
        period2_start: isComparison ? formData.period2_start : undefined,
        period2_end: isComparison ? formData.period2_end : undefined,
        airlineId: formData.airlineId || undefined,
        destinationId: formData.destinationId || undefined
      };

      const result = await generateReport(dataToSend);
      
      setSuccess(`Izvještaj je uspješno generiran!`);
      
      if (onReportGenerated) {
        onReportGenerated(result.url);
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message || 'Greška pri generiranju izvještaja');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      period1_start: '',
      period1_end: '',
      period2_start: '',
      period2_end: '',
      airlineId: undefined,
      destinationId: ''
    });
    setIsComparison(false);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Generiši analitički izvještaj</h3>
          <p className="text-sm text-gray-600">Kreiraj detaljni izvještaj za odabrani period</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Comparison Toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="reportType"
              checked={!isComparison}
              onChange={() => setIsComparison(false)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Jedan period</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="reportType"
              checked={isComparison}
              onChange={() => setIsComparison(true)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Komparacija dva perioda</span>
          </label>
        </div>

        {/* Period 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isComparison ? 'Period 1 - Od datuma' : 'Od datuma'}
            </label>
            <input
              type="date"
              value={formData.period1_start}
              onChange={(e) => handleInputChange('period1_start', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isComparison ? 'Period 1 - Do datuma' : 'Do datuma'}
            </label>
            <input
              type="date"
              value={formData.period1_end}
              onChange={(e) => handleInputChange('period1_end', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Period 2 (only for comparison) */}
        {isComparison && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period 2 - Od datuma
              </label>
              <input
                type="date"
                value={formData.period2_start || ''}
                onChange={(e) => handleInputChange('period2_start', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period 2 - Do datuma
              </label>
              <input
                type="date"
                value={formData.period2_end || ''}
                onChange={(e) => handleInputChange('period2_end', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter po aviokompaniji (opciono)
            </label>
            <select
              value={formData.airlineId || ''}
              onChange={(e) => handleInputChange('airlineId', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sve aviokompanije</option>
              {airlines.map((airline) => (
                <option key={airline.id} value={airline.id}>
                  {airline.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter po destinaciji (opciono)
            </label>
            <select
              value={formData.destinationId || ''}
              onChange={(e) => handleInputChange('destinationId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sve destinacije</option>
              {destinations.map((destination) => (
                <option key={destination} value={destination}>
                  {destination}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
          >
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">{success}</span>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
            {loading ? 'Generiram...' : 'Generiši izvještaj'}
          </button>
          
          <button
            onClick={resetForm}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Poništi
          </button>
        </div>
      </div>
    </div>
  );
}

