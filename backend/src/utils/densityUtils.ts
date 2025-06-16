import { Decimal } from '@prisma/client/runtime/library';
import { logger } from './logger';

/**
 * Konstante za gorivo Jet A-1
 */
export const JET_A1_DEFAULT_DENSITY = 0.8; // kg/L standardna gustoća pri 15°C
export const JET_A1_DENSITY_MIN = 0.775; // Minimalna gustoća (kg/L)
export const JET_A1_DENSITY_MAX = 0.84; // Maksimalna gustoća (kg/L)

/**
 * Tipovi gustoće goriva koje možemo koristiti kao ulazni parametar
 */
export type DensityInput = number | string | Decimal | null | undefined;

/**
 * Normalizira ulaznu gustoću i vraća ju kao broj
 * @param density - ulazna gustoća koja može biti broj, string, Decimal ili null/undefined
 * @returns normalizirana gustoća kao broj
 */
export function normalizeDensity(density: DensityInput): number {
  // Ako je null, undefined ili prazan string, koristi default vrijednost
  if (density === null || density === undefined || (typeof density === 'string' && density.trim() === '')) {
    return JET_A1_DEFAULT_DENSITY;
  }

  // Konverzija u broj
  let numericDensity: number;
  if (density instanceof Decimal) {
    numericDensity = parseFloat(density.toString());
  } else if (typeof density === 'string') {
    numericDensity = parseFloat(density);
  } else {
    numericDensity = density;
  }

  // Validacija i normalizacija
  if (isNaN(numericDensity) || numericDensity <= 0) {
    logger.warn(`Neispravna gustoća: ${density}, koristi se default: ${JET_A1_DEFAULT_DENSITY}`);
    return JET_A1_DEFAULT_DENSITY;
  }

  // Provjera je li gustoća u očekivanom rasponu
  if (numericDensity < JET_A1_DENSITY_MIN || numericDensity > JET_A1_DENSITY_MAX) {
    logger.warn(`Neuobičajena gustoća: ${numericDensity} kg/L izvan očekivanog raspona [${JET_A1_DENSITY_MIN}-${JET_A1_DENSITY_MAX}]`);
  }

  return numericDensity;
}

/**
 * Pretvara litre u kilograme na temelju gustoće
 * @param liters - količina u litrama
 * @param density - gustoća goriva (kg/L)
 * @returns količina u kilogramima
 */
export function litersToKg(liters: number | string | Decimal, density: DensityInput = JET_A1_DEFAULT_DENSITY): number {
  const numericLiters = parseFloat(liters.toString());
  const normalizedDensity = normalizeDensity(density);

  if (isNaN(numericLiters)) {
    logger.warn(`Neispravna vrijednost litara: ${liters}`);
    return 0;
  }

  return numericLiters * normalizedDensity;
}

/**
 * Pretvara kilograme u litre na temelju gustoće
 * @param kg - količina u kilogramima
 * @param density - gustoća goriva (kg/L)
 * @returns količina u litrama
 */
export function kgToLiters(kg: number | string | Decimal, density: DensityInput = JET_A1_DEFAULT_DENSITY): number {
  const numericKg = parseFloat(kg.toString());
  const normalizedDensity = normalizeDensity(density);

  if (isNaN(numericKg)) {
    logger.warn(`Neispravna vrijednost kilograma: ${kg}`);
    return 0;
  }

  // Izbjegavamo dijeljenje s nulom
  if (normalizedDensity <= 0) {
    logger.error(`Pokušaj dijeljenja s gustoćom 0 ili negativnom: ${density}`);
    return 0;
  }

  return numericKg / normalizedDensity;
}

/**
 * Izračunava gustoću na temelju poznatih kg i litara
 * @param kg - količina u kilogramima
 * @param liters - količina u litrama
 * @returns izračunata gustoća (kg/L) ili default ako je pogrešan izračun
 */
export function calculateDensity(kg: number | string | Decimal, liters: number | string | Decimal): number {
  const numericKg = parseFloat(kg.toString());
  const numericLiters = parseFloat(liters.toString());

  if (isNaN(numericKg) || isNaN(numericLiters)) {
    logger.warn(`Neispravna vrijednost za izračun gustoće: kg=${kg}, liters=${liters}`);
    return JET_A1_DEFAULT_DENSITY;
  }

  if (numericLiters <= 0) {
    logger.warn(`Pokušaj izračuna gustoće s 0 ili negativnim litrama: ${numericLiters}`);
    return JET_A1_DEFAULT_DENSITY;
  }

  const density = numericKg / numericLiters;

  // Validacija izračunate gustoće
  if (density <= 0 || density < JET_A1_DENSITY_MIN * 0.9 || density > JET_A1_DENSITY_MAX * 1.1) {
    logger.warn(`Izračunata gustoća ${density.toFixed(4)} kg/L je izvan razumnog raspona [${(JET_A1_DENSITY_MIN * 0.9).toFixed(4)}-${(JET_A1_DENSITY_MAX * 1.1).toFixed(4)}], koristim default: ${JET_A1_DEFAULT_DENSITY}`);
    return JET_A1_DEFAULT_DENSITY;
  }

  return density;
}

/**
 * Formatira gustoću na 4 decimale kao string
 * @param density - gustoća koju želimo formatirati
 * @returns formatirana gustoća kao string s 4 decimale
 */
export function formatDensity(density: DensityInput): string {
  return normalizeDensity(density).toFixed(4);
}

/**
 * Konvertira vrijednost u Decimal objekt za Prisma
 * @param value - vrijednost za konverziju
 * @returns Decimal objekt
 */
export function toDecimal(value: number | string | Decimal): Decimal {
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value.toString());
}

/**
 * Stvara Decimal objekt gustoće na temelju kg i litara
 * @param kg - količina u kilogramima
 * @param liters - količina u litrama
 * @returns gustoća kao Decimal objekt
 */
export function calculateDensityAsDecimal(kg: number | string | Decimal, liters: number | string | Decimal): Decimal {
  const density = calculateDensity(kg, liters);
  return toDecimal(density.toFixed(4)); // Prisma koristi string u konstruktoru za precizno formatiranje
}

/**
 * Pretvara litre u kilograme i vraća kao Decimal objekt
 * @param liters - količina u litrama
 * @param density - gustoća goriva
 * @returns količina u kilogramima kao Decimal
 */
export function litersToKgDecimal(liters: number | string | Decimal, density: DensityInput = JET_A1_DEFAULT_DENSITY): Decimal {
  const kg = litersToKg(liters, density);
  return toDecimal(kg.toFixed(3)); // Zaokružujemo na 3 decimale za kg
}

/**
 * Pretvara kilograme u litre i vraća kao Decimal objekt
 * @param kg - količina u kilogramima
 * @param density - gustoća goriva
 * @returns količina u litrama kao Decimal
 */
export function kgToLitersDecimal(kg: number | string | Decimal, density: DensityInput = JET_A1_DEFAULT_DENSITY): Decimal {
  const liters = kgToLiters(kg, density);
  return toDecimal(liters.toFixed(3)); // Zaokružujemo na 3 decimale za litre
}
