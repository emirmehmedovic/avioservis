import dayjs from 'dayjs';
import jsPDF from 'jspdf';
// Import jsPDF-AutoTable
import autoTable from 'jspdf-autotable';
import { FuelingOperation } from '../types';
import { formatDate } from './helpers';
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';

// VAT rate for domestic traffic (17%)
const VAT_RATE = 0.17;
// Excise tax (akcize) per liter in KM
const EXCISE_TAX_PER_LITER = 0.30;
// Font name to use throughout the document
const FONT_NAME = 'NotoSans';

/**
 * Register custom font for proper special character support (č, ć, ž, đ, š)
 */
const registerFont = (doc: jsPDF): void => {
  const stripPrefix = (base64String: string): string => {
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
    doc.setFont('helvetica', 'normal');
  }

  if (notoSansBoldBase64) {
    const cleanedBold = stripPrefix(notoSansBoldBase64);
    doc.addFileToVFS('NotoSans-Bold.ttf', cleanedBold);
    doc.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold');
  } else {
    console.error('Noto Sans Bold font data not loaded.');
    doc.setFont('helvetica', 'bold');
  }
  
  doc.setLanguage('hr');
  doc.setFontSize(10);
};

// Funkcija za učitavanje slike i konverziju u Base64
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
 * Generate a domestic PDF invoice for a fueling operation with VAT calculation
 */
export const generateDomesticPDFInvoice = async (operation: FuelingOperation): Promise<void> => {
  try {
    if (!operation) {
      throw new Error('No operation to generate invoice for');
    }

    const doc = new jsPDF({
      putOnlyUsedFonts: true,
      compress: true,
      format: 'a4'
    });
    
    registerFont(doc);
    doc.setFont(FONT_NAME, 'normal');
    
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const headerHeight = 40;
    try {
      const headerImageUrl = `${window.location.origin}/hifa-header.png`;
      const headerImageBase64 = await loadImageAsBase64(headerImageUrl);
      doc.addImage(headerImageBase64, 'PNG', 0, 0, pageWidth, headerHeight);
    } catch (error) {
      console.error('Error adding header image, using fallback:', error);
      doc.setFillColor(240, 240, 250);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFontSize(20);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('HIFA-PETROL d.o.o. Sarajevo', 14, 20);
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('Međunarodni aerodrom Tuzla', 14, 28);
    }
    
    const invoiceNumber = `DOM-INV-${operation.id}-${new Date().getFullYear()}`;
    
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 45, pageWidth - 14, 45);
    
    doc.setFontSize(14);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('FAKTURA ZA GORIVO - UNUTARNJI SAOBRAĆAJ', pageWidth / 2, 55, { align: 'center' });
    doc.setFont(FONT_NAME, 'normal');
    
    const rightColumnX = pageWidth / 2;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont(FONT_NAME, 'bold');
    doc.text(`Broj fakture: ${invoiceNumber}`, 14, 77);
    doc.setFont(FONT_NAME, 'normal');
    doc.text(`Datum izdavanja: ${formatDate(new Date().toISOString())}`, 14, 83);
    doc.text(`Datum usluge: ${formatDate(operation.dateTime)}`, 14, 89);
    doc.text(`Paritet/Parity: CPT Aerodrom Tuzla`, 14, 95);
    doc.setFont(FONT_NAME, 'bold');
    doc.text(`Dostavnica/Voucher: ${operation.delivery_note_number || 'N/A'}`, 14, 101);
    doc.setFont(FONT_NAME, 'normal');
    doc.text(`Registracija aviona: ${operation.aircraft_registration || 'N/A'}`, 14, 107);
    doc.text(`Destinacija: ${operation.destination}`, 14, 113);
    doc.text(`Broj leta: ${operation.flight_number || 'N/A'}`, 14, 119);
    
    doc.setFontSize(11);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('KUPAC:', rightColumnX, 70);
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`${operation.airline?.name || 'N/A'}`, rightColumnX, 77);
    doc.text(`${operation.airline?.address || 'N/A'}`, rightColumnX, 83);
    doc.text(`ID/PDV: ${operation.airline?.taxId || 'N/A'}`, rightColumnX, 89);
    doc.text(`Tel: ${operation.airline?.contact_details || 'N/A'}`, rightColumnX, 95);

    const baseAmount = (operation.quantity_kg || 0) * (operation.price_per_kg || 0);
    const discountPercentage = operation.discount_percentage || 0;
    const discountAmount = baseAmount * (discountPercentage / 100);
    const netAmount = operation.total_amount || 0;
    const netAmountNum = Number(netAmount || 0);
    const vatAmount = Number((netAmountNum * VAT_RATE).toFixed(5));
    const exciseTaxAmount = Number(((operation.quantity_liters || 0) * EXCISE_TAX_PER_LITER).toFixed(5));
    const subtotalWithoutExcise = Number((netAmountNum + vatAmount).toFixed(5));
    const grossAmount = Number((netAmountNum + vatAmount + exciseTaxAmount).toFixed(5));
    
    doc.setFontSize(11);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('DETALJI TRANSAKCIJE:', 14, 130);
    doc.setFont(FONT_NAME, 'normal');
    
    const tableColumn = ['Opis', 'Količina (L)', 'Količina (kg)', 'Cijena po kg', 'Rabat (%)', 'Neto iznos', 'PDV 17%', 'Akcize (0.30 KM/L)', 'Ukupno sa PDV'];
    const tableRows = [
      [
        `Gorivo JET A-1 (${operation.aircraft_registration || 'N/A'})`,
        (operation.quantity_liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 }),
        (operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 }),
        (operation.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 5 }),
        discountPercentage > 0 ? `${discountPercentage}%` : '0%',
        netAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5 }),
        vatAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5 }),
        exciseTaxAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5 }),
        grossAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5 })
      ]
    ];
    
    if (discountPercentage > 0) {
      doc.setFontSize(8);
      doc.text(`Osnovna cijena prije rabata: ${baseAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5 })} ${operation.currency || 'BAM'}`, 14, 135);
    }
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows as any[][],
      startY: 140,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, font: FONT_NAME },
      headStyles: { fillColor: [240, 240, 250], textColor: [0, 51, 102], fontStyle: 'bold' },
      margin: { left: 14, right: 14 }
    });
    
    let finalY = (doc as any).lastAutoTable?.finalY + 10 || 170;
    
    const summaryBoxY = finalY;
    
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
          let quantity_kg = item.quantity_kg; // Prefer item.quantity_kg
          const quantityLiters = item.quantity;
          const density = item.density_at_intake || operation.specific_density || 0.8;

          // Handle cases where MRN might be the key of the object
          if (typeof item === 'object' && !item.mrn && Object.keys(item).length === 1) {
            mrn = Object.keys(item)[0];
            const val = item[mrn];
            // Assuming old format might be liters, try to convert if no kg
            if (typeof val === 'number' && quantity_kg === undefined) {
              quantity_kg = Number(val) * Number(density);
            }
          }

          // If quantity_kg is not present, but quantity (liters) and density are, calculate kg
          if (quantity_kg === undefined && quantityLiters !== undefined && density > 0) {
            quantity_kg = Number(quantityLiters) * Number(density);
          }
          
          return {
            mrn,
            quantityKg: quantity_kg !== undefined ? Number(quantity_kg) : 0,
          };
        }).filter(item => item.quantityKg > 0); // Filter out items with no valid kg quantity
      }
    } catch (e) {
      console.error('Error processing MRN data for domestic invoice (kg):', e);
    }

    if (processedMrnData.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.setFont(FONT_NAME, 'bold');
      doc.text('Razduženje po MRN:', 14, summaryBoxY + 5);
      doc.setFont(FONT_NAME, 'normal');
      
      let mrnY = summaryBoxY + 11;
      const maxMrnsToShow = 4;
      processedMrnData.slice(0, maxMrnsToShow).forEach((item, index) => {
        const quantityFormatted = item.quantityKg.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        doc.text(`MRN: ${item.mrn} - ${quantityFormatted} kg`, 14, mrnY);
        mrnY += 5;
      });

      if (processedMrnData.length > maxMrnsToShow) {
        doc.text(`+ ${processedMrnData.length - maxMrnsToShow} više...`, 14, mrnY);
      }
    }
    
    doc.setFillColor(245, 245, 255);
    doc.rect(pageWidth / 2, summaryBoxY, pageWidth / 2 - 14, 50, 'F');
    doc.setDrawColor(200, 200, 220);
    doc.line(pageWidth / 2, summaryBoxY, pageWidth - 14, summaryBoxY);
    
    const labelX = pageWidth / 2 + 5;
    const valueX = pageWidth - 18;
    let summaryLineY = summaryBoxY + 7;
    const lineHeight = 6;
    
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont(FONT_NAME, 'normal');
    
    doc.text('Ukupan neto iznos:', labelX, summaryLineY);
    doc.text(`${netAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 })} ${operation.currency || 'BAM'}`, valueX, summaryLineY, { align: 'right' });
    summaryLineY += lineHeight;
    
    doc.text('PDV (17%):', labelX, summaryLineY);
    doc.text(`${vatAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 })} ${operation.currency || 'BAM'}`, valueX, summaryLineY, { align: 'right' });
    summaryLineY += lineHeight;

    doc.text('Akcize (0.30 KM/L):', labelX, summaryLineY);
    doc.text(`${exciseTaxAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 })} ${operation.currency || 'BAM'}`, valueX, summaryLineY, { align: 'right' });
    summaryLineY += lineHeight;
    
    doc.text('Međuzbir (bez akcize):', labelX, summaryLineY);
    doc.text(`${subtotalWithoutExcise.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 })} ${operation.currency || 'BAM'}`, valueX, summaryLineY, { align: 'right' });
    summaryLineY += 8;
    
    doc.setFontSize(11);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('Ukupno za plaćanje:', labelX, summaryLineY);
    doc.text(`${grossAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 })} ${operation.currency || 'BAM'}`, valueX, summaryLineY, { align: 'right' });
    doc.setFont(FONT_NAME, 'normal');
    
    // START: Footer section with bank accounts (Optimized)
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
    doc.setTextColor(0, 51, 102);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('PODACI ZA PLAĆANJE:', 14, footerStartY);
    doc.setFont(FONT_NAME, 'normal');
    
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
    doc.text(`Faktura generisana: ${new Date().toLocaleString('hr-HR')}`, pageWidth / 2, finalFooterY + 5, { align: 'center' });
    // END: Footer section

    doc.save(`Faktura-Domaca-${invoiceNumber}.pdf`);
    
  } catch (error) {
    console.error('Error generating domestic PDF:', error);
    throw error;
  }
};

/**
 * Generate a consolidated domestic PDF invoice for multiple fueling operations with VAT calculation
 */
export const generateConsolidatedDomesticPDFInvoice = async (operations: FuelingOperation[], filterDescription: string): Promise<void> => {
  try {
    if (!operations || operations.length === 0) {
      throw new Error('No operations to generate invoice for');
    }

    const doc = new jsPDF({
      putOnlyUsedFonts: true,
      compress: true,
      format: 'a4'
    });
    
    registerFont(doc);
    doc.setFont(FONT_NAME, 'normal');
    
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const headerHeight = 40;
    try {
      const headerImageUrl = `${window.location.origin}/hifa-header.png`;
      const headerImageBase64 = await loadImageAsBase64(headerImageUrl);
      doc.addImage(headerImageBase64, 'PNG', 0, 0, pageWidth, headerHeight);
    } catch (error) {
      console.error('Error adding header image, using fallback:', error);
      doc.setFillColor(240, 240, 250);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setFontSize(20);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('HIFA-PETROL d.o.o. Sarajevo', 14, 20);
    }
    
    const invoiceNumber = `DOM-CONS-INV-${new Date().getTime().toString().slice(-6)}-${new Date().getFullYear()}`;
    
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 45, pageWidth - 14, 45);
    
    doc.setFontSize(14);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('ZBIRNA FAKTURA ZA GORIVO - UNUTARNJI SAOBRAĆAJ', pageWidth / 2, 55, { align: 'center' });
    doc.setFont(FONT_NAME, 'normal');

    const rightColumnX = pageWidth / 2;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont(FONT_NAME, 'bold');
    doc.text(`Broj fakture: ${invoiceNumber}`, 14, 70);
    doc.setFont(FONT_NAME, 'normal');
    doc.text(`Datum izdavanja: ${formatDate(new Date().toISOString())}`, 14, 76);
    
    const periodY = 82;
    const periodText = `Period: ${filterDescription}`;
    const periodMaxWidth = pageWidth / 2 - 20;
    const periodLines = doc.splitTextToSize(periodText, periodMaxWidth);
    doc.text(periodLines, 14, periodY);
    const nextYPos = periodY + (periodLines.length * 5);
    doc.text(`Paritet/Parity: CPT Aerodrom Tuzla`, 14, nextYPos);

    const airlineCounts: Record<string, { count: number, airline: FuelingOperation['airline'] }> = {};
    operations.forEach(operation => {
      if (operation.airline && operation.airline.name) {
        const airlineName = operation.airline.name;
        if (!airlineCounts[airlineName]) {
          airlineCounts[airlineName] = { count: 0, airline: operation.airline };
        }
        airlineCounts[airlineName].count++;
      }
    });
    let mostCommonAirline: FuelingOperation['airline'] | null = null;
    let airlineMaxCount = 0;
    Object.keys(airlineCounts).forEach(airlineName => {
      if (airlineCounts[airlineName].count > airlineMaxCount) {
        airlineMaxCount = airlineCounts[airlineName].count;
        mostCommonAirline = airlineCounts[airlineName].airline;
      }
    });

    doc.setFontSize(11);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('KUPAC:', rightColumnX, 70);
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    if (mostCommonAirline) {
      const airline = mostCommonAirline as any;
      doc.text(`${airline.name || 'N/A'}`, rightColumnX, 76);
      doc.text(`ID/PDV broj: ${airline.taxId || 'N/A'}`, rightColumnX, 82);
      doc.text(`Adresa: ${airline.address || 'N/A'}`, rightColumnX, 88);
      doc.text(`Kontakt: ${airline.contact_details || 'N/A'}`, rightColumnX, 94);
    } else {
      doc.text('Nije dostupno', rightColumnX, 76);
    }

    // Ensure all calculations are done with numbers, convert to string for display only
    const totalLiters = operations.reduce((sum, op) => sum + parseFloat(String(op.quantity_liters || '0')), 0);
    const totalKg = operations.reduce((sum, op) => sum + parseFloat(String(op.quantity_kg || '0')), 0);

    const totalBaseAmountNum = operations.reduce((sum, op) => sum + (Number(op.quantity_kg || 0) * Number(op.price_per_kg || 0)), 0);
    const totalDiscountAmountNum = operations.reduce((sum, op) => {
      const baseOpAmount = Number(op.quantity_kg || 0) * Number(op.price_per_kg || 0);
      const discountOpPercentage = Number(op.discount_percentage || 0) / 100;
      return sum + (baseOpAmount * discountOpPercentage);
    }, 0);
    const finalTotalNetAmountNum = operations.reduce((sum, op) => {
      const opNetAmount = Number(op.total_amount || 0);
      if (opNetAmount > 0) return sum + opNetAmount;
      // Fallback calculation if total_amount is not set
      const baseOpAmount = Number(op.quantity_kg || 0) * Number(op.price_per_kg || 0);
      const discountOpPercentage = Number(op.discount_percentage || 0) / 100;
      return sum + (baseOpAmount * (1 - discountOpPercentage));
    }, 0);

    const totalVatAmountNum = finalTotalNetAmountNum * VAT_RATE;
    const totalExciseTaxAmountNum = totalLiters * EXCISE_TAX_PER_LITER;
    const totalSubtotalWithoutExciseNum = finalTotalNetAmountNum + totalVatAmountNum;
    const totalGrossAmountNum = finalTotalNetAmountNum + totalVatAmountNum + totalExciseTaxAmountNum;

    let mostCommonCurrency = 'BAM';
    const currencyCounts: Record<string, number> = {};
    operations.forEach(operation => {
      const currency = operation.currency || 'BAM';
      currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
    });
    let maxCount = 0;
    for (const [currency, count] of Object.entries(currencyCounts)) {
      if (count > maxCount) {
        mostCommonCurrency = currency;
        maxCount = count;
      }
    }

    doc.setFontSize(11);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('ZBIRNI PREGLED:', 14, 110);
    
    const summaryColumn = ['Opis', 'Vrijednost', 'Jedinica'];
    const summaryRows = [
      ['Ukupna količina goriva', totalLiters.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'litara'],
      ['Ukupna količina goriva', totalKg.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'kg'],
      ['Ukupna osnovna cijena', totalBaseAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }), mostCommonCurrency],
      ['Ukupan rabat', totalDiscountAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }), mostCommonCurrency],
      ['Ukupan neto iznos (nakon rabata)', finalTotalNetAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }), mostCommonCurrency],
      ['Ukupan PDV (17%)', totalVatAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }), mostCommonCurrency],
      ['Ukupan međuzbir (neto + PDV)', totalSubtotalWithoutExciseNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }), mostCommonCurrency],
      ['Ukupan iznos akcize', totalExciseTaxAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }), mostCommonCurrency],
      ['Ukupan iznos za plaćanje (sa PDV)', totalGrossAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }), mostCommonCurrency]
    ];
    
    autoTable(doc, {
      head: [summaryColumn],
      body: summaryRows,
      startY: 115,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, font: FONT_NAME },
      headStyles: { fillColor: [240, 240, 250], textColor: [0, 51, 102], fontStyle: 'bold' },
    });
    
    const summaryFinalY = (doc as any).lastAutoTable?.finalY + 10;
    
    doc.setFontSize(11);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('PREGLED OPERACIJA:', 14, summaryFinalY);
    
    const tableColumn = ['Datum', 'Registracija', 'Destinacija', 'MRN', 'Dostavnica', 'Količina (L)', 'Količina (kg)', 'Osnovna cijena', 'Rabat', 'Neto', 'PDV 17%', 'Akcize', 'Bruto', 'Valuta'];
    const operationsWithCalculations = operations.map(op => {
      const quantityKg = parseFloat(String(op.quantity_kg || '0'));
      const pricePerKg = parseFloat(String(op.price_per_kg || '0'));
      const discountPercentage = parseFloat(String(op.discount_percentage || '0'));
      const quantityLiters = parseFloat(String(op.quantity_liters || '0'));

      const baseAmount = quantityKg * pricePerKg;
      const discountAmount = baseAmount * (discountPercentage / 100);
      const netAmount = parseFloat(String(op.total_amount || '0')) || (baseAmount - discountAmount);
      const vatAmount = netAmount * VAT_RATE;
      const exciseTaxAmount = quantityLiters * EXCISE_TAX_PER_LITER;
      const grossAmount = netAmount + vatAmount + exciseTaxAmount;

      return [
        formatDate(op.dateTime),
        op.aircraft_registration || 'N/A',
        op.destination,
        // Display MRN data if available, otherwise show 'N/A'
        op.parsedMrnBreakdown && op.parsedMrnBreakdown.length > 0
            ? (op.parsedMrnBreakdown.length > 1
                ? `${op.parsedMrnBreakdown[0].mrn}: ${Number(op.parsedMrnBreakdown[0].quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} kg, ... (+${op.parsedMrnBreakdown.length - 1})`
                : `${op.parsedMrnBreakdown[0].mrn}: ${Number(op.parsedMrnBreakdown[0].quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} kg`)
            : 'N/A',
        op.delivery_note_number || 'N/A',
        (op.quantity_liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 }),
        (op.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 }),
        baseAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5 }),
        discountAmount > 0 ? discountAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }) : '0,00000',
        netAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
        vatAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
        exciseTaxAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
        grossAmount.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
        op.currency || 'BAM'
      ];
    });

    operationsWithCalculations.push([
      'UKUPNO', '', '', '', '',
      totalLiters.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalKg.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalBaseAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
      totalDiscountAmountNum > 0 ? totalDiscountAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }) : '0,00000',
      finalTotalNetAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
      totalVatAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
      totalExciseTaxAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
      totalGrossAmountNum.toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
      mostCommonCurrency
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: operationsWithCalculations as any[][],
      startY: summaryFinalY + 7, // Adjusted startY if needed
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1, font: FONT_NAME, valign: 'middle' },
      headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [220, 220, 220], fontStyle: 'bold', textColor: [0,0,0] },
      margin: { bottom: 65 }, // Ensure enough space for footer
      willDrawCell: (data) => {
        if (data.section === 'head' && data.pageNumber > 1) {
          return false; // Do not draw header on subsequent pages
        }
      },
      didDrawPage: (data) => {
        // Add page number and invoice number to header on subsequent pages
        if (data.pageNumber > 1) {
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(`Zbirna faktura br: ${invoiceNumber} - Strana ${data.pageNumber}`, pageWidth / 2, 10, { align: 'center' });
        }
        // Re-draw main header elements if it's not the first page's initial header draw
        // This ensures header elements like logo and company info appear on all pages if needed
        // For this consolidated invoice, the main header is drawn once initially.
        // The page number logic above is for subsequent pages.
      }
    });
    
    const drawConsolidatedFooter = () => {
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
        doc.text('PODACI ZA PLAĆANJE:', 14, footerStartY);
        doc.setFont(FONT_NAME, 'normal');
        
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
        doc.text(`Faktura generisana: ${new Date().toLocaleString('hr-HR')}`, pageWidth / 2, finalFooterY + 5, { align: 'center' });
    }
    
    // Nacrtaj footer nakon što je cijela tabela iscrtana, što garantuje da će biti na zadnjoj stranici.
    drawConsolidatedFooter();

    doc.save(`Zbirna-Faktura-Domaca-${invoiceNumber}.pdf`);
    
  } catch (error) {
    console.error('Error generating consolidated domestic PDF:', error);
    throw error;
  }
};