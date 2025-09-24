import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

// Configure dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to format dates - IDENTICAL to frontend
const formatDate = (dateString: string | Date): string => {
  const date = dayjs(dateString).tz('Europe/Sarajevo');
  return date.format('DD.MM.YYYY HH:mm');
};

export interface FuelingOperationForPDF {
  id: number;
  dateTime: Date | string;
  aircraft_registration?: string;
  destination?: string;
  flight_number?: string;
  delivery_note_number?: string;
  tip_saobracaja?: string;
  specific_density?: number | any;
  quantity_kg?: number | any;
  quantity_liters?: number | any;
  price_per_kg?: number | any;
  total_amount?: number | any;
  discount_percentage?: number | any;
  currency?: string;
  usd_exchange_rate?: string | any;
  mrnBreakdown?: string;
  parsedMrnBreakdown?: { mrn: string, quantity: number }[] | null;
  airline?: {
    name?: string;
    iata_code?: string;
    address?: string;
    city?: string;
    country?: string;
    zip_code?: string;
    taxId?: string;
    contact_details?: string;
  };
  tank?: {
    tank_name?: string;
    fuel_type?: string;
  };
  documents?: any[];
}


/**
 * Load header image with grayscale filter - IDENTICAL to frontend
 */
const loadHeaderImageAsBase64 = async (): Promise<string> => {
  try {
    // Path to header image
    const imagePath = path.join(__dirname, '../../../frontend/public/hifa-header.png');
    
    // Load image using canvas
    const image = await loadImage(imagePath);
    
    // Create canvas with image dimensions
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw image first
    ctx.drawImage(image, 0, 0);
    
    // Apply grayscale filter manually - equivalent to frontend grayscale(100%)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale using luminance formula
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = gray;     // Red
      data[i + 1] = gray; // Green
      data[i + 2] = gray; // Blue
      // Alpha (data[i + 3]) remains unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Return base64 data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error loading header image:', error);
    throw error;
  }
};

/**
 * Configure PDF for special characters identical to frontend
 */
const configurePDFForSpecialChars = (doc: jsPDF): void => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
};

/**
 * Generate PDF invoice buffer for SFTP upload - IDENTICAL to frontend version
 * Now supports both export and domestic invoices based on tip_saobracaja
 */
export async function generatePDFInvoiceBuffer(operation: FuelingOperationForPDF): Promise<Buffer> {
  try {
    // Check if this is a domestic operation (Unutarnji saobraćaj)
    if (operation.tip_saobracaja === 'Unutarnji saobraćaj') {
      console.log(`🏠 Generating domestic invoice for operation ${operation.id}`);
      return await generateDomesticPDFInvoiceBuffer(operation);
    }
    
    console.log(`🌍 Generating export invoice for operation ${operation.id}`);
    // Create PDF document with identical settings to frontend
    const doc = new jsPDF({
      putOnlyUsedFonts: true,
      compress: true,
      format: 'a4'
    });

    // Configure PDF for special characters
    configurePDFForSpecialChars(doc);

    // Helper function to replace special characters - IDENTICAL to frontend
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

    // Override text function - IDENTICAL to frontend
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
    const topPadding = -3; // IDENTICAL to frontend
    const headerHeight = 40;

    // Header with image - IDENTICAL to frontend
    try {
      // Load header image with grayscale filter
      const headerImageBase64 = await loadHeaderImageAsBase64();
      
      // Add image across full page width - IDENTICAL to frontend
      doc.addImage(headerImageBase64, 'PNG', 0, topPadding, pageWidth, headerHeight);
    } catch (error) {
      console.error('Error adding header image:', error);
      
      // Fallback header - IDENTICAL to frontend
      doc.setFillColor(240, 240, 250);
      doc.rect(0, topPadding, pageWidth, 40, 'F');
      doc.setFontSize(20);
      doc.setTextColor(0, 51, 102);
      doc.text('HIFA-PETROL d.o.o. Sarajevo', 14, 20 + topPadding);
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('71320 Vogosca, Hotonj bb', 14, 28 + topPadding);
    }

    // Invoice number generation - IDENTICAL to frontend
    const deliveryVoucherNumber = operation.delivery_note_number || operation.id.toString();
    const invoiceNumber = `INV-${deliveryVoucherNumber}-${new Date().getFullYear()}`;

    // Line below header - IDENTICAL to frontend
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 45 + topPadding, pageWidth - 14, 45 + topPadding);

    // Title - IDENTICAL to frontend
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('INVOICE FOR FUEL SERVICES', pageWidth / 2, 55 + topPadding, { align: 'center' });

    // Customer info - IDENTICAL to frontend
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('BUYER:', 14, 70 + topPadding);

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // Left column - invoice info - IDENTICAL to frontend
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Invoice No.: ${invoiceNumber}`, 14, 77 + topPadding);
    doc.text(`Issue Date: ${formatDate(operation.dateTime instanceof Date ? operation.dateTime.toISOString() : operation.dateTime)}`, 14, 83 + topPadding);
    doc.text(`Service Date: ${formatDate(operation.dateTime instanceof Date ? operation.dateTime.toISOString() : operation.dateTime)}`, 14, 89 + topPadding);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // Right column - customer info - IDENTICAL to frontend
    const rightColumnX = pageWidth / 2;
    const rightColumnWidth = pageWidth / 2 - 14;
    doc.setTextColor(0, 0, 0);
    doc.text(`${operation.airline?.name || 'N/A'}`, rightColumnX, 77 + topPadding);

    // Address wrapping - IDENTICAL to frontend
    const addressText = operation.airline?.address || 'N/A';
    const addressLines = doc.splitTextToSize(addressText, rightColumnWidth);
    let currentY = 83 + topPadding;
    addressLines.forEach((line: string) => {
      doc.text(line, rightColumnX, currentY);
      currentY += 6;
    });

    // Contact info - IDENTICAL to frontend
    const contactY = currentY + 2;
    doc.text(`ID/VAT No.: ${operation.airline?.taxId || 'N/A'}`, rightColumnX, contactY);
    doc.text(`Contact: ${operation.airline?.contact_details || 'N/A'}`, rightColumnX, contactY + 6);

    // Flight details section - IDENTICAL to frontend
    const baseY = contactY + 12;

    // Left column - flight info
    doc.setTextColor(0, 0, 0);
    doc.text(`Aircraft Registration: ${operation.aircraft_registration || 'N/A'}`, 14, baseY);
    doc.text(`Destination: ${operation.destination}`, 14, baseY + 6);
    doc.text(`Flight Number: ${operation.flight_number || 'N/A'}`, 14, baseY + 12);
    doc.text('Parity - CPT Tuzla Airport', 14, baseY + 18);

    // Right column - delivery and traffic info
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Delivery Voucher: ${operation.delivery_note_number || 'N/A'}`, rightColumnX, baseY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // Traffic Type mapping - IDENTICAL to frontend
    const mapTrafficType = (type: string | null | undefined): string => {
      if (!type) return 'N/A';
      const mappings: Record<string, string> = {
        'Izvoz': 'Export',
      };
      return mappings[type] || type;
    };

    doc.text(`Traffic Type: ${mapTrafficType(operation.tip_saobracaja)}`, rightColumnX, baseY + 6);
    doc.text(`Specific Density: ${Number(operation.specific_density || 0).toLocaleString('hr-HR', { minimumFractionDigits: 3 })}`, rightColumnX, baseY + 12);

    // Line above table - IDENTICAL to frontend
    const lineY = baseY + 24;
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(14, lineY, pageWidth - 14, lineY);

    // Service details table - IDENTICAL to frontend
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('SERVICE DETAILS:', 14, lineY + 10);

    // Calculate amounts - IDENTICAL to frontend
    const baseAmount = Number(operation.quantity_kg || 0) * Number(operation.price_per_kg || 0);
    const discountAmount = baseAmount * (Number(operation.discount_percentage || 0) / 100);
    const netAmount = Number(operation.total_amount || 0);

    // Table data - IDENTICAL to frontend
    const tableHeaders = [
      'Service Description', 
      'Fuel Type', 
      'Quantity (L)', 
      'Quantity (kg)', 
      'Price/kg', 
      'Amount'
    ];

    const tableData = [
      [
        'Kerozin (JET A1) gorivo za mlazne motore',
        `${operation.tank?.fuel_type || 'JET A-1'}`,
        `${Number(operation.quantity_liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })}`,
        `${Number(operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })}`,
        `${Number(operation.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 5 })} ${operation.currency || 'BAM'}`,
        `${(Number(netAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`
      ]
    ];

    // AutoTable - IDENTICAL to frontend
    let finalY = lineY + 20;
    
    autoTable(doc, {
      startY: lineY + 20,
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0]
      },
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

    // Summary section - IDENTICAL to frontend
    finalY += 10;
    const summaryBoxY = finalY;
    doc.setFillColor(248, 248, 248);
    doc.rect(pageWidth / 2, summaryBoxY, pageWidth / 2 - 14, 50, 'F');

    doc.setDrawColor(200, 200, 220);
    doc.line(pageWidth / 2, summaryBoxY, pageWidth - 14, summaryBoxY);

    // MRN data display - IDENTICAL to frontend
    let mrnDataToDisplay: { mrn: string, quantity: number }[] = [];
    
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

    // Display MRN data - IDENTICAL to frontend
    if (mrnDataToDisplay.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('MRN Clearance:', 14, summaryBoxY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      let mrnY = summaryBoxY + 18;
      mrnDataToDisplay.forEach((item, index) => {
        const currentItem = item as { mrn?: string, quantity_kg?: number, quantity?: number, [key: string]: any };

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
        mrnY += 4;
        
        if (index >= 3) {
          doc.text(`+ ${mrnDataToDisplay.length - 4} more...`, 14, mrnY);
          return;
        }
      });
      
      // Customs declaration - IDENTICAL to frontend
      const customsY = mrnY + 4;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      const englishLine1 = 'Simplified customs declaration under authorization No.';
      const authNumber = '03/7-FOI-18-3-Up/I-55/25';
      const englishLine2 = ' dated 08 August 2025.';
      
      doc.text(englishLine1, 14, customsY);
      doc.setFont('helvetica', 'bold');
      doc.text(authNumber, 14, customsY + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(englishLine2, 14 + doc.getTextWidth(authNumber), customsY + 4);
      
      doc.setFontSize(6);
      const bosnianLine1 = 'Pojednostavljena carinska deklaracija po odobrenju broj:';
      const bosnianLine2 = ' od 08.08.2025. godine';
      
      doc.text(bosnianLine1, 14, customsY + 9);
      doc.setFont('helvetica', 'bold');
      doc.text(authNumber, 14, customsY + 13);
      doc.setFont('helvetica', 'normal');
      doc.text(bosnianLine2, 14 + doc.getTextWidth(authNumber), customsY + 13);
      
      const tariffY = customsY + 17 + (mrnDataToDisplay.length > 1 ? (mrnDataToDisplay.length - 1) * 3 : 0);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('Tarifni broj: 2710 19 21 00', 14, tariffY);
    }

    // Total amounts - IDENTICAL to frontend
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    let summaryY = summaryBoxY + 10;
    
    if (operation.discount_percentage && Number(operation.discount_percentage) > 0) {
      doc.text('Base Amount:', pageWidth / 2 + 5, summaryY);
      doc.text(`${(Number(baseAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, pageWidth - 14, summaryY, { align: 'right' });
      summaryY += 7;
      
      doc.text(`Discount (${operation.discount_percentage}%):`, pageWidth / 2 + 5, summaryY);
      doc.text(`-${(Number(discountAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, pageWidth - 14, summaryY, { align: 'right' });
      summaryY += 7;
    }
    
    doc.text('Net Amount:', pageWidth / 2 + 5, summaryY);
    doc.text(`${(Number(netAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, pageWidth - 14, summaryY, { align: 'right' });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT DUE:', pageWidth / 2 + 5, summaryBoxY + 28);
    doc.text(`${(Number(netAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, pageWidth - 14, summaryBoxY + 28, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // Currency conversion - IDENTICAL to frontend
    if (operation.currency === 'USD' || operation.currency === 'EUR') {
      let exchangeRate = 1;
      let exchangeRateSource = '';
      
      const exchangeRateStr = String(operation.usd_exchange_rate || '');
      const hasValidExchangeRate = exchangeRateStr && exchangeRateStr.trim() !== '' && !isNaN(parseFloat(exchangeRateStr));
      
      if (operation.currency === 'EUR') {
        exchangeRate = hasValidExchangeRate ? parseFloat(exchangeRateStr) : 1.95583;
        exchangeRateSource = hasValidExchangeRate ? 'system exchange rate' : 'fixed EUR rate';
      } else if (operation.currency === 'USD') {
        exchangeRate = hasValidExchangeRate ? parseFloat(exchangeRateStr) : 1.8;
        exchangeRateSource = hasValidExchangeRate ? 'system exchange rate' : 'estimated rate';
      }
      
      const bamEquivalent = netAmount * exchangeRate;
      
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`Equivalent in BAM: ${bamEquivalent.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} BAM`, 
        pageWidth / 2 + 5, summaryBoxY + 32);
      doc.text(`(Exchange rate: 1 ${operation.currency} = ${exchangeRate.toLocaleString('hr-HR', { minimumFractionDigits: 5 })} BAM)`, 
        pageWidth / 2 + 5, summaryBoxY + 37);
      
      // Add stamp/seal (pečat) below exchange rate information
      try {
        const pecatImagePath = path.join(__dirname, '../../../frontend/public/pecat.png');
        
        if (fs.existsSync(pecatImagePath)) {
          const pecatImageBuffer = fs.readFileSync(pecatImagePath);
          
          // Load image to get original dimensions
          const img = await loadImage(pecatImageBuffer);
          
          // Use higher resolution canvas for better quality (2x scale)
          const scale = 2;
          const canvas = createCanvas(img.width * scale, img.height * scale);
          const ctx = canvas.getContext('2d');
          
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          // TypeScript may not recognize imageSmoothingQuality, so we cast to any
          (ctx as any).imageSmoothingQuality = 'high';
          
          // Draw with higher resolution
          ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale);
          
          const pecatImageBase64 = canvas.toDataURL('image/png');
          
          // Position stamp below exchange rate text, aligned right
          const pecatWidth = 75; // Same as frontend: 75mm width
          const pecatHeight = 40; // Same as frontend: 40mm height
          const pecatX = pageWidth - pecatWidth - 14; // Aligned right
          const pecatY = summaryBoxY + 42; // Positioned below exchange rate text
          
          doc.addImage(pecatImageBase64, 'PNG', pecatX, pecatY, pecatWidth, pecatHeight);
        } else {
          console.warn('Pecat image not found at:', pecatImagePath);
        }
      } catch (error) {
        console.error('Error adding pecat image:', error);
      }
    } else {
      // Add stamp/seal (pečat) for non-USD/EUR currencies as well
      try {
        const pecatImagePath = path.join(__dirname, '../../../frontend/public/pecat.png');
        
        if (fs.existsSync(pecatImagePath)) {
          const pecatImageBuffer = fs.readFileSync(pecatImagePath);
          
          // Load image to get original dimensions
          const img = await loadImage(pecatImageBuffer);
          
          // Use higher resolution canvas for better quality (2x scale)
          const scale = 2;
          const canvas = createCanvas(img.width * scale, img.height * scale);
          const ctx = canvas.getContext('2d');
          
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          // TypeScript may not recognize imageSmoothingQuality, so we cast to any
          (ctx as any).imageSmoothingQuality = 'high';
          
          // Draw with higher resolution
          ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale);
          
          const pecatImageBase64 = canvas.toDataURL('image/png');
          
          // Position stamp below total amount, aligned right
          const pecatWidth = 75;
          const pecatHeight = 40;
          const pecatX = pageWidth - pecatWidth - 14;
          const pecatY = summaryBoxY + 42; // Same position as USD/EUR case
          
          doc.addImage(pecatImageBase64, 'PNG', pecatX, pecatY, pecatWidth, pecatHeight);
        } else {
          console.warn('Pecat image not found at:', pecatImagePath);
        }
      } catch (error) {
        console.error('Error adding pecat image:', error);
      }
    }

    // Payment info - IDENTICAL to frontend
    const paymentInfoY = summaryBoxY + 55;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Payment Method: Bank Transfer', 14, paymentInfoY);
    doc.text('IBAN: BA393389104805286885', 14, paymentInfoY + 4);
    doc.text('SWIFT: UNCRBA22', 14, paymentInfoY + 8);
    doc.text('Payment Due: 15 days from invoice issue date', 14, paymentInfoY + 12);

    // VAT Note - IDENTICAL to frontend
    let yPosForVatNote = paymentInfoY + 12 + 9;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('VAT is not included in accordance with Article 27,', 14, yPosForVatNote);
    doc.text('act 1, paragraph 1 of the Law of Value Added Taxation', 14, yPosForVatNote + 4);
    doc.text('and article 39, act 1 of the Value Added Tax application requirements', 14, yPosForVatNote + 8);
    let yPosAfterVatNote = yPosForVatNote + 12;
    doc.setTextColor(0, 0, 0);

    // Bank details - IDENTICAL to frontend
    const bankInfoY = summaryBoxY + 85;
    doc.setFontSize(9);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    const bankFontSize = 5;
    doc.setFontSize(bankFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    const bankColWidth = (pageWidth - 28) * 0.45;
    const bankColGap = (pageWidth - 28) * 0.1;
    
    const centerX = pageWidth / 2;
    const col1X = centerX - bankColWidth - bankColGap/2;
    const col2X = centerX + bankColGap/2;
    
    let bankY = bankInfoY + 9;
    const lineSpacing = bankFontSize * 0.7;
    
    // First column of banks - IDENTICAL to frontend
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
    
    // Vertical line - IDENTICAL to frontend
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.3);
    doc.line(centerX, bankInfoY + 7, centerX, bankY + lineSpacing * 2);
    
    // Second column of banks - IDENTICAL to frontend
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
    
    // Ensure PDF height - IDENTICAL to frontend
    const totalHeight = bankY + 10;
    if (doc.internal.pageSize.height < totalHeight) {
      doc.internal.pageSize.height = totalHeight;
    }

    // Generate PDF buffer - IDENTICAL to frontend output processing
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;

  } catch (error) {
    console.error('Error generating PDF invoice:', error);
    throw new Error(`PDF generation failed: ${error}`);
  }
}

/**
 * Generate PDF filename for invoice - IDENTICAL to frontend
 */
export function buildPDFInvoiceFileName(operation: FuelingOperationForPDF): string {
  const deliveryVoucherNumber = operation.delivery_note_number || operation.id.toString();
  const year = new Date().getFullYear();
  return `Invoice-INV-${deliveryVoucherNumber}-${year}.pdf`;
}

/**
 * Generate domestic PDF invoice buffer for email dispatch
 * Based on frontend domesticInvoice.ts logic
 */
export async function generateDomesticPDFInvoiceBuffer(operation: FuelingOperationForPDF): Promise<Buffer> {
  try {
    // Create PDF document with identical settings to frontend
    const doc = new jsPDF({
      putOnlyUsedFonts: true,
      compress: true,
      format: 'a4'
    });

    // Configure PDF for special characters
    configurePDFForSpecialChars(doc);

    // Helper function to replace special characters - IDENTICAL to frontend
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

    // Override text function - IDENTICAL to frontend
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
    
    const headerHeight = 40;
    const topPadding = -3; // IDENTICAL to export invoice
    
    // Header with image - IDENTICAL to export invoice
    try {
      // Load header image with grayscale filter - same as export invoice
      const headerImageBase64 = await loadHeaderImageAsBase64();
      
      // Add image across full page width - IDENTICAL to export invoice
      doc.addImage(headerImageBase64, 'PNG', 0, topPadding, pageWidth, headerHeight);
    } catch (error) {
      console.error('Error adding header image, using fallback:', error);
      
      // Fallback header - IDENTICAL to export invoice
      doc.setFillColor(240, 240, 250);
      doc.rect(0, topPadding, pageWidth, 40, 'F');
      doc.setFontSize(20);
      doc.setTextColor(0, 51, 102);
      doc.text('HIFA-PETROL d.o.o. Sarajevo', 14, 20 + topPadding);
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('Međunarodni aerodrom Tuzla', 14, 28 + topPadding);
    }
    
    // Use delivery note number instead of operation ID
    const deliveryVoucherNumber = operation.delivery_note_number || operation.id.toString();
    const invoiceNumber = `INV-${deliveryVoucherNumber}-${new Date().getFullYear()}`;
    
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 45 + topPadding, pageWidth - 14, 45 + topPadding);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('FAKTURA ZA GORIVO - UNUTARNJI SAOBRAĆAJ', pageWidth / 2, 55 + topPadding, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    
    const rightColumnX = pageWidth / 2;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Broj fakture: ${invoiceNumber}`, 14, 70 + topPadding);
    doc.setFont('helvetica', 'normal');
    doc.text(`Datum izdavanja: ${formatDate(operation.dateTime)}`, 14, 77 + topPadding);
    doc.text(`Datum usluge: ${formatDate(operation.dateTime)}`, 14, 83 + topPadding);
    doc.text(`Paritet/Parity: CPT Aerodrom Tuzla`, 14, 89 + topPadding);
    doc.setFont('helvetica', 'bold');
    doc.text(`Dostavnica/Voucher: ${operation.delivery_note_number || 'N/A'}`, 14, 95 + topPadding);
    doc.setFont('helvetica', 'normal');
    
    // Customer information
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('KUPAC:', rightColumnX, 70 + topPadding);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`${operation.airline?.name || 'N/A'}`, rightColumnX, 77 + topPadding);
    doc.text(`ID/PDV: ${operation.airline?.taxId || 'N/A'}`, rightColumnX, 83 + topPadding);
    doc.text(`Adresa: ${operation.airline?.address || 'N/A'}`, rightColumnX, 89 + topPadding);
    doc.text(`Tel: ${operation.airline?.contact_details || 'N/A'}`, rightColumnX, 95 + topPadding);

    // Operation details
    const baseY = 105 + topPadding;
    doc.text(`Registracija aviona: ${operation.aircraft_registration || 'N/A'}`, 14, baseY);
    doc.text(`Destinacija: ${operation.destination}`, 14, baseY + 6);
    doc.text(`Broj leta: ${operation.flight_number || 'N/A'}`, 14, baseY + 12);

    // Calculate amounts
    const baseAmount = (operation.quantity_kg || 0) * (operation.price_per_kg || 0);
    const discountPercentage = operation.discount_percentage || 0;
    const discountAmount = baseAmount * (discountPercentage / 100);
    const netAmount = operation.total_amount || 0;
    const netAmountNum = Number(netAmount || 0);
    const vatAmount = Number((netAmountNum * 0.17).toFixed(5)); // 17% VAT
    const grossAmount = Number((netAmountNum + vatAmount).toFixed(5));
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('DETALJI TRANSAKCIJE:', 14, 130 + topPadding);
    doc.setFont('helvetica', 'normal');
    
    const tableColumn = ['Opis', 'Količina (L)', 'Količina (kg)', 'Cijena po kg', 'Neto iznos', 'PDV 17%', 'Ukupno sa PDV'];
    const tableRows = [
      [
        `Gorivo JET A-1 (${operation.aircraft_registration || 'N/A'})`,
        (operation.quantity_liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 }),
        (operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 }),
        `${(operation.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 5 })} ${operation.currency || 'BAM'}`,
        (Number(netAmount) || 0).toFixed(2).replace('.', ','),
        (Number(vatAmount) || 0).toFixed(2).replace('.', ','),
        (Number(grossAmount) || 0).toFixed(2).replace('.', ',')
      ]
    ];
    
    if (discountPercentage > 0) {
      doc.setFontSize(8);
      doc.text(`Osnovna cijena prije rabata: ${(Number(baseAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, 14, 135 + topPadding);
    }
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows as any[][],
      startY: 140 + topPadding,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: 14, right: 14 }
    });
    
    let finalY = (doc as any).lastAutoTable?.finalY + 10 || 170;
    
    // MRN breakdown if available
    let processedMrnData: { mrn: string, quantityKg: number }[] = [];
    try {
      let rawMrnItems: any[] = [];
      if (operation.parsedMrnBreakdown && Array.isArray(operation.parsedMrnBreakdown)) {
        rawMrnItems = operation.parsedMrnBreakdown;
      } else if (typeof operation.mrnBreakdown === 'string') {
        rawMrnItems = JSON.parse(operation.mrnBreakdown);
      }

      if (Array.isArray(rawMrnItems)) {
        processedMrnData = rawMrnItems.map(item => {
          let mrn = item.mrn || 'N/A';
          let quantity_kg = item.quantity_kg;
          const quantityLiters = item.quantity;
          const density = item.density_at_intake || operation.specific_density || 0.8;

          if (typeof item === 'object' && !item.mrn && Object.keys(item).length === 1) {
            mrn = Object.keys(item)[0];
            const val = item[mrn];
            if (typeof val === 'number' && quantity_kg === undefined) {
              quantity_kg = Number(val) * Number(density);
            }
          }

          if (quantity_kg === undefined && quantityLiters !== undefined && density > 0) {
            quantity_kg = Number(quantityLiters) * Number(density);
          }
          
          return {
            mrn,
            quantityKg: quantity_kg !== undefined ? Number(quantity_kg) : 0,
          };
        }).filter(item => item.quantityKg > 0);
      }
    } catch (e) {
      console.error('Error processing MRN data for domestic invoice (kg):', e);
    }

    if (processedMrnData.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'bold');
      doc.text('Razduženje po MRN:', 14, finalY + 5);
      doc.setFont('helvetica', 'normal');
      
      let mrnY = finalY + 11;
      const maxMrnsToShow = 4;
      processedMrnData.slice(0, maxMrnsToShow).forEach((item, index) => {
        const quantityFormatted = Math.round(item.quantityKg).toString();
        doc.text(`MRN: ${item.mrn} - ${quantityFormatted} kg`, 14, mrnY);
        mrnY += 5;
      });

      if (processedMrnData.length > maxMrnsToShow) {
        doc.text(`+ ${processedMrnData.length - maxMrnsToShow} više...`, 14, mrnY);
      }
      
      // Add company stamp if available
      try {
        const pecatImagePath = path.join(process.cwd(), 'public', 'pecat.png');
        if (fs.existsSync(pecatImagePath)) {
          const pecatImage = await loadImage(pecatImagePath);
          const canvas = createCanvas(pecatImage.width, pecatImage.height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(pecatImage, 0, 0);
          
          const imageData = canvas.toDataURL('image/png');
          const pecatWidth = 75;
          const pecatHeight = 40;
          const pecatX = 14;
          const pecatY = mrnY + 5;
          
          doc.addImage(imageData, 'PNG', pecatX, pecatY, pecatWidth, pecatHeight);
        }
      } catch (error) {
        console.error('Error adding pecat image:', error);
      }
    }
    
    // Summary box
    doc.setFillColor(248, 248, 248);
    doc.rect(pageWidth / 2, finalY, pageWidth / 2 - 14, 50, 'F');
    doc.setDrawColor(200, 200, 220);
    doc.line(pageWidth / 2, finalY, pageWidth - 14, finalY);
    
    const labelX = pageWidth / 2 + 5;
    const valueX = pageWidth - 18;
    let summaryLineY = finalY + 7;
    const lineHeight = 6;
    
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Ukupan neto iznos:', labelX, summaryLineY);
    doc.text(`${(Number(netAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, valueX, summaryLineY, { align: 'right' });
    summaryLineY += lineHeight;
    
    doc.text('PDV (17%):', labelX, summaryLineY);
    doc.text(`${(Number(vatAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, valueX, summaryLineY, { align: 'right' });
    summaryLineY += 8;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Ukupno za plaćanje:', labelX, summaryLineY);
    doc.text(`${(Number(grossAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, valueX, summaryLineY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    
    // Footer section with bank accounts
    let footerStartY = 235;
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
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('PODACI ZA PLAĆANJE:', 14, footerStartY);
    doc.setFont('helvetica', 'normal');
    
    doc.setTextColor(0, 0, 0);
    doc.text('Poziv na broj: ' + invoiceNumber, pageWidth - 14, footerStartY, { align: 'right' });
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
    doc.text(`Faktura generisana: ${formatDate(operation.dateTime)}`, pageWidth / 2, finalFooterY + 5, { align: 'center' });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;

  } catch (error) {
    console.error('Error generating domestic PDF invoice:', error);
    throw new Error(`Domestic PDF generation failed: ${error}`);
  }
}

