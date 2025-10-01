/**
 * analyticsExportService.ts
 * Servis za eksport analitike u PDF i Excel formate
 */

import { formatDateBS } from '@/utils/dateFormatter';
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';

const FONT_NAME = 'NotoSans';

/**
 * Debug funkcija za pregled elemenata na stranici
 */
function debugPageElements() {
  console.log('🔍 DEBUG: Pregled elemenata na stranici');
  console.log('📍 Trenutna URL:', window.location.href);
  console.log('📄 Document title:', document.title);
  
  const allSelectors = [
    '#analytics-charts-container',
    '[data-export="analytics-content"]',
    '[data-chart]',
    '.chart-svg',
    'svg[data-chart]',
    '.recharts-wrapper',
    'canvas',
    'svg',
    '.space-y-6'
  ];
  
  allSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`  ${selector}: ${elements.length} elemenata`);
    
    if (elements.length > 0) {
      elements.forEach((el, i) => {
        const htmlEl = el as HTMLElement;
        console.log(`    [${i}] ${el.tagName} - ${htmlEl.offsetWidth}x${htmlEl.offsetHeight} - visible: ${htmlEl.offsetParent !== null}`);
      });
    }
  });
  
  // Provjeri i sve SVG elemente
  const allSvgs = document.querySelectorAll('svg');
  console.log(`📊 Ukupno SVG elemenata na stranici: ${allSvgs.length}`);
  
  // Provjeri i sve canvas elemente
  const allCanvas = document.querySelectorAll('canvas');
  console.log(`🎨 Ukupno Canvas elemenata na stranici: ${allCanvas.length}`);
}

/**
 * Registruj Noto Sans font za podršku bosanskih karaktera
 */
const registerFont = (pdf: any) => {
  const stripPrefix = (base64String: string) => {
    const prefix = 'data:font/ttf;base64,';
    if (base64String.startsWith(prefix)) {
      return base64String.substring(prefix.length);
    }
    return base64String;
  };

  if (notoSansRegularBase64) {
    const cleanedRegular = stripPrefix(notoSansRegularBase64);
    pdf.addFileToVFS('NotoSans-Regular.ttf', cleanedRegular);
    pdf.addFont('NotoSans-Regular.ttf', FONT_NAME, 'normal');
  } else {
    console.error('Noto Sans Regular font data not loaded.');
  }

  if (notoSansBoldBase64) {
    const cleanedBold = stripPrefix(notoSansBoldBase64);
    pdf.addFileToVFS('NotoSans-Bold.ttf', cleanedBold);
    pdf.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold');
  } else {
    console.error('Noto Sans Bold font data not loaded.');
  }
};

// Tipovi za eksport podatke
export interface ExportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalCurrent: number;
    totalPrevious: number;
    growth: number;
    operationsCount: number;
  };
  chartData?: Array<{
    period: string;
    current: number;
    previous: number;
    growth: number;
  }>;
  destinations?: Array<{
    name: string;
    current: number;
    previous: number;
    growth: number;
    marketShare: number;
  }>;
  airlines?: Array<{
    name: string;
    current: number;
    previous: number;
    growth: number;
    marketShare: number;
  }>;
  alerts?: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
    affectedEntity: string;
    changePercent: number;
  }>;
}

export interface ExportOptions {
  format: 'pdf' | 'excel';
  includeCharts?: boolean;
  includeDetails?: boolean;
  includeAlerts?: boolean;
  filename?: string;
}

/**
 * Glavna funkcija za eksport analitike
 */
export async function exportAnalytics(data: ExportData, options: ExportOptions): Promise<void> {
  console.log('📋 exportAnalytics pozvan', { 
    format: options.format, 
    includeCharts: options.includeCharts,
    includeDetails: options.includeDetails,
    title: data.title 
  });
  
  try {
    if (options.format === 'pdf') {
      console.log('📄 Pozivam exportToPDF...');
      await exportToPDF(data, options);
    } else if (options.format === 'excel') {
      console.log('📊 Pozivam exportToExcel...');
      await exportToExcel(data, options);
    } else {
      throw new Error('Nepodržan format eksporta');
    }
    console.log('✅ Export uspješno završen');
  } catch (error) {
    console.error('❌ Greška pri eksportu:', error);
    throw new Error('Eksport nije uspješan. Molimo pokušajte ponovo.');
  }
}

/**
 * Eksport u PDF format
 */
async function exportToPDF(data: ExportData, options: ExportOptions): Promise<void> {
  console.log('🚀 Počinje PDF eksport', { options, includeCharts: options.includeCharts });
  
  const { jsPDF } = await import('jspdf');
  const html2canvas = await import('html2canvas');
  
  const filename = options.filename || `analitika_${formatDateForFilename(data.generatedAt)}.pdf`;
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  
  // Registruj font za podršku bosanskih karaktera
  registerFont(pdf);
  pdf.setFont(FONT_NAME, 'normal');
  
  let yPosition = 30;
  
  // Title
  pdf.setFontSize(20);
  pdf.setFont(FONT_NAME, 'bold');
  pdf.text(data.title, 20, yPosition);
  yPosition += 15;
  
  if (data.subtitle) {
    pdf.setFontSize(14);
    pdf.setFont(FONT_NAME, 'normal');
    pdf.text(data.subtitle, 20, yPosition);
    yPosition += 10;
  }
  
  // Metadata
  pdf.setFontSize(12);
  pdf.setFont(FONT_NAME, 'normal');
  pdf.text(`Generirano: ${formatDateBS(data.generatedAt)}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Period: ${formatDate(data.period.startDate)} - ${formatDate(data.period.endDate)}`, 20, yPosition);
  yPosition += 15;
  
  // Summary section
  pdf.setFontSize(16);
  pdf.setFont(FONT_NAME, 'bold');
  pdf.text('SAŽETAK', 20, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(12);
  pdf.setFont(FONT_NAME, 'normal');
  pdf.text(`Trenutni period: ${formatNumber(data.summary.totalCurrent)} L`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Prethodni period: ${formatNumber(data.summary.totalPrevious)} L`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Promjena: ${formatGrowth(data.summary.growth)}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Broj operacija: ${data.summary.operationsCount}`, 20, yPosition);
  yPosition += 15;
  
  // Export charts if requested
  if (options.includeCharts) {
    console.log('📊 Počinje eksport chart-ova...');
    
    // Prvo provjeri šta se nalazi na stranici
    debugPageElements();
    
    // Čekaj kratko da se chart-ovi učitaju
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('⏰ Čekanje završeno, ponovo proveravam elemente...');
    debugPageElements();
    
    // Pokušaj prvo sa kontejner pristupom
    const chartsExported = await exportChartsContainerToPDF(pdf, yPosition, pageWidth, pageHeight, margin);
    
    if (!chartsExported) {
      console.log('🔄 Kontejner pristup neuspješan, pokušavam pojedinačne chart-ove...');
      // Ako kontejner pristup ne radi, pokušaj sa pojedinačnim chart-ovima
      await exportChartsToPDF(pdf, yPosition, pageWidth, pageHeight, margin);
    }
    
    yPosition += 100; // Adjust position after charts
    console.log('✅ Chart eksport završen');
  } else {
    console.log('⚠️ Chart eksport preskočen - includeCharts je false');
  }
  
  // Chart data table
  if (options.includeDetails && data.chartData && data.chartData.length > 0) {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.setFontSize(16);
    pdf.setFont(FONT_NAME, 'bold');
    pdf.text('TREND PODACI', 20, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.setFont(FONT_NAME, 'normal');
    const colWidth = (pageWidth - 40) / 4;
    
    // Headers
    pdf.text('Period', 20, yPosition);
    pdf.text('Trenutni', 20 + colWidth, yPosition);
    pdf.text('Prethodni', 20 + colWidth * 2, yPosition);
    pdf.text('Promjena (%)', 20 + colWidth * 3, yPosition);
    yPosition += 8;
    
    // Data rows
    data.chartData.forEach(point => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text(point.period, 20, yPosition);
      pdf.text(formatNumber(point.current), 20 + colWidth, yPosition);
      pdf.text(formatNumber(point.previous), 20 + colWidth * 2, yPosition);
      pdf.text(formatGrowth(point.growth), 20 + colWidth * 3, yPosition);
      yPosition += 6;
    });
    yPosition += 10;
  }
  
  // Destinations
  if (options.includeDetails && data.destinations && data.destinations.length > 0) {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.setFontSize(16);
    pdf.setFont(FONT_NAME, 'bold');
    pdf.text('TOP DESTINACIJE', 20, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.setFont(FONT_NAME, 'normal');
    data.destinations.slice(0, 15).forEach((dest, i) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text(`${i + 1}. ${dest.name}: ${formatNumber(dest.current)} L (${formatGrowth(dest.growth)})`, 20, yPosition);
      yPosition += 6;
    });
    yPosition += 10;
  }
  
  // Airlines
  if (options.includeDetails && data.airlines && data.airlines.length > 0) {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.setFontSize(16);
    pdf.setFont(FONT_NAME, 'bold');
    pdf.text('TOP AVIOKOMPANJE', 20, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.setFont(FONT_NAME, 'normal');
    data.airlines.slice(0, 15).forEach((airline, i) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text(`${i + 1}. ${airline.name}: ${formatNumber(airline.current)} L (${formatGrowth(airline.growth)})`, 20, yPosition);
      yPosition += 6;
    });
    yPosition += 10;
  }
  
  // Alerts
  if (options.includeAlerts && data.alerts && data.alerts.length > 0) {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.setFontSize(16);
    pdf.text('UPOZORENJA', 20, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(10);
    data.alerts.forEach(alert => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text(`• ${alert.title} (${alert.severity.toUpperCase()}): ${alert.changePercent.toFixed(1)}%`, 20, yPosition);
      yPosition += 6;
    });
  }
  
  console.log('💾 Snimam PDF fajl:', filename);
  pdf.save(filename);
  console.log('🎉 PDF uspješno snimljen!');
}

/**
 * Eksport u Excel format
 */
async function exportToExcel(data: ExportData, options: ExportOptions): Promise<void> {
  const XLSX = await import('xlsx');
  
  const filename = options.filename || `analitika_${formatDateForFilename(data.generatedAt)}.xlsx`;
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['Naslov', data.title],
    ['Podnaslov', data.subtitle || ''],
    ['Generirano', formatDateBS(data.generatedAt)],
    ['Period od', formatDate(data.period.startDate)],
    ['Period do', formatDate(data.period.endDate)],
    [''],
    ['SAŽETAK'],
    ['Trenutni period (L)', data.summary.totalCurrent],
    ['Prethodni period (L)', data.summary.totalPrevious],
    ['Promjena (%)', data.summary.growth],
    ['Broj operacija', data.summary.operationsCount]
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Sažetak');
  
  // Chart data sheet
  if (options.includeDetails && data.chartData && data.chartData.length > 0) {
    const chartSheet = XLSX.utils.json_to_sheet(data.chartData.map(point => ({
      'Period': point.period,
      'Trenutni': point.current,
      'Prethodni': point.previous,
      'Promjena (%)': point.growth
    })));
    
    XLSX.utils.book_append_sheet(workbook, chartSheet, 'Trend podaci');
  }
  
  // Destinations sheet
  if (options.includeDetails && data.destinations && data.destinations.length > 0) {
    const destinationsSheet = XLSX.utils.json_to_sheet(data.destinations.map(dest => ({
      'Destinacija': dest.name,
      'Trenutno (L)': dest.current,
      'Prethodno (L)': dest.previous,
      'Promjena (%)': dest.growth,
      'Market Share (%)': dest.marketShare
    })));
    
    XLSX.utils.book_append_sheet(workbook, destinationsSheet, 'Destinacije');
  }
  
  // Airlines sheet
  if (options.includeDetails && data.airlines && data.airlines.length > 0) {
    const airlinesSheet = XLSX.utils.json_to_sheet(data.airlines.map(airline => ({
      'Aviokompanija': airline.name,
      'Trenutno (L)': airline.current,
      'Prethodno (L)': airline.previous,
      'Promjena (%)': airline.growth,
      'Market Share (%)': airline.marketShare
    })));
    
    XLSX.utils.book_append_sheet(workbook, airlinesSheet, 'Aviokompanje');
  }
  
  // Alerts sheet
  if (options.includeAlerts && data.alerts && data.alerts.length > 0) {
    const alertsSheet = XLSX.utils.json_to_sheet(data.alerts.map(alert => ({
      'Tip': alert.type,
      'Ozbiljnost': alert.severity,
      'Naslov': alert.title,
      'Opis': alert.description,
      'Entitet': alert.affectedEntity,
      'Promjena (%)': alert.changePercent
    })));
    
    XLSX.utils.book_append_sheet(workbook, alertsSheet, 'Upozorenja');
  }

  // Detailed Analysis sheet - kombinuje sve podatke
  if (options.includeDetails) {
    const detailedData = [];
    
    // Dodaj osnovne informacije
    detailedData.push(['OSNOVNE INFORMACIJE', '', '', '']);
    detailedData.push(['Naslov', data.title, '', '']);
    detailedData.push(['Podnaslov', data.subtitle || '', '', '']);
    detailedData.push(['Generirano', formatDateBS(data.generatedAt), '', '']);
    detailedData.push(['Period od', formatDate(data.period.startDate), '', '']);
    detailedData.push(['Period do', formatDate(data.period.endDate), '', '']);
    detailedData.push(['', '', '', '']);
    
    // Dodaj sažetak
    detailedData.push(['SAŽETAK ANALIZE', '', '', '']);
    detailedData.push(['Trenutni period (L)', data.summary.totalCurrent, '', '']);
    detailedData.push(['Prethodni period (L)', data.summary.totalPrevious, '', '']);
    detailedData.push(['Promjena (%)', data.summary.growth, '', '']);
    detailedData.push(['Broj operacija', data.summary.operationsCount, '', '']);
    detailedData.push(['', '', '', '']);
    
    // Dodaj trend podatke ako postoje
    if (data.chartData && data.chartData.length > 0) {
      detailedData.push(['TREND PODACI', '', '', '']);
      detailedData.push(['Period', 'Trenutni (L)', 'Prethodni (L)', 'Promjena (%)']);
      data.chartData.forEach(point => {
        detailedData.push([
          point.period,
          point.current,
          point.previous,
          point.growth
        ]);
      });
      detailedData.push(['', '', '', '']);
    }
    
    // Dodaj top destinacije ako postoje
    if (data.destinations && data.destinations.length > 0) {
      detailedData.push(['TOP DESTINACIJE', '', '', '']);
      detailedData.push(['Destinacija', 'Trenutno (L)', 'Promjena (%)', 'Market Share (%)']);
      data.destinations.slice(0, 10).forEach(dest => {
        detailedData.push([
          dest.name,
          dest.current,
          dest.growth,
          dest.marketShare
        ]);
      });
      detailedData.push(['', '', '', '']);
    }
    
    // Dodaj top aviokompanije ako postoje
    if (data.airlines && data.airlines.length > 0) {
      detailedData.push(['TOP AVIOKOMPANIJE', '', '', '']);
      detailedData.push(['Aviokompanija', 'Trenutno (L)', 'Promjena (%)', 'Market Share (%)']);
      data.airlines.slice(0, 10).forEach(airline => {
        detailedData.push([
          airline.name,
          airline.current,
          airline.growth,
          airline.marketShare
        ]);
      });
    }
    
    const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detaljna analiza');
  }
  
  // Save file
  XLSX.writeFile(workbook, filename);
}

/**
 * Generiraj PDF sadržaj (placeholder)
 */
function generatePDFContent(data: ExportData, options: ExportOptions): string {
  const content = `
ANALITIKA I KOMPARACIJA - IZVJEŠTAJ
=====================================

Naslov: ${data.title}
${data.subtitle ? `Podnaslov: ${data.subtitle}` : ''}
Generirano: ${data.generatedAt.toLocaleString('bs-BA')}
Period: ${formatDate(data.period.startDate)} - ${formatDate(data.period.endDate)}

SAŽETAK
-------
Trenutni period: ${formatNumber(data.summary.totalCurrent)} L
Prethodni period: ${formatNumber(data.summary.totalPrevious)} L
Promjena: ${formatGrowth(data.summary.growth)}
Broj operacija: ${data.summary.operationsCount}

${options.includeDetails && data.destinations ? `
TOP DESTINACIJE
---------------
${data.destinations.slice(0, 10).map((dest, i) => 
  `${i + 1}. ${dest.name}: ${formatNumber(dest.current)} L (${formatGrowth(dest.growth)})`
).join('\n')}
` : ''}

${options.includeDetails && data.airlines ? `
TOP AVIOKOMPANJE
----------------
${data.airlines.slice(0, 10).map((airline, i) => 
  `${i + 1}. ${airline.name}: ${formatNumber(airline.current)} L (${formatGrowth(airline.growth)})`
).join('\n')}
` : ''}

${options.includeAlerts && data.alerts && data.alerts.length > 0 ? `
UPOZORENJA
----------
${data.alerts.map(alert => 
  `- ${alert.title} (${alert.severity.toUpperCase()}): ${alert.changePercent.toFixed(1)}%`
).join('\n')}
` : ''}

Generirano pomoću Avio Servis sistema
  `;
  
  return content;
}

/**
 * Generiraj CSV sadržaj
 */
function generateCSVContent(data: ExportData, options: ExportOptions): string {
  let csv = '';
  
  // Header informacije
  csv += `Analitika i komparacija - Izvještaj\n`;
  csv += `Naslov,${data.title}\n`;
  if (data.subtitle) csv += `Podnaslov,${data.subtitle}\n`;
  csv += `Generirano,${data.generatedAt.toLocaleString('bs-BA')}\n`;
  csv += `Period od,${formatDate(data.period.startDate)}\n`;
  csv += `Period do,${formatDate(data.period.endDate)}\n`;
  csv += `\n`;
  
  // Sažetak
  csv += `SAŽETAK\n`;
  csv += `Metrika,Vrijednost\n`;
  csv += `Trenutni period (L),${data.summary.totalCurrent}\n`;
  csv += `Prethodni period (L),${data.summary.totalPrevious}\n`;
  csv += `Promjena (%),${data.summary.growth.toFixed(2)}\n`;
  csv += `Broj operacija,${data.summary.operationsCount}\n`;
  csv += `\n`;
  
  // Chart data
  if (options.includeDetails && data.chartData) {
    csv += `TREND PODACI\n`;
    csv += `Period,Trenutni,Prethodni,Promjena (%)\n`;
    data.chartData.forEach(point => {
      csv += `${point.period},${point.current},${point.previous},${point.growth.toFixed(2)}\n`;
    });
    csv += `\n`;
  }
  
  // Destinacije
  if (options.includeDetails && data.destinations) {
    csv += `DESTINACIJE\n`;
    csv += `Naziv,Trenutno (L),Prethodno (L),Promjena (%),Market Share (%)\n`;
    data.destinations.forEach(dest => {
      csv += `${dest.name},${dest.current},${dest.previous},${dest.growth.toFixed(2)},${dest.marketShare.toFixed(2)}\n`;
    });
    csv += `\n`;
  }
  
  // Aviokompanje
  if (options.includeDetails && data.airlines) {
    csv += `AVIOKOMPANJE\n`;
    csv += `Naziv,Trenutno (L),Prethodno (L),Promjena (%),Market Share (%)\n`;
    data.airlines.forEach(airline => {
      csv += `${airline.name},${airline.current},${airline.previous},${airline.growth.toFixed(2)},${airline.marketShare.toFixed(2)}\n`;
    });
    csv += `\n`;
  }
  
  // Upozorenja
  if (options.includeAlerts && data.alerts && data.alerts.length > 0) {
    csv += `UPOZORENJA\n`;
    csv += `Tip,Ozbiljnost,Naslov,Opis,Entitet,Promjena (%)\n`;
    data.alerts.forEach(alert => {
      csv += `${alert.type},${alert.severity},${alert.title},"${alert.description}",${alert.affectedEntity},${alert.changePercent.toFixed(2)}\n`;
    });
  }
  
  return csv;
}

/**
 * Download file helper
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Helper funkcije za formatiranje
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat('bs-BA').format(Math.round(num));
}

function formatGrowth(growth: number): string {
  const sign = growth > 0 ? '+' : '';
  return `${sign}${growth.toFixed(1)}%`;
}

function formatDate(dateStr: string): string {
  return formatDateBS(dateStr);
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

/**
 * Eksport specifične sekcije (destinacije, aviokompanje, itd.)
 */
export async function exportSection(
  sectionType: 'destinations' | 'airlines' | 'alerts',
  sectionData: any[],
  options: Omit<ExportOptions, 'includeCharts' | 'includeDetails' | 'includeAlerts'>
): Promise<void> {
  const data: ExportData = {
    title: getSectionTitle(sectionType),
    generatedAt: new Date(),
    period: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    summary: {
      totalCurrent: 0,
      totalPrevious: 0,
      growth: 0,
      operationsCount: 0
    }
  };
  
  // Dodaj specifične podatke ovisno o sekciji
  if (sectionType === 'destinations') {
    data.destinations = sectionData;
  } else if (sectionType === 'airlines') {
    data.airlines = sectionData;
  } else if (sectionType === 'alerts') {
    data.alerts = sectionData;
  }
  
  const exportOptions: ExportOptions = {
    ...options,
    includeDetails: sectionType !== 'alerts',
    includeAlerts: sectionType === 'alerts',
    includeCharts: false
  };
  
  await exportAnalytics(data, exportOptions);
}

function getSectionTitle(sectionType: string): string {
  switch (sectionType) {
    case 'destinations': return 'Analiza po destinacijama';
    case 'airlines': return 'Analiza po aviokompanijama';
    case 'alerts': return 'Upozorenja i anomalije';
    default: return 'Analitika izvještaj';
  }
}

/**
 * Provjeri da li je browser podržan za eksport
 */
export function isExportSupported(): boolean {
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined' && 
         typeof Blob !== 'undefined';
}

/**
 * Dobij preporučenu veličinu datoteke za eksport
 */
export function getEstimatedFileSize(data: ExportData, format: 'pdf' | 'excel'): string {
  let estimatedSize = 0;
  
  // Osnovni sadržaj
  estimatedSize += 5; // KB za osnovne informacije
  
  // Chart data
  if (data.chartData) {
    estimatedSize += data.chartData.length * 0.1; // KB po data point
  }
  
  // Destinacije i aviokompanje
  if (data.destinations) {
    estimatedSize += data.destinations.length * 0.2;
  }
  if (data.airlines) {
    estimatedSize += data.airlines.length * 0.2;
  }
  
  // Upozorenja
  if (data.alerts) {
    estimatedSize += data.alerts.length * 0.5;
  }
  
  // Format multiplier
  if (format === 'pdf') {
    estimatedSize *= 2; // PDF je veći od CSV-a
  }
  
  if (estimatedSize < 1) return '< 1 KB';
  if (estimatedSize < 1024) return `${Math.round(estimatedSize)} KB`;
  return `${(estimatedSize / 1024).toFixed(1)} MB`;
}

/**
 * Eksportuj chart kontejner u PDF (pokušaj sa cjelim kontejnerom)
 */
async function exportChartsContainerToPDF(
  pdf: any, 
  startY: number, 
  pageWidth: number, 
  pageHeight: number, 
  margin: number
): Promise<boolean> {
  try {
    const html2canvas = await import('html2canvas');
    
    // Pokušaj pronaći glavni kontejner sa chart-ovima
    const containerSelectors = [
      '#analytics-charts-container', // Specifični ID koji smo dodali
      '[data-export="analytics-content"]', // Specifični data atribut
      '.space-y-6', // Glavni kontejner analytics stranice
      '[class*="analytics"]',
      '[class*="chart"]',
      '.grid',
      'main',
      '[role="main"]'
    ];
    
    let container: HTMLElement | null = null;
    
    for (const selector of containerSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        // Provjeri da li kontejner sadrži chart elemente
        const hasCharts = element.querySelector('[data-chart], svg, canvas');
        if (hasCharts && element instanceof HTMLElement) {
          container = element;
          console.log('Pronađen chart kontejner:', selector);
          break;
        }
      }
      if (container) break;
    }
    
    if (!container) {
      console.warn('Nije pronađen chart kontejner');
      return false;
    }
    
    console.log('Eksportujem chart kontejner:', {
      tagName: container.tagName,
      className: container.className,
      width: container.offsetWidth,
      height: container.offsetHeight
    });
    
    // Kreiraj canvas od kontejnera
    const canvas = await html2canvas.default(container, {
      backgroundColor: '#ffffff',
      scale: 1,
      logging: true,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true,
      removeContainer: false,
      width: Math.min(container.offsetWidth, 1200),
      height: Math.min(container.offsetHeight, 800)
    });
    
    console.log('Kontejner canvas kreiran:', {
      width: canvas.width,
      height: canvas.height
    });
    
    // Konvertuj canvas u sliku
    const imgData = canvas.toDataURL('image/png');
    
    // Dodaj naslov za chart-ove
    pdf.setFontSize(16);
    pdf.setFont(FONT_NAME, 'bold');
    pdf.text('GRAFIČKI PRIKAZI', margin, startY);
    
    // Izračunaj dimenzije za PDF
    const maxWidth = pageWidth - 2 * margin;
    const imgWidth = Math.min(maxWidth, 170);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let currentY = startY + 15;
    
    // Provjeri da li ima dovoljno mjesta na stranici
    if (currentY + imgHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      
      // Ponovi naslov na novoj stranici
      pdf.setFontSize(16);
      pdf.setFont(FONT_NAME, 'bold');
      pdf.text('GRAFIČKI PRIKAZI', margin, currentY);
      currentY += 15;
    }
    
    // Dodaj sliku u PDF
    pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
    
    console.log('Chart kontejner uspješno dodan u PDF');
    return true;
    
  } catch (error) {
    console.error('Greška pri eksportu chart kontejnera:', error);
    return false;
  }
}

/**
 * Eksportuj chart-ove u PDF
 */
async function exportChartsToPDF(
  pdf: any, 
  startY: number, 
  pageWidth: number, 
  pageHeight: number, 
  margin: number
): Promise<void> {
  try {
    const html2canvas = await import('html2canvas');
    
    // Pokušaj različite pristupe za pronalaženje chart-ova
    const selectors = [
      '[data-chart="comparison-chart"]',
      '[data-chart="daily-trend"]', 
      '.chart-svg',
      'svg[data-chart]',
      '[data-chart]',
      '.recharts-wrapper',
      'canvas',
      'svg[class*="chart"]'
    ];
    
    let chartElements: NodeListOf<Element> | null = null;
    let usedSelector = '';
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        chartElements = elements;
        usedSelector = selector;
        break;
      }
    }
    
    console.log('Korišten selektor:', usedSelector);
    console.log('Pronađeno chart elemenata:', chartElements?.length || 0);
    
    if (!chartElements || chartElements.length === 0) {
      console.warn('Nisu pronađeni chart elementi za eksport');
      return;
    }

    let currentY = startY;
    
    // Dodaj naslov za chart-ove
    pdf.setFontSize(16);
    pdf.setFont(FONT_NAME, 'bold');
    pdf.text('GRAFIČKI PRIKAZI', margin, currentY);
    currentY += 15;
    
    for (let i = 0; i < Math.min(chartElements.length, 5); i++) {
      const element = chartElements[i] as HTMLElement;
      
      console.log(`Pokušavam eksport chart-a ${i}:`, {
        tagName: element.tagName,
        className: element.className,
        width: element.offsetWidth,
        height: element.offsetHeight,
        visible: element.offsetParent !== null
      });
      
      try {
        // Provjeri da li element ima dovoljno visine i širine
        if (element.offsetWidth < 50 || element.offsetHeight < 50) {
          console.warn(`Chart ${i} preskočen - premale dimenzije`);
          continue;
        }
        
        // Provjeri da li je element vidljiv
        if (element.offsetParent === null) {
          console.warn(`Chart ${i} preskočen - nije vidljiv`);
          continue;
        }
        
        // Kreiraj canvas od chart elementa
        const canvas = await html2canvas.default(element, {
          backgroundColor: '#ffffff',
          scale: 1.5,
          logging: true,
          useCORS: true,
          allowTaint: true,
          foreignObjectRendering: true,
          removeContainer: false
        });
        
        console.log(`Chart ${i} canvas kreiran:`, {
          width: canvas.width,
          height: canvas.height
        });
        
        // Konvertuj canvas u sliku
        const imgData = canvas.toDataURL('image/png');
        
        // Izračunaj dimenzije za PDF
        const maxWidth = pageWidth - 2 * margin;
        const imgWidth = Math.min(maxWidth, 160);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Provjeri da li ima dovoljno mjesta na stranici
        if (currentY + imgHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
          
          // Ponovi naslov na novoj stranici
          pdf.setFontSize(16);
          pdf.setFont(FONT_NAME, 'bold');
          pdf.text('GRAFIČKI PRIKAZI (nastavak)', margin, currentY);
          currentY += 15;
        }
        
        // Dodaj sliku u PDF
        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 15;
        
        console.log(`Chart ${i} uspješno dodan u PDF`);
        
      } catch (chartError) {
        console.error(`Greška pri eksportu chart-a ${i}:`, chartError);
        // Nastavi sa sljedećim chart-om
        continue;
      }
    }
    
  } catch (error) {
    console.error('Greška pri eksportu chart-ova:', error);
    // Ne prekidaj eksport zbog chart grešaka
  }
}
