'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { DownloadIcon } from 'lucide-react';

interface ExportButtonProps {
  data: any[];
  filename: string;
}

export function ExportButton({ data, filename }: ExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) {
      alert('Nema podataka za eksport.');
      return;
    }

    // Kreiranje CSV headera iz prvog objekta
    const headers = Object.keys(data[0]);
    
    // Kreiranje CSV podataka
    const csvRows = [
      // Header row
      headers.join(','),
      
      // Data rows
      ...data.map(row => 
        headers
          .map(header => {
            // Format values appropriately
            const value = row[header];
            if (value === null || value === undefined) {
              return '';
            } else if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            } else if (typeof value === 'number') {
              return value.toFixed(2);
            } else {
              return value;
            }
          })
          .join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Kreiranje blob-a i download linka
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button 
      onClick={handleExport} 
      variant="outline" 
      size="sm"
      className="bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-800 hover:text-gray-800"
    >
      <DownloadIcon className="mr-2 h-4 w-4" />
      Eksport CSV
    </Button>
  );
}
