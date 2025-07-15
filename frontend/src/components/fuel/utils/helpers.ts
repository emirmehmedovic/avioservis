import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FuelingOperation, AirlineFE } from '../types';
import { mergeAndDownloadInvoice } from './pdfMerger';

// Konfiguriraj dayjs za rad s vremenskim zonama
dayjs.extend(utc);
dayjs.extend(timezone);

// Postavi podrazumijevanu vremensku zonu za Bosnu i Hercegovinu
dayjs.tz.setDefault('Europe/Sarajevo');

// Constants
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const FONT_NAME = 'helvetica'; // Constant for the font used in PDF

/**
 * Format a date string to a localized format in Bosnian time (Europe/Sarajevo)
 * Konvertira UTC string u lokalno vrijeme i prikazuje ga u lokalnom formatu
 */
export const formatDate = (dateString: string): string => {
  return dayjs(dateString).tz('Europe/Sarajevo').format('DD.MM.YYYY. HH:mm');
};

/**
 * Priprema lokalno vrijeme za slanje na server (pretvara u UTC format)
 * @param localDateTimeString string u formatu 'YYYY-MM-DDTHH:mm'
 * @returns string UTC ISO string
 */
export const prepareLocalTimeForServer = (localDateTimeString: string): string => {
  return dayjs.tz(localDateTimeString, 'Europe/Sarajevo').utc().format();
};

/**
 * Priprema trenutno lokalno vrijeme za form input u formatu 'YYYY-MM-DDTHH:mm'
 * @returns string u formatu 'YYYY-MM-DDTHH:mm'
 */
export const getCurrentLocalDateTime = (): string => {
  return dayjs().tz('Europe/Sarajevo').format('YYYY-MM-DDTHH:mm');
};

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

/**
 * Generate a PDF invoice for a fueling operation
 */
// Funkcija za učitavanje slike i konverziju u Base64
const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Omogućava učitavanje slika s drugih domena
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

// Funkcija za učitavanje header slike s grayscale filterom
const loadHeaderImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Omogućava učitavanje slika s drugih domena
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Primeni crno-bijeli filter samo za header
      ctx.filter = 'grayscale(100%)';
      ctx.drawImage(img, 0, 0);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = url;
  });
};

// Extended interface to ensure TypeScript recognizes all properties we need
interface FuelingOperationWithExchangeRate extends Omit<FuelingOperation, 'mrnBreakdown' | 'parsedMrnBreakdown'> {
  usd_exchange_rate?: string;
  mrnBreakdown?: string | null;
  parsedMrnBreakdown?: { mrn: string, quantity: number }[] | null;
}

export const generatePDFInvoice = async (operation: FuelingOperationWithExchangeRate): Promise<void> => {
  try {
    // Create a new PDF document with Unicode support
    const doc = new jsPDF({
      putOnlyUsedFonts: true,
      compress: true,
      format: 'a4'
    });
    
    // Configure PDF for special characters
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
    
    const topPadding = -9; // Attempt to shift header up
    // Dodaj header sa slikom umjesto teksta
    const headerHeight = 40; // Visina headera u mm
    
    // Pokušaj učitati sliku iz public direktorija
    try {
      // Dobijamo punu putanju do slike (relativna putanja od root direktorija)
      const headerImageUrl = `${window.location.origin}/hifa-header.png`;
      
      // Učitaj sliku i konvertuj u Base64 format
      const headerImageBase64 = await loadHeaderImageAsBase64(headerImageUrl);
      
      // Dodaj sliku preko cijele širine stranice
      doc.addImage(headerImageBase64, 'PNG', 0, topPadding, pageWidth, headerHeight); // Adjusted Y for padding
    } catch (error) {
      console.error('Error adding header image:', error);
      
      // Fallback na jednostavan header ako slika ne može biti učitana
      doc.setFillColor(240, 240, 250);
      doc.rect(0, topPadding, pageWidth, 40, 'F'); // Adjusted Y for padding
      
      doc.setFontSize(20);
      doc.setTextColor(0, 51, 102);
      doc.text('HIFA-PETROL d.o.o. Sarajevo', 14, 20 + topPadding); // Adjusted Y for padding
      
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('71320 Vogosca, Hotonj bb', 14, 28 + topPadding); // Adjusted Y for padding
    }
    
    // Generisanje broja fakture koji ćemo koristiti kasnije
    // Koristimo broj dostavnice umjesto ID-a operacije
    const deliveryVoucherNumber = operation.delivery_note_number || operation.id.toString();
    const invoiceNumber = `INV-${deliveryVoucherNumber}-${new Date().getFullYear()}`;
    
    // Dodaj liniju ispod headera
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 45 + topPadding, pageWidth - 14, 45 + topPadding); // Adjusted Y for padding
    
    // Dodaj naslov fakture
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('INVOICE FOR FUEL SERVICES', pageWidth / 2, 55 + topPadding, { align: 'center' }); // Adjusted Y for padding
    
    // Dodaj informacije o kupcu (centrirano)
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0); // Promijeni u crnu boju
    doc.text('BUYER:', 14, 70 + topPadding); // Adjusted Y for padding
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    // Lijeva kolona - informacije o fakturi
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Invoice No.: ${invoiceNumber}`, 14, 77 + topPadding); // Adjusted Y for padding
    doc.text(`Issue Date: ${formatDate(new Date().toISOString())}`, 14, 83 + topPadding); // Adjusted Y for padding
    doc.text(`Service Date: ${formatDate(operation.dateTime)}`, 14, 89 + topPadding); // Adjusted Y for padding
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Desna kolona - informacije o kupcu
    const rightColumnX = pageWidth / 2;
    const rightColumnWidth = pageWidth / 2 - 14; // Širina desne kolone
    doc.setTextColor(0, 0, 0);
    doc.text(`${operation.airline?.name || 'N/A'}`, rightColumnX, 77 + topPadding); // Adjusted Y for padding
    
    // Automatsko prelomljavanje adrese
    const addressText = operation.airline?.address || 'N/A';
    const addressLines = doc.splitTextToSize(addressText, rightColumnWidth);
    let currentY = 83 + topPadding;
    addressLines.forEach((line: string) => {
      doc.text(line, rightColumnX, currentY);
      currentY += 6; // Razmak između redova
    });
    
    // ID/VAT i Contact informacije - pomjeri ih ispod adrese
    const contactY = currentY + 2; // Dodaj malo prostora nakon adrese
    doc.text(`ID/VAT No.: ${operation.airline?.taxId || 'N/A'}`, rightColumnX, contactY);
    doc.text(`Contact: ${operation.airline?.contact_details || 'N/A'}`, rightColumnX, contactY + 6);
    
    // Izračunaj dinamičku poziciju za sve elemente ispod adrese
    const baseY = contactY + 12; // Osnovna pozicija nakon contact informacija
    
    // Lijeva kolona - informacije o letu
    doc.setTextColor(0, 0, 0);
    doc.text(`Aircraft Registration: ${operation.aircraft_registration || 'N/A'}`, 14, baseY);
    doc.text(`Destination: ${operation.destination}`, 14, baseY + 6);
    doc.text(`Flight Number: ${operation.flight_number || 'N/A'}`, 14, baseY + 12);
    doc.text('Parity - CPT Tuzla Airport', 14, baseY + 18);
    
    // Desna kolona - informacije o dostavnici i tipu prometa
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Delivery Voucher: ${operation.delivery_note_number || 'N/A'}`, rightColumnX, baseY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    // Mapiranje Traffic Type vrijednosti
    const mapTrafficType = (type: string | null | undefined): string => {
      if (!type) return 'N/A';
      
      const mappings: Record<string, string> = {
        'Izvoz': 'Export',
        // Ovdje možemo dodati više mapiranja po potrebi
      };
      
      return mappings[type] || type;
    };
    
    doc.text(`Traffic Type: ${mapTrafficType(operation.tip_saobracaja)}`, rightColumnX, baseY + 6);
    doc.text(`Specific Density: ${(operation.specific_density || 0).toLocaleString('hr-HR', { minimumFractionDigits: 3 })}`, rightColumnX, baseY + 12);
    
    // Dodaj liniju iznad tabele
    const lineY = baseY + 24; // Pozicija linije nakon svih informacija
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(14, lineY, pageWidth - 14, lineY);
    
    // Dodaj tabelu s uslugama
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('SERVICE DETAILS:', 14, lineY + 10); // Pozicija naslova tabele
    
    // Koristimo autoTable za tabelu usluga da bi se tekst automatski prelomio
    const baseAmount = (operation.quantity_kg || 0) * (operation.price_per_kg || 0);
    const discountAmount = baseAmount * ((operation.discount_percentage || 0) / 100);
    const netAmount = operation.total_amount || 0;
    
    // Definiramo podatke za tabelu
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
        `Gorivo JET A-1 (${operation.aircraft_registration})`,
        `${operation.tank?.fuel_type || 'JET A-1'}`,
        `${(operation.quantity_liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })}`,
        `${(operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })}`,
        `${(operation.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 5 })} ${operation.currency || 'BAM'}`,
        `${(Number(netAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`
      ]
    ];
    
    // Koristimo autoTable za automatsko prelomljavanje teksta i spremamo finalnu poziciju
    let finalY = lineY + 20; // Pozicija tabele nakon naslova
    
    autoTable(doc, {
      startY: lineY + 20, // Pozicija tabele
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 220, 220], // Promijeni u tamniju sivu boju
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 'auto' }, // Opis usluge - automatska širina
        1: { cellWidth: 25 },     // Tip goriva
        2: { cellWidth: 25 },     // Količina (L)
        3: { cellWidth: 25 },     // Količina (kg)
        4: { cellWidth: 30 },     // Cijena/kg
        5: { cellWidth: 35 }      // Iznos
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Spremamo poziciju nakon tabele, provjeravamo da li je cursor definiran
        finalY = data.cursor?.y || finalY + 30; // Ako cursor nije definiran, dodajemo 30 jedinica na početnu poziciju
      }
    });
    
    // Sekcija za ukupan iznos - pozicionirana nakon tabele
    finalY += 10; // Dodajemo malo prostora nakon tabele
    const summaryBoxY = finalY;
    doc.setFillColor(248, 248, 248); // Promijeni u jako svijetlu sivu
    doc.rect(pageWidth / 2, summaryBoxY, pageWidth / 2 - 14, 50, 'F'); // Povećaj visinu sa 35 na 50
    
    // Linija iznad ukupnog iznosa
    doc.setDrawColor(200, 200, 220);
    doc.line(pageWidth / 2, summaryBoxY, pageWidth - 14, summaryBoxY);
    
    // Dodaj MRN podatke u lijevu kolonu ako postoje
    let mrnDataToDisplay: { mrn: string, quantity: number }[] = [];
    
    try {
      // Prvo provjeri parsedMrnBreakdown koji dolazi direktno s backenda
      if (operation.parsedMrnBreakdown && Array.isArray(operation.parsedMrnBreakdown)) {
        mrnDataToDisplay = operation.parsedMrnBreakdown;
      }
      // Ako nema parsedMrnBreakdown, pokušaj parsirati mrnBreakdown string
      else if (typeof operation.mrnBreakdown === 'string') {
        const parsedData = JSON.parse(operation.mrnBreakdown);
        if (Array.isArray(parsedData)) {
          mrnDataToDisplay = parsedData;
        }
      }
    } catch (e) {
      console.error('Error parsing MRN data:', e);
      // Nastavi s praznim nizom ako je došlo do greške
    }
    
    // Prikaži MRN podatke u lijevoj koloni
    if (mrnDataToDisplay.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('MRN Clearance:', 14, summaryBoxY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      let mrnY = summaryBoxY + 18;
      mrnDataToDisplay.forEach((item, index) => {
        // Handle different possible formats of MRN data
        let mrnNumber: string;
        let quantity: number | string;
        
        // Handle different possible formats of MRN data, prioritizing quantity_kg
        // Ensure item is treated as potentially having quantity_kg, quantity (liters), and mrn
        const currentItem = item as { mrn?: string, quantity_kg?: number, quantity?: number, [key: string]: any };

        if (currentItem.mrn && typeof currentItem.quantity_kg === 'number') {
          mrnNumber = currentItem.mrn;
          quantity = currentItem.quantity_kg; // Use quantity_kg
        } else if (currentItem.mrn && typeof currentItem.quantity === 'number') {
          // Fallback to 'quantity' (liters) if 'quantity_kg' is not available, though this shouldn't happen based on backend
          mrnNumber = currentItem.mrn;
          quantity = currentItem.quantity; 
        } else if (Object.keys(currentItem).length === 1) {
          // Legacy format where the key is the MRN and the value is the quantity (likely liters)
          const key = Object.keys(currentItem)[0];
          mrnNumber = key;
          quantity = currentItem[key] as number | string;
        } else {
          mrnNumber = 'N/A';
          quantity = 0;
        }
        
        const quantityFormatted = typeof quantity === 'number' ? quantity.toFixed(2) : quantity;
        
        doc.text(`MRN: ${mrnNumber} - ${quantityFormatted} kg`, 14, mrnY); // Changed L to kg
        mrnY += 6; // Razmak između MRN redova
        
        // Ograniči broj prikazanih MRN-ova da ne bi izašli iz prostora
        if (index >= 3) {
          doc.text(`+ ${mrnDataToDisplay.length - 4} more...`, 14, mrnY);
          return; // Prekini petlju nakon 4 MRN-a
        }
      });
    }
    
    // Ukupan iznos i detalji
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    let summaryY = summaryBoxY + 10;
    
    // Ako postoji rabat, prikaži osnovnu cijenu i rabat
    if (operation.discount_percentage && operation.discount_percentage > 0) {
      doc.text('Base Amount:', pageWidth / 2 + 5, summaryY);
      doc.text(`${(Number(baseAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, pageWidth - 14, summaryY, { align: 'right' });
      summaryY += 7;
      
      doc.text(`Discount (${operation.discount_percentage}%):`, pageWidth / 2 + 5, summaryY);
      doc.text(`-${(Number(discountAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, pageWidth - 14, summaryY, { align: 'right' });
      summaryY += 7;
    }
    
    // Neto iznos
    doc.text('Net Amount:', pageWidth / 2 + 5, summaryY);
    doc.text(`${(Number(netAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, pageWidth - 14, summaryY, { align: 'right' });
    
    // Ukupan iznos za plaćanje - pozicioniran na kraju sekcije za ukupan iznos
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT DUE:', pageWidth / 2 + 5, summaryBoxY + 28);
    doc.text(`${(Number(netAmount) || 0).toFixed(2).replace('.', ',')} ${operation.currency || 'BAM'}`, pageWidth - 14, summaryBoxY + 28, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    
    // Dodaj informaciju o konverziji u BAM ako je valuta USD ili EUR
    if (operation.currency === 'USD' || operation.currency === 'EUR') {
      // Izračunaj kurs i BAM ekvivalent
      let exchangeRate = 1;
      let exchangeRateSource = '';
      
      // Sigurno dohvati usd_exchange_rate kao string ili undefined
      const exchangeRateStr = operation.usd_exchange_rate as string | undefined;
      const hasValidExchangeRate = exchangeRateStr && exchangeRateStr.trim() !== '' && !isNaN(parseFloat(exchangeRateStr));
      
      if (operation.currency === 'EUR') {
        // Za EUR koristimo fiksni kurs ako nije naveden u operaciji
        exchangeRate = hasValidExchangeRate ? parseFloat(exchangeRateStr!) : 1.95583;
        exchangeRateSource = hasValidExchangeRate ? 'system exchange rate' : 'fixed EUR rate';
      } else if (operation.currency === 'USD') {
        // Za USD koristimo kurs iz operacije ili procijenjeni kurs
        exchangeRate = hasValidExchangeRate ? parseFloat(exchangeRateStr!) : 1.8;
        exchangeRateSource = hasValidExchangeRate ? 'system exchange rate' : 'estimated rate';
      }
      
      // Izračunaj BAM ekvivalent
      const bamEquivalent = netAmount * exchangeRate;
      
      // Dodaj informaciju o konverziji ispod ukupnog iznosa
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`Equivalent in BAM: ${bamEquivalent.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} BAM`, 
        pageWidth / 2 + 5, summaryBoxY + 35);
      doc.text(`(Exchange rate: 1 ${operation.currency} = ${exchangeRate.toLocaleString('hr-HR', { minimumFractionDigits: 5 })} BAM)`, 
        pageWidth / 2 + 5, summaryBoxY + 40);
      
      // Dodaj pečat ispod exchange rate informacije
      try {
        const pecatImageUrl = `${window.location.origin}/pecat.png`;
        const pecatImageBase64 = await loadImageAsBase64(pecatImageUrl);
        
        // Pozicioniraj pečat ispod exchange rate teksta, poravnato desno
        const pecatWidth = 75; // Povećaj širinu pečata sa 40 na 60mm
        const pecatHeight = 40; // Smanji visinu pečata sa 60 na 40mm
        const pecatX = pageWidth - pecatWidth - 14; // Poravnato desno
        const pecatY = summaryBoxY + 45; // Pozicioniranje ispod exchange rate teksta
        
        doc.addImage(pecatImageBase64, 'PNG', pecatX, pecatY, pecatWidth, pecatHeight);
      } catch (error) {
        console.error('Error adding pecat image:', error);
      }
    }
    
    // Dodaj informacije o plaćanju - pozicionirane nakon sekcije za ukupan iznos
    const paymentInfoY = summaryBoxY + 55;
    doc.setFontSize(6); // Smanji font sa 8 na 6
    doc.setFont('helvetica', 'normal'); // Nije bold
    doc.setTextColor(0, 0, 0);
    doc.text('Payment Method: Bank Transfer', 14, paymentInfoY);
    doc.text('IBAN: BA393389104805286885', 14, paymentInfoY + 4); // Smanji prored sa 6 na 4
    doc.text('SWIFT: UNCRBA22', 14, paymentInfoY + 8); // Smanji prored sa 12 na 8
    doc.text('Payment Due: 15 days from invoice issue date', 14, paymentInfoY + 12); // Smanji prored sa 18 na 12

    // VAT Note - New Position
    let yPosForVatNote = paymentInfoY + 12 + 9; // After "Payment Due" text (approx 7pt height) + 9pt spacing
    doc.setFontSize(6); // Smanji font sa 8 na 6
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0); // Black color for better visibility
    // VAT napomena u tri reda, poravnato lijevo
    doc.text('VAT is not included in accordance with Article 27,', 14, yPosForVatNote);
    doc.text('act 1, paragraph 1 of the Law of Value Added Taxation', 14, yPosForVatNote + 4); // Smanji prored sa 6 na 4
    doc.text('and article 39, act 1 of the Value Added Tax application requirements', 14, yPosForVatNote + 8); // Smanji prored sa 12 na 8
    // For new layout, just add 12pt after VAT note (3 lines, 4pt apart)
    let yPosAfterVatNote = yPosForVatNote + 12;
    doc.setTextColor(0, 0, 0); // Reset text color

    // Dodaj bankovne podatke - pozicionirane nakon VAT note
    const bankInfoY = yPosAfterVatNote + 5; // Pomjeri bankovne podatke malo ka dole
    doc.setFontSize(9);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    // Ukloni PAYMENT DETAILS: i Reference No.
    
    // Dodaj bankovne podatke u dvije kolone sa manjim fontom
    const bankFontSize = 5; // Dodatno smanjili font sa 5.5 na 5
    doc.setFontSize(bankFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Podjela stranice na dvije kolone s manjim razmakom
    const bankColWidth = (pageWidth - 28) * 0.45; // Smanjili smo širinu kolone za bolji izgled
    const bankColGap = (pageWidth - 28) * 0.1; // Razmak između kolona
    
    // Centriranje bankovnih podataka
    const centerX = pageWidth / 2;
    const col1X = centerX - bankColWidth - bankColGap/2;
    const col2X = centerX + bankColGap/2;
    
    // Prva kolona banaka
    let bankY = bankInfoY + 9; // Dodatno smanjili početni razmak sa 12 na 9
    const lineSpacing = bankFontSize * 0.7; // Dodatno smanjili razmak između redova
    
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
    
    // Dodaj vertikalnu liniju između kolona
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.3);
    doc.line(centerX, bankInfoY + 7, centerX, bankY + lineSpacing * 2);
    
    // Druga kolona banaka
    bankY = bankInfoY + 9; // Usklađeno s prvom kolonom
    
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
    
    // IBAN i SWIFT na dnu
    doc.text('IBAN: BA393389104805286885', col2X, bankY);
    doc.text('SWIFT: UNCRBA22', col2X + bankColWidth - 5, bankY, { align: 'right' });
    
    // Ukloni cijeli footer dio
    // Osiguraj da PDF ima dovoljnu visinu za prikaz cijelog sadržaja
    const totalHeight = bankY + 10; // Prilagodi visinu prema bankovnim podacima
    if (doc.internal.pageSize.height < totalHeight) {
      doc.internal.pageSize.height = totalHeight;
    }
    
    // Generiši PDF kao bytes umjesto direktnog save-a
    const pdfBytes = doc.output('arraybuffer');
    
    console.log('🔍 generatePDFInvoice - Početak spajanja...');
    console.log('📄 Operacija za spajanje:', operation);
    console.log('📋 Dokumenti u operaciji:', operation.documents);
    
    // Spoji s prikačenim dokumentom ako postoji
    try {
      await mergeAndDownloadInvoice(
        new Uint8Array(pdfBytes),
        operation,
        `Invoice-${invoiceNumber}.pdf`
      );
      console.log('✅ Spajanje uspješno završeno');
    } catch (mergeError) {
      console.warn('❌ Greška pri spajanju s prikačenim dokumentom, downloadujem samo fakturu:', mergeError);
      // Fallback: downloaduj samo fakturu
      doc.save(`Invoice-${invoiceNumber}.pdf`);
    }
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
