/**
 * ExportButton.tsx
 * Komponenta za export trend analiza u PDF/Excel format
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileSpreadsheet, FileText, Settings, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

// Export types
export type ExportFormat = 'pdf' | 'excel';
export type ExportData = 'trends' | 'comparative' | 'forecasting' | 'all';

interface ExportOptions {
  format: ExportFormat;
  dataType: ExportData;
  includeCharts: boolean;
  includeRawData: boolean;
  includeAnalysis: boolean;
  period: string;
}

interface ExportButtonProps {
  onExport: (options: ExportOptions) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  disabled = false,
  isLoading = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    dataType: 'all',
    includeCharts: true,
    includeRawData: false,
    includeAnalysis: true,
    period: 'current',
  });

  // Handle export
  const handleExport = async () => {
    try {
      await onExport(options);
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Update option
  const updateOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isLoading}
          className={`flex items-center gap-2 ${className}`}
        >
          <Download className="h-4 w-4" />
          {isLoading ? 'Exportuje...' : 'Export'}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Export opcije
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Format fajla:</label>
              <Select
                value={options.format}
                onValueChange={(value: ExportFormat) => updateOption('format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF dokument
                    </div>
                  </SelectItem>
                  <SelectItem value="excel">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel fajl
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tip podataka:</label>
              <Select
                value={options.dataType}
                onValueChange={(value: ExportData) => updateOption('dataType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi podaci</SelectItem>
                  <SelectItem value="trends">Trend analiza</SelectItem>
                  <SelectItem value="comparative">Komparativna analiza</SelectItem>
                  <SelectItem value="forecasting">Prognoze</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Period:</label>
              <Select
                value={options.period}
                onValueChange={(value: string) => updateOption('period', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Trenutni filter</SelectItem>
                  <SelectItem value="last3months">Zadnja 3 mjeseca</SelectItem>
                  <SelectItem value="last6months">Zadnjih 6 mjeseci</SelectItem>
                  <SelectItem value="last12months">Zadnjih 12 mjeseci</SelectItem>
                  <SelectItem value="thisyear">Ova godina</SelectItem>
                  <SelectItem value="lastyear">Prošla godina</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Uključi u export:</label>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeCharts}
                    onChange={(e) => updateOption('includeCharts', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Grafike i dijagrame</span>
                  {options.includeCharts && <Check className="h-3 w-3 text-green-600" />}
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeRawData}
                    onChange={(e) => updateOption('includeRawData', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Sirove podatke (tabele)</span>
                  {options.includeRawData && <Check className="h-3 w-3 text-green-600" />}
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeAnalysis}
                    onChange={(e) => updateOption('includeAnalysis', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Analizu i komentare</span>
                  {options.includeAnalysis && <Check className="h-3 w-3 text-green-600" />}
                </label>
              </div>
            </div>

            {/* Format-specific options */}
            {options.format === 'pdf' && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-blue-800">
                  <strong>PDF opcije:</strong> Uključit će naslovnu stranu, sažetak, 
                  i profesionalno formatiranje s logom kompanije.
                </div>
              </div>
            )}

            {options.format === 'excel' && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xs text-green-800">
                  <strong>Excel opcije:</strong> Podaci će biti organizovani u 
                  odvojena sheet-ova za lakše filtriranje i analizu.
                </div>
              </div>
            )}

            {/* Export Button */}
            <div className="pt-2">
              <Button
                onClick={handleExport}
                disabled={isLoading}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {isLoading ? 'Priprema export...' : `Export ${options.format.toUpperCase()}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default ExportButton; 