/**
 * Utility za konverziju valuta u BAM
 */

// Fiksni kurs za konverziju iz EUR u BAM (1 EUR = 1.955830 BAM)
export const EUR_TO_BAM_RATE = 1.955830;

/**
 * Konvertuje iznos iz specifične valute u BAM
 * @param amount Iznos za konverziju
 * @param currency Valuta iznosa ('EUR', 'USD', 'BAM')
 * @param customExchangeRate Opcionalni prilagođeni kurs za konverziju (koristi se za USD)
 * @returns Iznos u BAM
 */
export function convertToBAM(amount: number, currency: string = 'BAM', customExchangeRate?: number): number {
  if (!amount || isNaN(amount)) return 0;
  
  switch (currency) {
    case 'EUR':
      return amount * EUR_TO_BAM_RATE;
    case 'USD':
      // Za USD koristi prilagođeni kurs ako je dostupan
      if (customExchangeRate && !isNaN(customExchangeRate)) {
        return amount * customExchangeRate;
      }
      // Ako nema prilagođenog kursa, ne možemo precizno konvertovati USD u BAM
      console.warn('USD conversion without exchange rate is not supported');
      return amount; // Vraćamo originalni iznos bez konverzije
    case 'BAM':
    default:
      return amount;
  }
}

/**
 * Konvertuje iznos iz BAM u specifičnu valutu
 * @param amount Iznos u BAM
 * @param targetCurrency Ciljna valuta ('EUR', 'USD', 'BAM')
 * @param customExchangeRate Opcionalni prilagođeni kurs za konverziju (koristi se za USD)
 * @returns Konvertovani iznos
 */
export function convertFromBAM(amount: number, targetCurrency: string = 'BAM', customExchangeRate?: number): number {
  if (!amount || isNaN(amount)) return 0;
  
  switch (targetCurrency) {
    case 'EUR':
      return amount / EUR_TO_BAM_RATE;
    case 'USD':
      // Za USD koristi prilagođeni kurs ako je dostupan
      if (customExchangeRate && !isNaN(customExchangeRate)) {
        return amount / customExchangeRate;
      }
      // Ako nema prilagođenog kursa, ne možemo precizno konvertovati BAM u USD
      console.warn('BAM to USD conversion without exchange rate is not supported');
      return amount; // Vraćamo originalni iznos bez konverzije
    case 'BAM':
    default:
      return amount;
  }
}
