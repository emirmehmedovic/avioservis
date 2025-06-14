/**
 * Utility funkcije za validaciju različitih podataka
 */

/**
 * Validira format MRN broja (Movement Reference Number)
 * MRN broj je jedinstveni identifikator carinske deklaracije
 * Format: 2 slova koda zemlje + 6 cifara godine i dana + 8 alfanumeričkih znakova + 1 kontrolna cifra
 * Primjer: BA23061712345678X
 * 
 * @param mrn - MRN broj za validaciju
 * @returns true ako je MRN broj validan, false inače
 */
export function validateMRNNumber(mrn: string): boolean {
  if (!mrn) return false;
  
  // Osnovna validacija - MRN mora biti string
  if (typeof mrn !== 'string') return false;
  
  // Provjeri da li je MRN broj generiran automatski od strane aplikacije
  if (mrn.startsWith('UNTRACKED-INTAKE-')) return true;
  
  // Standardni MRN format: 2 slova + 14 alfanumeričkih znakova + 1 kontrolna cifra
  const mrnRegex = /^[A-Z]{2}\d{6}[0-9A-Z]{8}[0-9A-Z]$/;
  
  return mrnRegex.test(mrn);
}

/**
 * Validira registarsku oznaku vozila
 * 
 * @param plate - Registarska oznaka za validaciju
 * @returns true ako je registarska oznaka validna, false inače
 */
export function validateVehiclePlate(plate: string): boolean {
  if (!plate) return false;
  
  // Osnovna validacija - registarska oznaka mora biti string
  if (typeof plate !== 'string') return false;
  
  // Minimalna dužina registarske oznake
  if (plate.length < 2) return false;
  
  return true;
}

/**
 * Validira količinu goriva
 * 
 * @param quantity - Količina goriva za validaciju
 * @returns true ako je količina validna, false inače
 */
export function validateFuelQuantity(quantity: number | string): boolean {
  // Konvertuj u broj ako je string
  const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  
  // Provjeri da li je broj
  if (isNaN(numQuantity)) return false;
  
  // Količina mora biti pozitivna
  if (numQuantity < 0) return false;
  
  return true;
}
