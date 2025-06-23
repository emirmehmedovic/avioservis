'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { DownloadIcon, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { 
  initPdfDocument, 
  addHeader, 
  addFooter, 
  addDataTable 
} from './utils/financialReportPdfGenerator';

interface ExportButtonProps {
  data: any[];
  filename: string;
  title?: string;
  pdfHeaders?: string[];
  pdfDataFields?: string[];
  showPdf?: boolean;
  showCsv?: boolean;
  columnWidths?: number[];
  orientation?: 'portrait' | 'landscape';
}

export function ExportButton({ 
  data, 
  filename, 
  title = 'Finansijski izvještaj', 
  pdfHeaders, 
  pdfDataFields,
  showPdf = true, 
  showCsv = true,
  columnWidths,
  orientation = 'landscape'
}: ExportButtonProps) {
  
  // Function to export data as CSV
  const handleCsvExport = () => {
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
  
  // Function to export data as PDF
  const handlePdfExport = () => {
    if (data.length === 0) {
      alert('Nema podataka za eksport.');
      return;
    }
    
    // Initialize PDF document
    const doc = initPdfDocument(orientation);
    
    // Add header
    let yPos = addHeader(doc, title);
    
    // Prepare table headers and data
    const headers = pdfHeaders || Object.keys(data[0]);
    
    // If specific data fields are provided, extract only those fields
    const tableData = data.map(item => {
      if (pdfDataFields) {
        return pdfDataFields.map(field => item[field]);
      } else {
        return Object.values(item);
      }
    });
    
    // Add data table
    addDataTable(doc, yPos, headers, tableData, columnWidths);
    
    // Add footer with page numbers
    addFooter(doc);
    
    // Save the PDF
    doc.save(`${filename}.pdf`);
  };

  if (!showPdf && !showCsv) {
    return null;
  }

  return (
    <div className="flex space-x-2">
      {showCsv && (
        <Button 
          onClick={handleCsvExport} 
          variant="outline" 
          size="sm"
          className="bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-800 hover:text-gray-800"
        >
          <DownloadIcon className="mr-2 h-4 w-4" />
          CSV
        </Button>
      )}
      
      {showPdf && (
        <Button 
          onClick={handlePdfExport} 
          variant="outline" 
          size="sm"
          className="bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-800 hover:text-gray-800"
        >
          <FileText className="mr-2 h-4 w-4" />
          PDF
        </Button>
      )}
    </div>
  );
}
