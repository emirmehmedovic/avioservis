import { ServiceRecordCategory, ServiceItemType } from '@/types';

// Helper functions for formatting service record data
export const formatServiceCategory = (category: ServiceRecordCategory): string => {
  switch (category) {
    case 'REGULAR_MAINTENANCE':
      return 'Redovno održavanje';
    case 'REPAIR':
      return 'Popravka';
    case 'TECHNICAL_INSPECTION':
      return 'Tehnički pregled';

    case 'FILTER_REPLACEMENT':
      return 'Zamjena filtera';
    case 'HOSE_REPLACEMENT':
      return 'Zamjena crijeva';
    case 'CALIBRATION':
      return 'Kalibracija';
    default:
      return category;
  }
};

export const formatServiceItemType = (type: ServiceItemType): string => {
  switch (type) {
    case 'FILTER':
      return 'Filter';
    case 'HOSE_HD63':
      return 'Crijevo HD63';
    case 'HOSE_HD38':
      return 'Crijevo HD38';
    case 'HOSE_TW75':
      return 'Crijevo TW75';
    case 'HOSE_LEAK_TEST':
      return 'Test curenja crijeva';
    case 'VOLUMETER':
      return 'Volumetar';
    case 'MANOMETER':
      return 'Manometar';
    case 'HECPV_ILCPV':
      return 'HECPV/ILCPV';
    case 'SIX_MONTH_CHECK':
      return '6-mjesečni pregled';
    case 'ENGINE':
      return 'Motor';
    case 'BRAKES':
      return 'Kočnice';
    case 'TRANSMISSION':
      return 'Transmisija';
    case 'ELECTRICAL':
      return 'Električni sistem';
    case 'TIRES':
      return 'Gume';











    case 'OTHER':
      return 'Ostalo';
    default:
      return type;
  }
};

// Helper function for formatting dates
export const formatDateForDisplay = (date: Date | string | null | undefined) => {
  if (!date) return 'Nema podatka';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Neispravan datum'; 
  return new Intl.DateTimeFormat('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateObj);
};
