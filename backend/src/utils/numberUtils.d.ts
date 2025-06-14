/**
 * Deklaracije tipa za numberUtils modul
 */

declare module '../utils/numberUtils' {
  /**
   * Funkcija za sigurno parsiranje decimalnih vrijednosti
   */
  export function parseDecimalValue(value: string | number | undefined | null): number;
}
