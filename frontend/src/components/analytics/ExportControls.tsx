'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  FileText, 
  Table, 
  Settings,
  Check,
  X,
  ChevronDown
} from 'lucide-react';
import { exportAnalytics, exportSection, ExportData, ExportOptions, getEstimatedFileSize } from '@/services/analyticsExportService';

export interface ExportControlsProps {
  data: ExportData;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
  className?: string;
}

export default function ExportControls({
  data,
  onExportStart,
  onExportComplete,
  onExportError,
  className = ''
}: ExportControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeCharts: true,
    includeDetails: true,
    includeAlerts: true,
    filename: ''
  });

  const handleExport = async () => {
    console.log('🎯 ExportControls handleExport pozvan', { exportOptions });
    try {
      setIsExporting(true);
      onExportStart?.();
      
      // Generiraj filename ako nije postavljen
      const filename = exportOptions.filename || 
        `analitika_${new Date().toISOString().split('T')[0]}.${exportOptions.format === 'pdf' ? 'pdf' : 'xlsx'}`;
      
      const finalOptions = {
        ...exportOptions,
        filename
      };
      
      await exportAnalytics(data, finalOptions);
      
      onExportComplete?.();
      setIsOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Neočekivana greška pri eksportu';
      onExportError?.(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickExport = async (format: 'pdf' | 'excel') => {
    const quickOptions: ExportOptions = {
      format,
      includeCharts: true,
      includeDetails: true,
      includeAlerts: true
    };
    
    console.log('⚡ Quick export pozvan', { format, quickOptions });
    
    try {
      setIsExporting(true);
      onExportStart?.();
      await exportAnalytics(data, quickOptions);
      onExportComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Neočekivana greška pri eksportu';
      onExportError?.(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const estimatedSize = getEstimatedFileSize(data, exportOptions.format);

  return (
    <div className={`relative ${className}`}>
      {/* Quick Export Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleQuickExport('pdf')}
          disabled={isExporting}
          className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span>PDF</span>
        </button>
        
        <button
          onClick={() => handleQuickExport('excel')}
          disabled={isExporting}
          className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Table className="w-4 h-4" />
          <span>Excel</span>
        </button>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isExporting}
          className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Settings className="w-4 h-4" />
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Advanced Export Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Opcije eksporta</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format datoteke
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportOptions(prev => ({ ...prev, format: 'pdf' }))}
                      className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                        exportOptions.format === 'pdf'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>PDF</span>
                      {exportOptions.format === 'pdf' && <Check className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => setExportOptions(prev => ({ ...prev, format: 'excel' }))}
                      className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                        exportOptions.format === 'excel'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Table className="w-4 h-4" />
                      <span>Excel</span>
                      {exportOptions.format === 'excel' && <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Content Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sadržaj za uključiti
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeCharts}
                        onChange={(e) => setExportOptions(prev => ({ 
                          ...prev, 
                          includeCharts: e.target.checked 
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Chartovi i grafici</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeDetails}
                        onChange={(e) => setExportOptions(prev => ({ 
                          ...prev, 
                          includeDetails: e.target.checked 
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Detaljni podaci</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeAlerts}
                        onChange={(e) => setExportOptions(prev => ({ 
                          ...prev, 
                          includeAlerts: e.target.checked 
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Upozorenja i anomalije</span>
                    </label>
                  </div>
                </div>

                {/* Filename */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Naziv datoteke (opciono)
                  </label>
                  <input
                    type="text"
                    value={exportOptions.filename}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      filename: e.target.value 
                    }))}
                    placeholder={`analitika_${new Date().toISOString().split('T')[0]}`}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ekstenzija će biti dodana automatski
                  </p>
                </div>

                {/* File Size Estimate */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Procijenjena veličina:</span>
                    <span className="font-medium text-gray-900">{estimatedSize}</span>
                  </div>
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isExporting ? 'Eksportujem...' : 'Eksportuj'}
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {isExporting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-900">Eksportujem u tijeku...</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Molimo sačekajte dok se datoteka priprema.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
