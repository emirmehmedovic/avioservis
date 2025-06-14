import dayjs from 'dayjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FuelingOperation } from '../types';
import { formatDate } from './helpers';

// Constants
const FONT_NAME = 'helvetica'; // Konstanta za font koji se koristi u PDF-u

/**
 * Configure PDF for proper special character support (č, ć, ž, đ, š)
 */
const configurePDFForSpecialChars = (doc: jsPDF): void => {
  // Use built-in Helvetica font which has decent Unicode support
  doc.setFont('helvetica', 'normal');
  
  // Set language to Croatian which supports Bosnian special characters
  doc.setLanguage('hr');
  
  // Set font size
  doc.setFontSize(10);
};

// Funkcija za učitavanje slike i konverziju u Base64 (dodata iz prethodnog primjera)
const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = url;
  });
};


/**
 * Generate a consolidated PDF invoice for multiple fueling operations
 */
export const generateConsolidatedPDFInvoice = async (operations: FuelingOperation[], filterDescription: string): Promise<void> => {
  try {
    if (!operations || operations.length === 0) {
      throw new Error('No operations to generate invoice for');
    }

    // Create a new PDF document
    const doc = new jsPDF({
      putOnlyUsedFonts: true,
      compress: true,
      format: 'a4'
    });
    
    // Add font support for special characters
    configurePDFForSpecialChars(doc);
    
    // Helper function to replace special characters with their Latin equivalents
    const replaceSpecialChars = (text: string): string => {
      return text
        .replace(/č/g, 'c')
        .replace(/ć/g, 'c')
        .replace(/ž/g, 'z')
        .replace(/đ/g, 'd')
        .replace(/š/g, 's')
        .replace(/Č/g, 'C')
        .replace(/Ć/g, 'C')
        .replace(/Ž/g, 'Z')
        .replace(/Đ/g, 'D')
        .replace(/Š/g, 'S');
    };
    
    // Override text function to handle special characters
    const originalText = doc.text.bind(doc);
    doc.text = function(text: string | string[], x: number, y: number, options?: any): jsPDF {
      if (typeof text === 'string') {
        return originalText(replaceSpecialChars(text), x, y, options);
      } else if (Array.isArray(text)) {
        return originalText(text.map(replaceSpecialChars), x, y, options);
      }
      return originalText(text, x, y, options);
    } as any;
    
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // START: Header sa slikom
    const headerHeight = 40;
    try {
      const headerImageUrl = `${window.location.origin}/hifa-header.png`; // Pretpostavka da je isti logo
      const headerImageBase64 = await loadImageAsBase64(headerImageUrl);
      doc.addImage(headerImageBase64, 'PNG', 0, 0, pageWidth, headerHeight);
    } catch (error) {
      console.error('Error adding header image, using fallback:', error);
      doc.setFillColor(240, 240, 250);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFontSize(20);
      doc.setTextColor(0, 51, 102);
      doc.text('AVIOSERVIS d.o.o.', 14, 20); // Fallback text
    }

    const invoiceNumber = `CONS-INV-${new Date().getTime().toString().slice(-6)}-${new Date().getFullYear()}`;
    
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 45, pageWidth - 14, 45);
    
    // Naslov fakture
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('CONSOLIDATED INVOICE FOR FUEL SERVICES', pageWidth / 2, 55, { align: 'center' });
    // END: Header

    // Get client information
    const firstOperation = operations[0];
    const airline = firstOperation.airline;
    
    // START: Dvostupčani layout za informacije
    const rightColumnX = pageWidth / 2;

    // Lijeva kolona - informacije o fakturi
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont(FONT_NAME, 'bold');
    doc.text(`Invoice No.: ${invoiceNumber}`, 14, 70);
    doc.setFont(FONT_NAME, 'normal');
    doc.text(`Issue Date: ${formatDate(new Date().toISOString())}`, 14, 76);

    // Prelamanje teksta za period
    const periodY = 82;
    const periodText = `Period: ${filterDescription}`;
    const periodMaxWidth = pageWidth / 2 - 20;
    const periodLines = doc.splitTextToSize(periodText, periodMaxWidth);
    doc.text(periodLines, 14, periodY);
    const nextYPos = periodY + (periodLines.length * 5);
    doc.text('Parity - CPT Tuzla Airport', 14, nextYPos);

    // Desna kolona - informacije o kupcu
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('BUYER:', rightColumnX, 70);
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`${airline?.name || 'N/A'}`, rightColumnX, 76);
    doc.text(`${airline?.address || 'N/A'}`, rightColumnX, 82);
    doc.text(`ID/VAT No.: ${airline?.taxId || 'N/A'}`, rightColumnX, 88);
    doc.text(`Contact: ${airline?.contact_details || 'N/A'}`, rightColumnX, 94);
    // END: Dvostupčani layout

    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 115, pageWidth - 14, 115);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    // doc.text('OPERATIONS OVERVIEW:', 14, 125); // Moved down after summary table


    const totalLiters = operations.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
    const totalKg = operations.reduce((sum, op) => sum + Number(op.quantity_kg || 0), 0);
    
    const operationsWithCalculations = operations.map(operation => {
      const baseAmount = Number(operation.quantity_kg || 0) * Number(operation.price_per_kg || 0);
      const discountAmount = baseAmount * (Number(operation.discount_percentage || 0) / 100);
      const netAmount = baseAmount - discountAmount;
      return { ...operation, baseAmount, discountAmount, netAmount };
    });
    
    const totalBaseAmount = operationsWithCalculations.reduce((sum, op) => sum + op.baseAmount, 0);
    const totalDiscountAmount = operationsWithCalculations.reduce((sum, op) => sum + op.discountAmount, 0);
    const finalTotalNetAmount = operationsWithCalculations.reduce((sum, op) => sum + op.netAmount, 0);
    
    const currencyCounts = operations.reduce((acc, op) => {
      const currency = op.currency || 'BAM';
      acc[currency] = (acc[currency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    let mostCommonCurrency = 'BAM';
    let maxCount = 0;
    for (const [currency, count] of Object.entries(currencyCounts)) {
      if (count > maxCount) {
        mostCommonCurrency = currency;
        maxCount = count;
      }
    }
    // START: Summary Overview Section
    doc.setFontSize(11);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('SUMMARY OVERVIEW:', 14, 125);
    doc.setFont(FONT_NAME, 'normal');

    const summaryColumn = ['Description', 'Value', 'Unit'];
    const summaryRows = [
      ['Total Fuel Quantity', totalLiters.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'Liters'],
      ['Total Fuel Quantity', totalKg.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'kg'],
      ['Total Base Amount', totalBaseAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }), mostCommonCurrency],
      ['Total Discount Amount', totalDiscountAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }), mostCommonCurrency],
      ['Total Net Amount (Payable)', finalTotalNetAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }), mostCommonCurrency]
    ];

    autoTable(doc, {
      head: [summaryColumn],
      body: summaryRows,
      startY: 130,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, font: FONT_NAME },
      headStyles: { fillColor: [240, 240, 250], textColor: [0, 51, 102], fontStyle: 'bold' },
    });

    const summaryFinalY = (doc as any).lastAutoTable.finalY || 130 + (summaryRows.length + 1) * 10;
    // END: Summary Overview Section

    // START: Operations Overview Section (moved down)
    doc.setFontSize(11);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('OPERATIONS OVERVIEW:', 14, summaryFinalY + 10);
    doc.setFont(FONT_NAME, 'normal');
    
    const tableColumn = ['Date', 'Aircraft Reg.', 'Destination', 'MRN', 'Delivery Note', 'Qty (L)', 'Qty (kg)', 'Price/kg', 'Discount', 'Amount', 'Currency'];
    const tableRows = operationsWithCalculations.map(operation => [
      formatDate(operation.dateTime),
      operation.aircraft_registration || 'N/A',
      operation.destination,
      // Display MRN data if available, otherwise show 'N/A'
      operation.parsedMrnBreakdown && operation.parsedMrnBreakdown.length > 0
        ? (operation.parsedMrnBreakdown.length > 2 
            ? `${operation.parsedMrnBreakdown.slice(0, 2).map(item => item.mrn).join(', ')}, ... (+${operation.parsedMrnBreakdown.length - 2})` 
            : operation.parsedMrnBreakdown.map(item => item.mrn).join(', '))
        : 'N/A',
      operation.delivery_note_number || 'N/A',
      (operation.quantity_liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 }),
      (operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 }),
      (operation.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 5 }),
      operation.discount_percentage ? `${operation.discount_percentage}%` : '0%',
      operation.netAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5 }),
      operation.currency || 'BAM'
    ]);
    
    tableRows.push([
      'TOTAL', '', '', '', '',
      totalLiters.toLocaleString('hr-HR', { minimumFractionDigits: 2 }),
      totalKg.toLocaleString('hr-HR', { minimumFractionDigits: 2 }),
      '',
      totalDiscountAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5 }),
      finalTotalNetAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5 }),
      mostCommonCurrency
    ]);
    
    // Pomoćna funkcija za crtanje footera
    const drawFooter = () => {
        let footerStartY = doc.internal.pageSize.getHeight() - 60;
        const banksCol1 = [
            { name: 'Unicredit banka DD Mostar', num: '3385502203296597' },
            { name: 'Raiffeisen Bank DD Sarajevo', num: '1610000055460052' },
            { name: 'NLB Razvojna banka AD Banja Luka', num: '5620068100579520' },
            { name: 'Bosna Bank International DD Sarajevo', num: '1410010012321008' },
            { name: 'Intesa Sanpaolo banka Sarajevo', num: '1542602004690547' },
            { name: 'Privredna banka Sarajevo dd Sarajevo', num: '1011040053464252' },
            { name: 'ZiraatBank Bank BH dd Sarajevo', num: '1861440310884661' },
        ];
        const banksCol2 = [
            { name: 'NLB Tuzlanska banka DD Tuzla', num: '1322602004200445' },
            { name: 'Sparkasse banka DD Sarajevo', num: '1990490086998668' },
            { name: 'ASA Banka DD Sarajevo', num: '1346651006886807' },
            { name: 'Union banka DD Sarajevo', num: '1020320000019213' },
            { name: 'Nova banka AD Banja Luka', num: '5556000036056073' },
            { name: 'Addiko Bank d.d. Sarajevo', num: '3060003143014340' },
            { name: 'IBAN: BA393389104805286885', num: 'SWIFT: UNCRBA22' },
        ];
        
        doc.setFontSize(8);
        doc.setTextColor(0, 51, 102);
        doc.setFont(FONT_NAME, 'bold');
        doc.text('PAYMENT DETAILS:', 14, footerStartY);
        doc.setFont(FONT_NAME, 'normal');
        
        doc.setTextColor(0, 0, 0);
        doc.text('Reference No.: ' + invoiceNumber, pageWidth - 14, footerStartY, { align: 'right' });
        footerStartY += 6;

        const bankFontSize = 5.5;
        doc.setFontSize(bankFontSize);
        const bankLineSpacing = bankFontSize * 0.8;
        const col1X = 20;
        const col2X = pageWidth / 2 + 10;
        const colWidth = 75;

        let bankY = footerStartY;
        banksCol1.forEach(bank => {
            doc.text(bank.name, col1X, bankY);
            doc.text(bank.num, col1X + colWidth, bankY, { align: 'right' });
            bankY += bankLineSpacing;
        });

        bankY = footerStartY;
        banksCol2.forEach(bank => {
            doc.text(bank.name, col2X, bankY);
            doc.text(bank.num, col2X + colWidth, bankY, { align: 'right' });
            bankY += bankLineSpacing;
        });

        doc.setDrawColor(220, 220, 230);
        doc.setLineWidth(0.3);
        doc.line(pageWidth / 2, footerStartY - 2, pageWidth / 2, bankY);
        
        const finalFooterY = doc.internal.pageSize.getHeight() - 12;
        doc.setDrawColor(200, 200, 220);
        doc.setLineWidth(0.5);
        doc.line(14, finalFooterY, pageWidth - 14, finalFooterY);
        
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Invoice generated: ${new Date().toLocaleString('en-US')}`, pageWidth / 2, finalFooterY + 5, { align: 'center' });
    }
    
    // Primijeni autoTable na dokument sa ispravkama
    autoTable(doc, {
      startY: summaryFinalY + 15, // Adjusted to start after the summary table
      head: [tableColumn],
      body: tableRows as any[][],
      theme: 'grid',
      styles: { fontSize: 8, font: FONT_NAME },
      headStyles: { 
        fillColor: [0, 51, 102],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      margin: { left: 14, right: 14, bottom: 65 }, // Smanjena margina
      willDrawCell: (data) => {
          if (data.section === 'head' && data.pageNumber > 1) {
              return false; // Ne crtaj header ako nije prva stranica
          }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(`Consolidated Invoice No: ${invoiceNumber} - Page ${data.pageNumber}`, pageWidth / 2, 10, { align: 'center' });
        }
      }
    });
    
    // Crtaj footer nakon što je tabela gotova
    drawFooter();
    
    doc.save(`Consolidated-Invoice-${invoiceNumber}.pdf`);
    
  } catch (error) {
    console.error('Error generating consolidated PDF:', error);
    throw error;
  }
};