import React from 'react';
import { ServiceRecord } from '@/types';
import { formatServiceCategory, formatDateForDisplay } from './serviceHelpers';
import { getSecureFileUrl } from '@/lib/utils';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { Button } from '@/components/ui/Button';
import { FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';

interface ServiceRecordDetailsViewProps {
  record: ServiceRecord;
  onClose: () => void;
}

const FONT_NAME = 'NotoSans';

const ServiceRecordDetailsView: React.FC<ServiceRecordDetailsViewProps> = ({ record, onClose }) => {
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
      doc.setFont(FONT_NAME, 'normal');
      doc.text(language === 'bs' 
        ? `Datum servisa: ${formatDateForDisplay(record.serviceDate)}` 
        : `Service date: ${formatDateForDisplay(record.serviceDate)}`, 14, 30);
      
      // Add service details
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      let yPos = 40;
      
      // Category
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Kategorija:' : 'Category:', 14, yPos);
      doc.setFont(FONT_NAME, 'normal');
      doc.text(formatServiceCategory(record.category), 50, yPos);
      yPos += 8;
      
      // Description
      doc.setFont(FONT_NAME, 'bold');
      doc.text(language === 'bs' ? 'Opis:' : 'Description:', 14, yPos);
      yPos += 6;
      doc.setFont(FONT_NAME, 'normal');
      
      // Split description into lines to fit the page width
      const descriptionLines = doc.splitTextToSize(record.description, 180);
      doc.text(descriptionLines, 14, yPos);
      yPos += descriptionLines.length * 6 + 8;
      
      // Service items
      if (record.serviceItems && record.serviceItems.length > 0) {
        doc.setFont(FONT_NAME, 'bold');
        doc.text(language === 'bs' ? 'Stavke servisa:' : 'Service items:', 14, yPos);
        yPos += 8;
        
        // Create table for service items
        const tableColumn = language === 'bs' 
          ? ['Tip', 'Opis', 'Status'] 
          : ['Type', 'Description', 'Status'];
        
        const tableRows = record.serviceItems.map(item => [
          formatServiceItemType(item.type, language),
          item.description || '',
          typeof item.replaced === 'boolean' 
            ? (language === 'bs' 
                ? (item.replaced ? 'Zamijenjeno' : 'Nije zamijenjeno') 
                : (item.replaced ? 'Replaced' : 'Not replaced'))
            : ''
        ]);
        
        // Add the table to the PDF
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: yPos,
          styles: {
            font: FONT_NAME,
            fontSize: 10,
            cellPadding: 3,
            lineColor: [200, 200, 200]
          },
          headStyles: {
            fillColor: [44, 62, 80],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          }
        });
        
        // Update yPos after the table
        const finalY = (doc as any).lastAutoTable.finalY || yPos + tableRows.length * 10;
        yPos = finalY + 10;
      }
      
      // Document link
      if (record.documentUrl) {
        doc.setFont(FONT_NAME, 'bold');
        doc.text(language === 'bs' ? 'Dokument:' : 'Document:', 14, yPos);
        doc.setFont(FONT_NAME, 'normal');
        doc.setTextColor(0, 0, 255);
        const linkText = language === 'bs' ? 'Priložen dokument' : 'Document attached';
doc.text(linkText, 50, yPos);
const textWidth = doc.getTextWidth(linkText);
doc.link(50, yPos, textWidth, 10, { url: getSecureFileUrl(record.documentUrl) });
        doc.setTextColor(60, 60, 60);
      }
      
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
    <div className="space-y-3 p-1">
      <p><strong className="font-medium text-gray-700">Datum servisa:</strong> {formatDateForDisplay(record.serviceDate)}</p>
      <p><strong className="font-medium text-gray-700">Kategorija:</strong> {formatServiceCategory(record.category)}</p>
      <div>
        <strong className="font-medium text-gray-700">Opis:</strong>
        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap bg-gray-50 p-2 rounded-md">{record.description}</p>
      </div>
      {record.serviceItems && record.serviceItems.length > 0 && (
        <div>
          <strong className="font-medium text-gray-700">Stavke servisa:</strong>
          <ul className="list-disc list-inside pl-4 mt-1 space-y-1 bg-gray-50 p-2 rounded-md">
            {record.serviceItems.map((item, index) => (
              <li key={index} className="text-sm text-gray-600">
                {item.type} {item.description ? `- ${item.description}` : ''} {item.replaced ? '(Zamijenjeno)': ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {record.documentUrl && (
        <div>
          <strong className="font-medium text-gray-700">Dokument:</strong>
          <a 
            href={getSecureFileUrl(record.documentUrl)}
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center mt-1 text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            <FaExternalLinkAlt className="mr-1.5 h-4 w-4" /> Preuzmi/Otvori dokument
          </a>
        </div>
      )}
      
      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-between w-full">
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => generatePdfReport('bs')} 
            className="bg-red-600 border border-red-700 text-white shadow-lg hover:bg-red-700 transition-all duration-200 rounded-xl flex-1 sm:flex-none"
          >
            <FileText size={16} className="mr-2" />
            <span>PDF (BS)</span>
          </Button>
          <Button 
            onClick={() => generatePdfReport('en')} 
            className="bg-blue-600 border border-blue-700 text-white shadow-lg hover:bg-blue-700 transition-all duration-200 rounded-xl flex-1 sm:flex-none"
          >
            <FileText size={16} className="mr-2" />
            <span>PDF (EN)</span>
          </Button>
        </div>
        <Button onClick={onClose} variant="secondary">Zatvori</Button>
      </div>
    </div>
  );
};

export default ServiceRecordDetailsView;
