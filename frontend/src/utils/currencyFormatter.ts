/**
 * currencyFormatter.ts
 * Utility funkcije za formatiranje valuta u frontend-u
 */

/**
 * Formatira iznos kao BAM valutu
 * Svi prihodi u analytics-u su već konvertovani u BAM na backend-u
 */
export function formatBAM(amount: number): string {
  return new Intl.NumberFormat('bs-BA', {
    style: 'currency',
    currency: 'BAM',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formatira iznos kao broj sa separatorima
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('bs-BA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Math.round(num));
}

/**
 * Formatira rast kao procenat
 */
export function formatGrowth(growth: number): string {
  const sign = growth > 0 ? '+' : '';
  return `${sign}${growth.toFixed(1)}%`;
}

/**
 * Formatira velike brojeve sa K/M sufiksima
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`;
  }
  return num.toString();
}

/**
 * Dobija boju za rast na osnovu procenta
 */
export function getGrowthColor(growth: number): string {
  if (growth > 0) return 'text-green-600';
  if (growth < 0) return 'text-red-600';
  return 'text-gray-600';
}

/**
 * Dobija badge varijantu za rast
 */
export function getGrowthBadgeVariant(growth: number): "default" | "secondary" | "destructive" | "outline" {
  if (growth > 15) return 'default'; // Green for significant growth
  if (growth > 0) return 'secondary'; // Blue for moderate growth
  if (growth < -15) return 'destructive'; // Red for significant decline
  return 'outline'; // Gray for minimal change
}
