import jsPDF from 'jspdf';
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';

export const FONT_NAME = 'NotoSans';

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

// Funkcija za pravilno prikazivanje tipa saobraćaja
export const getTrafficTypeDisplay = (operation: any): string => {
  // Provjera tip_saobracaja polja (ispravno polje prema definiciji FuelOperation)
  if (operation.tip_saobracaja) {
    // Mapiranje kodova na pune nazive
    switch(operation.tip_saobracaja.toLowerCase()) {
      case 'd': return 'Domaći';
      case 'm': return 'Međunarodni';
      case 'domestic': return 'Domaći';
      case 'international': return 'Međunarodni';
      case 'izvoz': return 'Izvoz';
      case 'uvoz': return 'Uvoz';
      case 'unutarnji': return 'Unutarnji saobraćaj';
      default: return operation.tip_saobracaja; // Vraćamo originalnu vrijednost ako nije prepoznata
    }
  }
  
  // Provjera traffic_type polja (alternativno polje koje možda postoji u podacima)
  if (operation.traffic_type) {
    // Mapiranje kodova na pune nazive
    switch(operation.traffic_type.toLowerCase()) {
      case 'd': return 'Domaći';
      case 'm': return 'Međunarodni';
      case 'domestic': return 'Domaći';
      case 'international': return 'Međunarodni';
      default: return operation.traffic_type; // Vraćamo originalnu vrijednost ako nije prepoznata
    }
  }
  
  // Provjera flight_type polja (alternativno polje koje možda postoji u podacima)
  if (operation.flight_type) {
    // Mapiranje kodova na pune nazive
    switch(operation.flight_type.toLowerCase()) {
      case 'd': return 'Domaći';
      case 'm': return 'Međunarodni';
      case 'domestic': return 'Domaći';
      case 'international': return 'Međunarodni';
      default: return operation.flight_type; // Vraćamo originalnu vrijednost ako nije prepoznata
    }
  }
  
  // Ako nema ni jednog od polja
  return 'Nije definisano';
};

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
