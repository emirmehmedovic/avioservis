/**
 * dateFormatter.ts
 * Utility funkcije za formatiranje datuma u bosanski format
 */

/**
 * Formatira datum u bosanski format dd.mm.yyyy
 */
export function formatDateBS(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  return dateObj.toLocaleDateString('bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatira datum u bosanski format sa vremenom dd.mm.yyyy HH:mm
 */
export function formatDateTimeBS(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  return dateObj.toLocaleDateString('bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatira datum u kratki bosanski format dd.mm.yy
 */
export function formatDateShortBS(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  return dateObj.toLocaleDateString('bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

/**
 * Formatira period datuma u bosanski format
 */
export function formatDateRangeBS(startDate: string | Date, endDate: string | Date): string {
  return `${formatDateBS(startDate)} - ${formatDateBS(endDate)}`;
}

/**
 * Formatira mjesec i godinu u bosanski format (januar 2024)
 */
export function formatMonthYearBS(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  return dateObj.toLocaleDateString('bs-BA', {
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Formatira sedmicu u bosanski format (Sedmica 1, 2024)
 */
export function formatWeekBS(weekStart: string | Date): string {
  const dateObj = typeof weekStart === 'string' ? new Date(weekStart) : weekStart;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Week';
  }

  // Izračunaj broj sedmice
  const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
  const pastDaysOfYear = (dateObj.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

  return `Sedmica ${weekNumber}, ${dateObj.getFullYear()}`;
}

/**
 * Formatira relativni datum (prije 2 dana, prošle sedmice, itd.)
 */
export function formatRelativeDateBS(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffTime = now.getTime() - dateObj.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Danas';
  } else if (diffDays === 1) {
    return 'Jučer';
  } else if (diffDays < 7) {
    return `Prije ${diffDays} dana`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? 'Prošle sedmice' : `Prije ${weeks} sedmica`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? 'Prošlog mjeseca' : `Prije ${months} mjeseci`;
  } else {
    const years = Math.floor(diffDays / 365);
    return years === 1 ? 'Prošle godine' : `Prije ${years} godina`;
  }
}

/**
 * Parsira datum iz bosanskog formata dd.mm.yyyy u Date objekat
 */
export function parseDateBS(dateString: string): Date | null {
  const parts = dateString.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Mjeseci su 0-indexed
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month, day);
  
  // Provjeri da li je datum valjan
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }

  return date;
}

/**
 * Dobija naziv dana u sedmici na bosanskom
 */
export function getDayNameBS(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const dayNames = [
    'nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 
    'četvrtak', 'petak', 'subota'
  ];
  
  return dayNames[dateObj.getDay()];
}

/**
 * Dobija naziv mjeseca na bosanskom
 */
export function getMonthNameBS(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const monthNames = [
    'januar', 'februar', 'mart', 'april', 'maj', 'juni',
    'juli', 'august', 'septembar', 'oktobar', 'novembar', 'decembar'
  ];
  
  return monthNames[dateObj.getMonth()];
}
