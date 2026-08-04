import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FuelingOperation } from '../types';
import { mergeAndDownloadInvoice } from './pdfMerger';

// Day.js setup
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Europe/Sarajevo');

const FONT_NAME = 'helvetica';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const configurePDFForSpecialChars = (doc: jsPDF): void => {
  doc.setFont(FONT_NAME, 'normal');
  doc.setLanguage('hr');
  doc.setFontSize(10);
};

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

const loadHeaderImageAsBase64 = (url: string): Promise<string> => {
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
      ctx.filter = 'grayscale(100%)';
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = url;
  });
};

interface FuelingOperationWithExchangeRate extends Omit<FuelingOperation, 'mrnBreakdown' | 'parsedMrnBreakdown'> {
  usd_exchange_rate?: string;
  mrnBreakdown?: string | null;
  parsedMrnBreakdown?: { mrn: string; quantity: number }[] | null;
  exd_number?: string | null;
}

export const formatDate = (dateString: string): string => {
  return dayjs(dateString).tz('Europe/Sarajevo').format('DD.MM.YYYY. HH:mm');
};

export const generateEUFORPDFInvoice = async (operation: FuelingOperationWithExchangeRate): Promise<void> => {
  try {
    const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true, format: 'a4' });
    configurePDFForSpecialChars(doc);

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

    const originalText = doc.text.bind(doc);
    (doc as any).text = function (text: string | string[], x: number, y: number, options?: any): jsPDF {
      if (typeof text === 'string') {
        return originalText(replaceSpecialChars(text), x, y, options);
      } else if (Array.isArray(text)) {
        return originalText(text.map(replaceSpecialChars), x, y, options);
      }
      return originalText(text as any, x, y, options);
    } as any;

    const pageWidth = doc.internal.pageSize.getWidth();
    const topPadding = -9;
    const headerHeight = 40;

    try {
      const headerImageUrl = `${window.location.origin}/hifa-header.png`;
      const headerImageBase64 = await loadHeaderImageAsBase64(headerImageUrl);
      doc.addImage(headerImageBase64, 'PNG', 0, topPadding, pageWidth, headerHeight);
    } catch (error) {
      console.error('Error adding header image:', error);
      doc.setFillColor(240, 240, 250);
      doc.rect(0, topPadding, pageWidth, 40, 'F');
      doc.setFontSize(20);
      doc.setTextColor(0, 51, 102);
      doc.text('HIFA-PETROL d.o.o. Sarajevo', 14, 20 + topPadding);
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('71320 Vogosca, Hotonj bb', 14, 28 + topPadding);
    }

    const deliveryVoucherNumber = operation.delivery_note_number || operation.id.toString();
    const invoiceNumber = `INV-${deliveryVoucherNumber}-${new Date().getFullYear()}`;

    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 45 + topPadding, pageWidth - 14, 45 + topPadding);

    doc.setFontSize(14);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('INVOICE FOR FUEL SERVICES', pageWidth / 2, 55 + topPadding, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('BUYER:', 14, 70 + topPadding);

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // Left column - invoice info
    doc.setFont(FONT_NAME, 'bold');
    doc.text(`Invoice No.: ${invoiceNumber}`, 14, 77 + topPadding);
    doc.text(`Issue Date: ${formatDate(operation.dateTime)}`, 14, 83 + topPadding);
    doc.text(`Service Date: ${formatDate(operation.dateTime)}`, 14, 89 + topPadding);
    doc.setFont(FONT_NAME, 'normal');

    // Right column - buyer info
    const rightColumnX = pageWidth / 2;
    const rightColumnWidth = pageWidth / 2 - 14;
    doc.text(`${operation.airline?.name || 'N/A'}`, rightColumnX, 77 + topPadding);
    const addressText = operation.airline?.address || 'N/A';
    const addressLines = doc.splitTextToSize(addressText, rightColumnWidth);
    let currentY = 83 + topPadding;
    addressLines.forEach((line: string) => {
      doc.text(line, rightColumnX, currentY);
      currentY += 6;
    });

    const contactY = currentY + 2;
    doc.text(`ID/VAT No.: ${operation.airline?.taxId || 'N/A'}`, rightColumnX, contactY);
    doc.text(`Contact: ${operation.airline?.contact_details || 'N/A'}`, rightColumnX, contactY + 6);

    const baseY = contactY + 12;

    // Left flight info
    doc.text(`Aircraft Registration: ${operation.aircraft_registration || 'N/A'}`, 14, baseY);
    doc.text(`Destination: ${operation.destination}`, 14, baseY + 6);
    doc.text(`Flight Number: ${operation.flight_number || 'N/A'}`, 14, baseY + 12);
    doc.text('Parity - CPT Tuzla Airport', 14, baseY + 18);

    // Right column details
    doc.setFont(FONT_NAME, 'bold');
    doc.text(`Delivery Voucher: ${operation.delivery_note_number || 'N/A'}`, rightColumnX, baseY);
    doc.setFont(FONT_NAME, 'normal');
    const mapTrafficType = (type: string | null | undefined): string => {
      if (!type) return 'N/A';
      const mappings: Record<string, string> = { 'Izvoz': 'Export' };
      return mappings[type] || type;
    };
    doc.text(`Traffic Type: ${mapTrafficType(operation.tip_saobracaja)}`, rightColumnX, baseY + 6);
    doc.text(`Specific Density: ${(operation.specific_density || 0).toLocaleString('hr-HR', { minimumFractionDigits: 3 })}`, rightColumnX, baseY + 12);
    // EUFOR addition: Fiscal receipt number from EXD
    doc.text(`Fiscal receipt number: ${operation.exd_number || 'N/A'}`, rightColumnX, baseY + 18);

    // Separator line below info blocks
    const lineY = baseY + 30; // increased to account for the extra right-column line
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(14, lineY, pageWidth - 14, lineY);

    // Table header
    doc.setFontSize(11);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('SERVICE DETAILS:', 14, lineY + 10);

    // EUFOR pricing: compute total as liters × provided price (display as Price/L)
    const pricePerLiterDisplay = (operation.price_per_kg || 0);
    const liters = operation.quantity_liters || 0;
    const euforNetAmount = liters * pricePerLiterDisplay;

    const tableHeaders = [
      'Service Description',
      'Fuel Type',
      'Quantity (L)',
      'Quantity (kg)',
      'Price/L',
      'Amount'
    ];

    const tableData = [
      [
        `Gorivo JET A-1 (${operation.aircraft_registration})`,
        `${operation.tank?.fuel_type || 'JET A-1'}`,
        `${(liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })}`,
        `${(operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })}`,
        `${pricePerLiterDisplay.toLocaleString('hr-HR', { minimumFractionDigits: 5 })} ${operation.currency || 'BAM'}`,
        `${(Number(euforNetAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`
      ]
    ];

    let finalY = lineY + 20;
    autoTable(doc, {
      startY: lineY + 20,
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 35 }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        finalY = data.cursor?.y || finalY + 30;
      }
    });

    // Summary box
    finalY += 10;
    const summaryBoxY = finalY;
    doc.setFillColor(248, 248, 248);
    doc.rect(pageWidth / 2, summaryBoxY, pageWidth / 2 - 14, 56, 'F');
    doc.setDrawColor(200, 200, 220);
    doc.line(pageWidth / 2, summaryBoxY, pageWidth - 14, summaryBoxY);

    // MRN breakdown (left column)
    let mrnDataToDisplay: { mrn: string; quantity: number }[] = [];
    try {
      if (operation.parsedMrnBreakdown && Array.isArray(operation.parsedMrnBreakdown)) {
        mrnDataToDisplay = operation.parsedMrnBreakdown;
      } else if (typeof operation.mrnBreakdown === 'string') {
        const parsedData = JSON.parse(operation.mrnBreakdown);
        if (Array.isArray(parsedData)) {
          mrnDataToDisplay = parsedData;
        }
      }
    } catch (e) {
      console.error('Error parsing MRN data:', e);
    }

    if (mrnDataToDisplay.length > 0) {
      doc.setFontSize(8);
      doc.setFont(FONT_NAME, 'bold');
      doc.text('MRN Clearance:', 14, summaryBoxY + 10);
      doc.setFont(FONT_NAME, 'normal');
      let mrnY = summaryBoxY + 18;
      mrnDataToDisplay.forEach((item, index) => {
        const currentItem = item as { mrn?: string; quantity_kg?: number; quantity?: number; [key: string]: any };
        let mrnNumber: string;
        let quantity: number | string;
        if (currentItem.mrn && typeof currentItem.quantity_kg === 'number') {
          mrnNumber = currentItem.mrn;
          quantity = currentItem.quantity_kg;
        } else if (currentItem.mrn && typeof currentItem.quantity === 'number') {
          mrnNumber = currentItem.mrn;
          quantity = currentItem.quantity;
        } else if (Object.keys(currentItem).length === 1) {
          const key = Object.keys(currentItem)[0];
          mrnNumber = key;
          quantity = currentItem[key] as number | string;
        } else {
          mrnNumber = 'N/A';
          quantity = 0;
        }
        const quantityFormatted = typeof quantity === 'number' ? Math.round(quantity).toString() : quantity;
        doc.text(`MRN: ${mrnNumber} - ${quantityFormatted} kg`, 14, mrnY);
        mrnY += 6;
        if (index >= 3) {
          doc.text(`+ ${mrnDataToDisplay.length - 4} more...`, 14, mrnY);
          return;
        }
      });
    }

    // Right summary (amounts)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    let summaryY = summaryBoxY + 10;

    // Net Amount (no discount paths for EUFOR)
    doc.text('Net Amount:', pageWidth / 2 + 5, summaryY);
    doc.text(`${(Number(euforNetAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, pageWidth - 14, summaryY, { align: 'right' });
    summaryY += 7;

    // Fixed sub-items
    doc.text('Excise duty (akciza):', pageWidth / 2 + 5, summaryY);
    doc.text(`0,00 ${operation.currency || 'BAM'}`, pageWidth - 14, summaryY, { align: 'right' });
    summaryY += 7;
    doc.text('VAT (PDV):', pageWidth / 2 + 5, summaryY);
    doc.text(`0,00 ${operation.currency || 'BAM'}`, pageWidth - 14, summaryY, { align: 'right' });

    // Add spacing before total to better separate from VAT lines
    summaryY += 9;
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('TOTAL AMOUNT DUE:', pageWidth / 2 + 5, summaryY);
    doc.text(`${(Number(euforNetAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, pageWidth - 14, summaryY, { align: 'right' });
    doc.setFont(FONT_NAME, 'normal');

    // Always place stamp; EUFOR invoices are always in BAM (no conversion section)
    try {
      const pecatImageUrl = `${window.location.origin}/pecat.png`;
      const pecatImageBase64 = await loadImageAsBase64(pecatImageUrl);
      const pecatWidth = 75;
      const pecatHeight = 40;
      const pecatX = pageWidth - pecatWidth - 14;
      const pecatY = summaryBoxY + 45;
      doc.addImage(pecatImageBase64, 'PNG', pecatX, pecatY, pecatWidth, pecatHeight);
    } catch (error) {
      console.error('Error adding pecat image:', error);
    }

    // Payment info
    const paymentInfoY = summaryBoxY + 55;
    doc.setFontSize(6);
    doc.setFont(FONT_NAME, 'normal');
    doc.text('Payment Method: Bank Transfer', 14, paymentInfoY);
    doc.text('IBAN: BA393389104805286885', 14, paymentInfoY + 4);
    doc.text('SWIFT: UNCRBA22', 14, paymentInfoY + 8);
    doc.text('Payment Due: 15 days from invoice issue date', 14, paymentInfoY + 12);

    // EUFOR VAT note (SOFA)
    let yPosForVatNote = paymentInfoY + 21; // approx below previous line
    doc.setFontSize(6);
    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('VAT is not applied in accordance with Agreement', 14, yPosForVatNote);
    doc.text('signed between NATO/EUFOR forces and', 14, yPosForVatNote + 4);
    doc.text('Republic of Bosnia and Herzegovina (SOFA', 14, yPosForVatNote + 8);
    doc.text('Appendix B Article 9 Annex A-1).', 14, yPosForVatNote + 12);
    let yPosAfterVatNote = yPosForVatNote + 16;
    doc.setTextColor(0, 0, 0);

    // Bank accounts (two columns), same as original
    const bankInfoY = yPosAfterVatNote + 5;
    const bankFontSize = 5;
    doc.setFontSize(bankFontSize);
    doc.setFont(FONT_NAME, 'normal');
    const bankColWidth = (pageWidth - 28) * 0.45;
    const bankColGap = (pageWidth - 28) * 0.1;
    const centerX = pageWidth / 2;
    const col1X = centerX - bankColWidth - bankColGap / 2;
    const col2X = centerX + bankColGap / 2;
    let bankY = bankInfoY + 9;
    const lineSpacing = bankFontSize * 0.7;

    // First column
    doc.text('Unicredit banka DD Mostar', col1X, bankY);
    doc.text('3385502203296597', col1X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('Raiffeisen Bank DD Sarajevo', col1X, bankY);
    doc.text('1610000055460052', col1X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('NLB Razvojna banka AD Banja Luka', col1X, bankY);
    doc.text('5620068100579520', col1X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('Bosna Bank International DD Sarajevo', col1X, bankY);
    doc.text('1410010012321008', col1X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('Intesa Sanpaolo banka Sarajevo', col1X, bankY);
    doc.text('1542602004690547', col1X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('Privredna banka Sarajevo dd Sarajevo', col1X, bankY);
    doc.text('1011040053464252', col1X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('ZiraatBank Bank BH dd Sarajevo', col1X, bankY);
    doc.text('1861440310884661', col1X + bankColWidth - 5, bankY, { align: 'right' });

    // Vertical separator
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.3);
    doc.line(centerX, bankInfoY + 7, centerX, bankY + lineSpacing * 2);

    // Second column
    bankY = bankInfoY + 9;
    doc.text('NLB Tuzlanska banka DD Tuzla', col2X, bankY);
    doc.text('1322602004200445', col2X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('Sparkasse banka DD Sarajevo', col2X, bankY);
    doc.text('1990490086998668', col2X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('ASA Banka DD Sarajevo', col2X, bankY);
    doc.text('1346651006886807', col2X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('Union banka DD Sarajevo', col2X, bankY);
    doc.text('1020320000019213', col2X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('Nova banka AD Banja Luka', col2X, bankY);
    doc.text('5556000036056073', col2X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('Addiko Bank d.d. Sarajevo', col2X, bankY);
    doc.text('3060003143014340', col2X + bankColWidth - 5, bankY, { align: 'right' });
    bankY += lineSpacing;
    doc.text('IBAN: BA393389104805286885', col2X, bankY);
    doc.text('SWIFT: UNCRBA22', col2X + bankColWidth - 5, bankY, { align: 'right' });

    const totalHeight = bankY + 10;
    if (doc.internal.pageSize.height < totalHeight) {
      (doc.internal.pageSize as any).height = totalHeight;
    }

    const pdfBytes = doc.output('arraybuffer');
    try {
      await mergeAndDownloadInvoice(new Uint8Array(pdfBytes), operation, `EUFOR-Invoice-${invoiceNumber}.pdf`);
    } catch (mergeError) {
      console.warn('Merging failed, downloading EUFOR invoice only:', mergeError);
      doc.save(`EUFOR-Invoice-${invoiceNumber}.pdf`);
    }
  } catch (error) {
    console.error('Error generating EUFOR PDF:', error);
    throw error;
  }
};


