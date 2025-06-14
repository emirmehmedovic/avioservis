/**
 * Pomoćne funkcije za rad s brojevima i decimalnim vrijednostima
 */

/**
 * Funkcija za sigurno parsiranje decimalnih vrijednosti
 * Podržava različite formate zapisa (hr-HR i en-US):
 * - Zarez kao decimalni separator (npr. 1234,56)
 * - Točka kao decimalni separator (npr. 1234.56)
 * - Sa ili bez tisućica separatora (1.234,56 ili 1,234.56)
 *
 * @param value - Vrijednost koja se parsira, može biti string, number ili null/undefined
 * @returns Parsirana decimalna vrijednost kao broj ili NaN ako je parsiranje neuspješno
 */
export function parseDecimalValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return NaN;
  
  // Ako je već broj, samo ga vratimo
  if (typeof value === 'number') return value;
  
  // Očisti string od potencijalnih razmaka
  const trimmedValue = value.trim();
  if (trimmedValue === '') return NaN;
  
  try {
    // Ako je vrijednost već parsirana u JavaScript broju, samo je vratimo
    if (/^\s*-?\d+(\.\d+)?\s*$/.test(trimmedValue)) {
      return parseFloat(trimmedValue);
    }
    
    // Ako je vrijednost u hrvatskom formatu s zarezom kao decimalnim separatorom (npr. 1234,56 ili 1.234,56)
    if (/^\s*-?[\d.,]+\s*$/.test(trimmedValue) && trimmedValue.includes(',')) {
      // Zamijenimo sve točke (korištene kao tisućica separator) i koristimo samo posljednji zarez kao decimalni separator
      const parts = trimmedValue.split(',');
      const integerPart = parts.slice(0, -1).join('').replace(/\./g, '');
      const decimalPart = parts.slice(-1)[0];
      return parseFloat(`${integerPart}.${decimalPart}`);
    }
    
    // Ako je vrijednost u SAD formatu s točkom kao decimalnim separatorom (npr. 1234.56 ili 1,234.56)
    if (/^\s*-?[\d.,]+\s*$/.test(trimmedValue) && trimmedValue.includes('.')) {
      // Zamijenimo sve zareze (korištene kao tisućica separator)
      return parseFloat(trimmedValue.replace(/,/g, ''));
    }

    // Ako ništa od navedenog ne uspije, pokušaj standardni parsing
    return parseFloat(trimmedValue);
  } catch (error) {
    console.error('Greška prilikom parsiranja decimalne vrijednosti:', value, error);
    return NaN;
  }
}
