import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';

const FONT_NAME = 'NotoSans';

// Helper function to format date as dd.mm.yyyy HH:MM
export const formatDateTimeForReport = (dateInput?: string | Date | null): string => {
  if (!dateInput) return 'N/A';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Direktno formatiranje datuma za osiguranje formata dd.mm.yyyy HH:MM
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Greška pri formatiranju datuma:', error);
    return 'N/A';
  }
};

// Helper function to format date as dd.mm.yyyy (bez vremena)
export const formatDateForReport = (dateInput?: string | Date | null): string => {
  if (!dateInput) return 'N/A';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Direktno formatiranje datuma za osiguranje formata dd.mm.yyyy
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch (error) {
    console.error('Greška pri formatiranju datuma:', error);
    return 'N/A';
  }
};

// Register custom fonts to ensure proper display of special characters
export const registerFont = (doc: jsPDF) => {
  const stripPrefix = (base64String: string) => {
    const prefix = 'data:font/ttf;base64,';
    if (base64String.startsWith(prefix)) {
      return base64String.substring(prefix.length);
    }
    return base64String;
  };

  if (notoSansRegularBase64) {
    const cleanedRegular = stripPrefix(notoSansRegularBase64);
    doc.addFileToVFS('NotoSans-Regular.ttf', cleanedRegular);
    doc.addFont('NotoSans-Regular.ttf', FONT_NAME, 'normal');
  } else {
    console.error('Noto Sans Regular font data not loaded.');
  }

  if (notoSansBoldBase64) {
    const cleanedBold = stripPrefix(notoSansBoldBase64);
    doc.addFileToVFS('NotoSans-Bold.ttf', cleanedBold);
    doc.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold');
  } else {
    console.error('Noto Sans Bold font data not loaded.');
  }
};

// Create a standard header for all financial report PDFs
export const addHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  doc.setFontSize(16);
  doc.setFont(FONT_NAME, 'bold');
  doc.text(title, 14, 20);
  
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'normal');
    doc.text(subtitle, 14, 30);
  }
  
  return subtitle ? 35 : 25; // Return the Y position after the header
};

// Add footer with date and page number
export const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.height - 20;
    doc.setFontSize(8);
    doc.setFont(FONT_NAME, 'normal');
    doc.text(`Izvještaj generisan: ${formatDateTimeForReport(new Date())}`, 14, footerY);
    doc.text(`Stranica ${i} od ${pageCount}`, doc.internal.pageSize.width - 30, footerY);
  }
};

// Add a summary table with key metrics
export const addSummaryTable = (
  doc: jsPDF, 
  startY: number, 
  data: { label: string; value: string | number }[]
) => {
  // Format numbers to have thousand separators and 2 decimal places
  const formattedData = data.map(item => [
    item.label,
    typeof item.value === 'number' 
      ? item.value.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : item.value
  ]);
  
  autoTable(doc, {
    startY,
    head: [],
    body: formattedData,
    theme: 'grid',
    styles: { font: FONT_NAME, fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 'auto', halign: 'right' }
    },
    margin: { left: 50, right: 50 }
  });
  
  return (doc as any).lastAutoTable.finalY + 10;
};

// Add a data table with headers and rows
export const addDataTable = (
  doc: jsPDF,
  startY: number,
  headers: string[],
  data: any[],
  columnWidths?: number[],
  theme: 'grid' | 'striped' | 'plain' = 'grid'
) => {
  // Process data rows to properly format numbers
  const processedData = data.map(row => 
    row.map((cell: any) => 
      typeof cell === 'number' 
        ? cell.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : cell
    )
  );
  
  let columnStyles: Record<number, any> = {};
  
  // Apply custom column widths if provided
  if (columnWidths) {
    columnWidths.forEach((width, index) => {
      columnStyles[index] = { cellWidth: width };
    });
  }
  
  autoTable(doc, {
    startY,
    head: [headers],
    body: processedData,
    theme,
    headStyles: { fillColor: [41, 128, 185], font: FONT_NAME, fontStyle: 'bold', fontSize: 9 },
    styles: { font: FONT_NAME, fontSize: 8 },
    columnStyles
  });
  
  return (doc as any).lastAutoTable.finalY + 10;
};

// Add a section title with optional background
export const addSectionTitle = (
  doc: jsPDF,
  title: string,
  yPos: number,
  withBackground = true
) => {
  if (withBackground) {
    doc.setFillColor(41, 128, 185);
    doc.rect(14, yPos - 8, doc.internal.pageSize.width - 28, 10, 'F');
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setTextColor(0, 0, 0);
  }
  
  doc.setFontSize(11);
  doc.setFont(FONT_NAME, 'bold');
  doc.text(title, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
  doc.setTextColor(0, 0, 0); // Reset text color
  
  return yPos + 15;
};

// Add a chart from canvas element
export const addChartImage = (
  doc: jsPDF, 
  chartCanvas: HTMLCanvasElement, 
  startY: number, 
  width = 180,
  height = 100
) => {
  const imgData = chartCanvas.toDataURL('image/png');
  const pageWidth = doc.internal.pageSize.width;
  const xPos = (pageWidth - width) / 2; // Center the chart
  
  doc.addImage(imgData, 'PNG', xPos, startY, width, height);
  
  return startY + height + 10;
};

// Main function to initialize a new PDF document
export const initPdfDocument = (orientation: 'portrait' | 'landscape' = 'portrait') => {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });
  
  registerFont(doc);
  return doc;
};

// Format currency values
export const formatCurrency = (
  value: number, 
  currency = 'BAM', 
  locale = 'bs-BA'
) => {
  return `${value.toLocaleString(locale, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })} ${currency}`;
};

// Format percentage values
export const formatPercentage = (
  value: number, 
  locale = 'bs-BA'
) => {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + '%';
};
