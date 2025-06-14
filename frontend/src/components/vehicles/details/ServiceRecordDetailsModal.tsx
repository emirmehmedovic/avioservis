import React from 'react';
import { ServiceRecord } from '@/types';
import { formatServiceCategory, formatDateForDisplay } from './serviceHelpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';
import { getSecureFileUrl } from '@/lib/utils';
import { FileText, Download } from 'lucide-react';

interface ServiceRecordDetailsModalProps {
  open: boolean;
  record: ServiceRecord | null;
  onClose: () => void;
}

const FONT_NAME = 'NotoSans';

const ServiceRecordDetailsModal: React.FC<ServiceRecordDetailsModalProps> = ({ open, record, onClose }) => {
  if (!record) return null;
  
  // Register Noto Sans font for proper Bosnian character support
  const registerFont = (doc: jsPDF) => {
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
  
  // Format service item type for PDF
  const formatServiceItemType = (type: string, language: 'bs' | 'en' = 'bs'): string => {
    const typeMapBS: Record<string, string> = {
      'FILTER': 'Filter',
      'HOSE_HD63': 'Crijevo HD63',
      'HOSE_HD38': 'Crijevo HD38',
      'HOSE_TW75': 'Crijevo TW75',
      'HOSE_LEAK_TEST': 'Test curenja crijeva',
      'VOLUMETER': 'Volumetar',
      'MANOMETER': 'Manometar',
      'HECPV_ILCPV': 'HECPV/ILCPV',
      'SIX_MONTH_CHECK': 'Šestomjesečni pregled',
      'ENGINE': 'Motor',
      'BRAKES': 'Kočnice',
      'TRANSMISSION': 'Transmisija',
      'ELECTRICAL': 'Električni sistem',
      'TIRES': 'Gume',
      'OTHER': 'Ostalo'
    };
    
    const typeMapEN: Record<string, string> = {
      'FILTER': 'Filter',
      'HOSE_HD63': 'Hose HD63',
      'HOSE_HD38': 'Hose HD38',
      'HOSE_TW75': 'Hose TW75',
      'HOSE_LEAK_TEST': 'Hose Leak Test',
      'VOLUMETER': 'Volumeter',
      'MANOMETER': 'Manometer',
      'HECPV_ILCPV': 'HECPV/ILCPV',
      'SIX_MONTH_CHECK': 'Six Month Check',
      'ENGINE': 'Engine',
      'BRAKES': 'Brakes',
      'TRANSMISSION': 'Transmission',
      'ELECTRICAL': 'Electrical System',
      'TIRES': 'Tires',
      'OTHER': 'Other'
    };
    
    return language === 'bs' ? (typeMapBS[type] || type) : (typeMapEN[type] || type);
  };
  
  // Generate PDF report for service record
  const generatePdfReport = (language: 'bs' | 'en' = 'bs') => {
    try {
      // Create new PDF document
      const doc = new jsPDF();
      
      // Register Noto Sans font for proper Bosnian character support
      registerFont(doc);
      
      // Set default font
      doc.setFont(FONT_NAME, 'normal');
      
      // Add gradient background
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();
      
      // Add title
      doc.setFontSize(18);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(44, 62, 80); // #2c3e50 - Professional dark blue
      doc.text(language === 'bs' 
        ? `Servisni zapis` 
        : `Service Record`, 14, 22);
      
      // Add subtitle with date
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text(`${formatDateForDisplay(record.serviceDate)}`, 14, 30);
      
      // Add horizontal line
      doc.setDrawColor(44, 62, 80); // #2c3e50 - Professional dark blue
      doc.setLineWidth(0.5);
      doc.line(14, 34, width - 14, 34);
      
      // Basic information section
      let yPos = 45;
      const lineHeight = 7;
      
      // Section title
      doc.setFontSize(14);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(44, 62, 80); // #2c3e50 - Professional dark blue
      doc.text(language === 'bs' ? 'Osnovni podaci' : 'Basic Information', 14, yPos);
      yPos += lineHeight + 3;
      
      // Service record details
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(70, 70, 70); // Slightly lighter for better readability
      doc.text(language === 'bs' ? 'Datum servisa:' : 'Service Date:', 14, yPos);
      doc.setFont(FONT_NAME, 'normal');
      doc.text(formatDateForDisplay(record.serviceDate), 70, yPos);
      yPos += lineHeight;
      
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Kategorija:' : 'Category:', 14, yPos);
      doc.setFont(FONT_NAME, 'normal');
      doc.text(formatServiceCategory(record.category), 70, yPos);
      yPos += lineHeight;
      
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Opis:' : 'Description:', 14, yPos);
      doc.setFont(FONT_NAME, 'normal');
      
      // Handle multiline description
      const description = record.description || (language === 'bs' ? 'Nema opisa' : 'No description');
      // Ograničiti širinu teksta na 125 za bolju čitljivost i da ne izlazi van stranice
      const maxWidth = width - 85; // 70 (početna pozicija) + 15 (margina)
      const splitDescription = doc.splitTextToSize(description, maxWidth);
      doc.text(splitDescription, 70, yPos);
      yPos += (splitDescription.length * lineHeight) + 5;
      
      // Service items section if available
      if (record.serviceItems && record.serviceItems.length > 0) {
        // Add some space
        yPos += 5;
        
        // Section title
        doc.setFontSize(14);
        doc.setFont(FONT_NAME, 'bold');
        doc.setTextColor(44, 62, 80); // #2c3e50 - Professional dark blue
        doc.text(language === 'bs' ? 'Stavke servisa' : 'Service Items', 14, yPos);
        yPos += lineHeight + 3;
        
        // Create table for service items
        const tableColumn = language === 'bs' 
          ? ['Tip', 'Opis', 'Status', 'Trenutni datum', 'Sljedeći datum'] 
          : ['Type', 'Description', 'Status', 'Current Date', 'Next Date'];
          
        const tableRows = record.serviceItems.map(item => {
          const row = [
            formatServiceItemType(item.type, language),
            // Osigurati da se opis u tabeli također prelama ako je predugačak
            item.description || (language === 'bs' ? 'Nema opisa' : 'No description'),
            typeof item.replaced === 'boolean' 
              ? (item.replaced 
                ? (language === 'bs' ? 'Zamijenjeno' : 'Replaced') 
                : (language === 'bs' ? 'Nije zamijenjeno' : 'Not replaced'))
              : (language === 'bs' ? 'N/A' : 'N/A'),
            item.currentDate ? formatDateForDisplay(item.currentDate) : (language === 'bs' ? 'Nije postavljeno' : 'Not set'),
            item.nextDate ? formatDateForDisplay(item.nextDate) : (language === 'bs' ? 'Nije postavljeno' : 'Not set')
          ];
          return row;
        });
        
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: yPos,
          theme: 'grid',
          headStyles: {
            fillColor: [44, 62, 80], // #2c3e50 - Professional dark blue
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            font: FONT_NAME,
            fontSize: 10
          },
          bodyStyles: {
            font: FONT_NAME,
            fontSize: 9,
            textColor: [70, 70, 70]
          },
          alternateRowStyles: {
            fillColor: [240, 242, 245] // Very subtle gray for alternating rows
          },
          columnStyles: {
            1: { cellWidth: 60 }, // Kolona s opisom - fiksna širina za opis
          },
          margin: { top: 10, right: 14, bottom: 10, left: 14 },
          styles: {
            overflow: 'linebreak', // Prelamanje teksta umjesto skraćivanja
            cellPadding: 3
          },
          willDrawCell: (data) => {
            // Osigurati da se tekst u ćelijama prelama ako je predugačak
            if (data.section === 'body' && data.column.index === 1 && typeof data.cell.text === 'string') {
              const text = data.cell.text;
              const textWidth = doc.getStringUnitWidth(text) * data.row.height / doc.internal.scaleFactor;
              if (textWidth > data.cell.width) {
                data.cell.text = doc.splitTextToSize(text, data.cell.width - 4);
              }
            }
          }
        });
        
        // Update yPos after table
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Add document link if available
      if (record.documentUrl) {
        doc.setFontSize(10);
        doc.setFont(FONT_NAME, 'bold');
        doc.setTextColor(60, 60, 60);
        doc.textWithLink(language === 'bs' ? 'Preuzmi dokument' : 'Download document', 70, yPos, { url: getSecureFileUrl(record.documentUrl) });
        yPos += lineHeight;
      }
      
      // Add footer with generation date
      doc.setFontSize(8);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(127, 140, 141); // #7f8c8d - Subtle but professional gray
      doc.text(language === 'bs' 
        ? `Izvještaj generisan: ${format(new Date(), 'dd.MM.yyyy HH:mm')}` 
        : `Report generated: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 
        14, height - 10);
      
      // Save the PDF with appropriate filename
      doc.save(language === 'bs' 
        ? `Servisni_zapis_${formatDateForDisplay(record.serviceDate).replace(/\./g, '-')}.pdf`
        : `Service_record_${formatDateForDisplay(record.serviceDate).replace(/\./g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(language === 'bs' ? 'Došlo je do greške prilikom generisanja PDF izvještaja.' : 'An error occurred while generating the PDF report.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-gradient-to-br from-[#232b3a]/80 to-[#1a1f29]/80 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl text-white p-6">

        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#F08080] tracking-tight mb-1">Detalji servisnog zapisa</DialogTitle>
          <DialogDescription className="text-gray-300 mb-2">
            Prikaz svih detalja za odabrani servisni zapis.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* DATUM */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6">
                <svg className="w-5 h-5 text-[#F08080]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </span>
              <span>
                <span className="font-semibold">Datum:</span> {formatDateForDisplay(record.serviceDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6">
                <svg className="w-5 h-5 text-[#F08080]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </span>
              <span>
                <span className="font-semibold">Kategorija:</span> <span className="inline-block px-2 py-0.5 text-xs bg-[#F08080]/20 text-[#F08080] rounded font-semibold ml-1">{formatServiceCategory(record.category)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
              <span className="inline-flex items-center justify-center w-6 h-6">
                <svg className="w-5 h-5 text-[#F08080]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0A9 9 0 11 3 12a9 9 0 0118 0z" /></svg>
              </span>
              <span>
                <span className="font-semibold">Opis:</span> <span className="ml-1 text-gray-200">{record.description || '-'}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
              <span className="inline-flex items-center justify-center w-6 h-6">
                <svg className="w-5 h-5 text-[#F08080]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </span>
              <span>
                <span className="font-semibold">Dokument:</span> {record.documentUrl ? (
                  <a href={getSecureFileUrl(record.documentUrl)} target="_blank" rel="noopener noreferrer" className="ml-1 text-[#F08080] underline font-medium hover:text-[#F08080]/80 transition-colors">Preuzmi dokument</a>
                ) : (
                  <span className="text-gray-400 ml-1">Nema</span>
                )}
              </span>
            </div>
          </div>

          <hr className="my-4 border-white/10" />

          <div>
            <span className="block font-semibold text-base mb-2 text-[#F08080] tracking-tight">Stavke servisa</span>
            {record.serviceItems && record.serviceItems.length > 0 ? (
              <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                {record.serviceItems.map((item, idx) => (
                  <li key={idx} className="px-4 py-3 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                      <div>
                        <span className="font-semibold text-[#F08080]">{item.type}</span>
                        {item.description && <span className="ml-2 text-gray-200">{item.description}</span>}
                      </div>
                      {typeof item.replaced === 'boolean' && (
                        <span className={item.replaced ? 'inline-block px-2 py-0.5 bg-green-600/80 text-white text-xs rounded mt-2 sm:mt-0' : 'inline-block px-2 py-0.5 bg-red-600/80 text-white text-xs rounded mt-2 sm:mt-0'}>
                          {item.replaced ? 'Zamijenjeno' : 'Nije zamijenjeno'}
                        </span>
                      )}
                    </div>
                    
                    {/* Display date fields if they exist */}
                    {(item.currentDate || item.nextDate) && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                        {item.currentDate && (
                          <div>
                            <span className="font-medium">Trenutni datum: </span>
                            <span>{formatDateForDisplay(item.currentDate)}</span>
                          </div>
                        )}
                        {item.nextDate && (
                          <div>
                            <span className="font-medium">Sljedeći datum: </span>
                            <span>{formatDateForDisplay(item.nextDate)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-gray-400">Nema stavki za ovaj servis.</span>
            )}
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between w-full">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => generatePdfReport('bs')} 
              className="backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all duration-200 rounded-xl flex-1 sm:flex-none"
            >
              <FileText size={16} className="mr-2" />
              <span>PDF (BS)</span>
            </Button>
            <Button 
              onClick={() => generatePdfReport('en')} 
              className="backdrop-blur-md bg-[#6495ED]/30 border border-white/20 text-white shadow-lg hover:bg-[#6495ED]/40 transition-all duration-200 rounded-xl flex-1 sm:flex-none"
            >
              <FileText size={16} className="mr-2" />
              <span>PDF (EN)</span>
            </Button>
          </div>
          <Button onClick={onClose} variant="secondary">Zatvori</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceRecordDetailsModal;
