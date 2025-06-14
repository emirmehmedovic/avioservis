import dayjs from 'dayjs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { FuelingOperation } from '../types';

// Constants
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

/**
 * Format a date string to a localized format
 */
export const formatDate = (dateString: string): string => {
  return dayjs(dateString).format('DD.MM.YYYY. HH:mm');
};

/**
 * Generate a PDF invoice for a fueling operation
 */
export const generatePDFInvoice = (operation: FuelingOperation): void => {
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add company logo/header
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text('AVIOSERVIS d.o.o.', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Međunarodni aerodrom Sarajevo', pageWidth / 2, 28, { align: 'center' });
    doc.text('71210 Ilidža, Bosna i Hercegovina', pageWidth / 2, 34, { align: 'center' });
    
    // Add invoice title
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102);
    doc.text('FAKTURA ZA GORIVO', pageWidth / 2, 45, { align: 'center' });
    
    // Add invoice number and date
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const invoiceNumber = `INV-${operation.id}-${new Date().getFullYear()}`;
    doc.text(`Broj fakture: ${invoiceNumber}`, 14, 55);
    doc.text(`Datum: ${formatDate(operation.dateTime)}`, 14, 60);
    
    // Add client information
    doc.setFontSize(12);
    doc.text('Podaci o klijentu:', 14, 70);
    doc.setFontSize(10);
    doc.text(`Avio kompanija: ${operation.airline.name}`, 14, 75);
    doc.text(`ID: ${operation.airlineId}`, 14, 80);
    doc.text(`Registracija aviona: ${operation.aircraft_registration || 'N/A'}`, 14, 85);
    doc.text(`Destinacija: ${operation.destination}`, 14, 90);
    doc.text(`Broj leta: ${operation.flight_number || 'N/A'}`, 14, 95);
    
    // Add fuel information
    doc.setFontSize(12);
    doc.text('Detalji o gorivu:', 14, 105);
    doc.setFontSize(10);
    doc.text(`Tip goriva: ${operation.tank?.fuel_type || 'JET A-1'}`, 14, 110);
    doc.text(`Količina (litara): ${(operation.quantity_liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} L`, 14, 115);
    doc.text(`Specifična gustoća: ${(operation.specific_density || 0).toLocaleString('hr-HR', { minimumFractionDigits: 3 })}`, 14, 120);
    doc.text(`Količina (kg): ${(operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} kg`, 14, 125);
    
    // Add pricing information
    doc.setFontSize(12);
    doc.text('Informacije o cijeni:', 14, 135);
    doc.setFontSize(10);
    doc.text(`Cijena po kg: ${(operation.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} ${operation.currency || 'BAM'}`, 14, 140);
    doc.text(`Tip saobraćaja: ${operation.tip_saobracaja || 'N/A'}`, 14, 145);
    
    // Add total amount with a box around it
    doc.setFillColor(240, 240, 240);
    doc.rect(110, 155, 85, 25, 'F');
    doc.setFontSize(12);
    doc.text('Ukupan iznos za plaćanje:', 115, 165);
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text(`${(operation.total_amount || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} ${operation.currency || 'BAM'}`, 115, 175);
    
    // Add payment information
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Informacije o plaćanju:', 14, 190);
    doc.text('Banka: UniCredit Bank d.d.', 14, 195);
    doc.text('IBAN: BA39 3386 9048 0000 0000', 14, 200);
    doc.text('SWIFT: UNCRBA22', 14, 205);
    
    // Add footer
    doc.setFontSize(8);
    doc.text('AVIOSERVIS d.o.o. | ID: 4200468580006 | PDV: 200468580006', pageWidth / 2, 280, { align: 'center' });
    doc.text(`Faktura generisana: ${new Date().toLocaleString('hr-HR')}`, pageWidth / 2, 285, { align: 'center' });
    
    // Save the PDF
    doc.save(`Faktura-${invoiceNumber}.pdf`);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
