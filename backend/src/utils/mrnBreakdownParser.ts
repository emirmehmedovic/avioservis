/**
 * mrnBreakdownParser.ts
 * Utility funkcije za parsiranje MRN breakdown podataka
 */

/**
 * Interfejs za originalne podatke iz baze
 */
interface MrnBreakdownRawItem {
  mrn: string;        // MRN (customs_declaration_number)
  quantity?: number;      // Količina u litrima (stariji format) 
  quantity_kg?: number;   // Količina u kilogramima (stariji format)
  liters?: number;        // Količina u litrima (noviji format)
  kg?: number;            // Količina u kilogramima (noviji format)
  tankId?: number;        // ID tanka iz kojeg je gorivo uzeto
  density_at_intake?: number;  // Gustoća pri unosu
}

/**
 * Interfejs za normaliziranu stavku MRN breakdown-a
 */
interface MrnBreakdownItem {
  mrn: string;        // MRN (customs_declaration_number)
  liters: number;     // Količina u litrima
  kg: number;         // Količina u kilogramima
  tankId: number;     // ID tanka iz kojeg je gorivo uzeto
  originalData?: any;  // Originalni podaci za referencu
}

/**
 * Interfejs za MRN breakdown strukturu
 */
interface MrnBreakdown {
  breakdown: MrnBreakdownItem[];
}

/**
 * Parsira MRN breakdown JSON string u strukturirani objekt
 * @param mrnBreakdownJson - JSON string iz baze podataka
 * @returns Strukturirani MrnBreakdown objekt ili null ako je parsiranje neuspješno
 */
export function parseMrnBreakdown(mrnBreakdownJson: string | null): MrnBreakdown | null {
  if (!mrnBreakdownJson) {
    return null;
  }

  try {
    // Parsiranje JSON-a
    const parsed = JSON.parse(mrnBreakdownJson);
    
    // Rukovanje s različitim formatima
    let breakdown: MrnBreakdownItem[] = [];
    
    if (Array.isArray(parsed)) {
      // Ako je već niz, koristimo ga direktno
      breakdown = parsed;
    } else if (parsed.breakdown && Array.isArray(parsed.breakdown)) {
      // Ako je objekt s breakdown poljem koje je niz
      breakdown = parsed.breakdown;
    } else {
      console.error('Neispravna struktura MRN breakdown-a, nije ni niz niti objekt s breakdown poljem.');
      return null;
    }
    
    // Kreiranje validne strukture
    const result: MrnBreakdown = {
      breakdown: breakdown
    };
    
    // Mapiranje i normalizacija podataka
    result.breakdown = result.breakdown.map((item: MrnBreakdownRawItem) => {
      // Mapiranje polja iz različitih formata u standardni format
      const normalizedItem: MrnBreakdownItem = {
        mrn: item.mrn || '',
        liters: item.liters || item.quantity || 0,
        kg: item.kg || item.quantity_kg || 0,
        tankId: item.tankId || 0,
        originalData: item
      };
      return normalizedItem;
    }).filter(item => {
      // Validacija nakon mapiranja
      const isValid = item && 
        typeof item.mrn === 'string' && 
        typeof item.liters === 'number' && 
        typeof item.kg === 'number';
      
      if (!isValid) {
        console.warn('Pronađena nevažeća MRN breakdown stavka nakon mapiranja:', item);
      }
      
      return isValid;
    });
    
    return result;
  } catch (error) {
    console.error('Greška pri parsiranju MRN breakdown-a:', error);
    return null;
  }
}

/**
 * Grupiše stavke MRN breakdown-a po MRN-u
 * @param breakdown - MRN breakdown objekt
 * @returns Objekt gdje su ključevi MRN-ovi, a vrijednosti agregirane količine
 */
export function groupByMrn(breakdown: MrnBreakdown | null): Record<string, { liters: number, kg: number }> {
  if (!breakdown || !breakdown.breakdown) {
    return {};
  }
  
  const result: Record<string, { liters: number, kg: number }> = {};
  
  for (const item of breakdown.breakdown) {
    if (!result[item.mrn]) {
      result[item.mrn] = { liters: 0, kg: 0 };
    }
    
    result[item.mrn].liters += item.liters;
    result[item.mrn].kg += item.kg;
  }
  
  return result;
}

/**
 * Izračunava ukupne količine iz MRN breakdown-a
 * @param breakdown - MRN breakdown objekt
 * @returns Objekt sa ukupnom količinom u litrima i kilogramima
 */
export function calculateTotals(breakdown: MrnBreakdown | null): { totalLiters: number, totalKg: number } {
  if (!breakdown || !breakdown.breakdown) {
    return { totalLiters: 0, totalKg: 0 };
  }
  
  let totalLiters = 0;
  let totalKg = 0;
  
  for (const item of breakdown.breakdown) {
    totalLiters += item.liters;
    totalKg += item.kg;
  }
  
  return { totalLiters, totalKg };
}

/**
 * Kreira MRN breakdown JSON string na osnovu strukturiranog objekta
 * @param breakdown - MRN breakdown objekt
 * @returns JSON string spreman za pohranu u bazi podataka
 */
export function stringifyMrnBreakdown(breakdown: MrnBreakdown): string {
  return JSON.stringify(breakdown);
}

/**
 * Tipovi eksportirani iz modula
 */
export type { MrnBreakdown, MrnBreakdownItem };
