// Glavni interface za Plan Kalibracije
export interface PlanKalibracije {
  id: number;
  naziv_opreme: string;
  vlasnik_opreme: string;
  mjesto_koristenja_opreme: string;
  identifikacijski_broj: string;
  
  // Volumetar datumi
  volumetar_kalibracija_od?: string;
  volumetar_kalibracija_do?: string;
  
  // Glavni volumetar datumi
  glavni_volumetar_kalibracija_od?: string;
  glavni_volumetar_kalibracija_do?: string;
  
  // Mjerači pritiska (manometri)
  manometri_kalibracija_od?: string;
  manometri_kalibracija_do?: string;
  
  // Crijevo za punjenje
  crijevo_punjenje_kalibracija_od?: string;
  crijevo_punjenje_kalibracija_do?: string;
  
  // Glavni manometar
  glavni_manometar_kalibracija_od?: string;
  glavni_manometar_kalibracija_do?: string;
  
  // Termometar
  termometar_kalibracija_od?: string;
  termometar_kalibracija_do?: string;
  
  // Hidrometar
  hidrometar_kalibracija_od?: string;
  hidrometar_kalibracija_do?: string;
  
  // Električni denziometar
  elektricni_denziometar_kalibracija_od?: string;
  elektricni_denziometar_kalibracija_do?: string;
  
  // Mjerač provodljivosti
  mjerac_provodljivosti_kalibracija_od?: string;
  mjerac_provodljivosti_kalibracija_do?: string;
  
  // Mjerač otpora provoda
  mjerac_otpora_provoda_kalibracija_od?: string;
  mjerac_otpora_provoda_kalibracija_do?: string;
  
  // Moment ključ
  moment_kljuc_kalibracija_od?: string;
  moment_kljuc_kalibracija_do?: string;
  
  // Shal detector
  shal_detector_kalibracija_od?: string;
  shal_detector_kalibracija_do?: string;
  
  // Kalibraža vatro dojava
  kalibraza_vatro_dojava_od?: string;
  kalibraza_vatro_dojava_do?: string;
  
  // Kalibraža PP aparata
  kalibraza_pp_aparata_od?: string;
  kalibraza_pp_aparata_do?: string;
  
  // Stručne licence radnika
  strucne_licence_radnika_od?: string;
  strucne_licence_radnika_do?: string;
  
  // ADR dozvole za radnike
  adr_dozvole_radnika_od?: string;
  adr_dozvole_radnika_do?: string;
  
  // Mjerenje otpora uzemljenja
  mjerenje_otpora_uzemljenja_od?: string;
  mjerenje_otpora_uzemljenja_do?: string;
  
  // Vatro dojava
  vatro_dojava_od?: string;
  vatro_dojava_do?: string;
  
  // Ispitivanje elektro instalacija
  ispitivanje_elektro_instalacija_od?: string;
  ispitivanje_elektro_instalacija_do?: string;
  
  // Dodatne informacije
  napomene?: string;
  dokumenti_url?: string;
  kreiran: string;
  azuriran: string;
}

// Interface za kreiranje novog plana (bez id, kreiran, azuriran)
export interface CreatePlanKalibracijeRequest {
  naziv_opreme: string;
  vlasnik_opreme: string;
  mjesto_koristenja_opreme: string;
  identifikacijski_broj: string;
  
  // Svi kalibracije datumi (optional)
  volumetar_kalibracija_od?: string;
  volumetar_kalibracija_do?: string;
  glavni_volumetar_kalibracija_od?: string;
  glavni_volumetar_kalibracija_do?: string;
  manometri_kalibracija_od?: string;
  manometri_kalibracija_do?: string;
  crijevo_punjenje_kalibracija_od?: string;
  crijevo_punjenje_kalibracija_do?: string;
  glavni_manometar_kalibracija_od?: string;
  glavni_manometar_kalibracija_do?: string;
  termometar_kalibracija_od?: string;
  termometar_kalibracija_do?: string;
  hidrometar_kalibracija_od?: string;
  hidrometar_kalibracija_do?: string;
  elektricni_denziometar_kalibracija_od?: string;
  elektricni_denziometar_kalibracija_do?: string;
  mjerac_provodljivosti_kalibracija_od?: string;
  mjerac_provodljivosti_kalibracija_do?: string;
  mjerac_otpora_provoda_kalibracija_od?: string;
  mjerac_otpora_provoda_kalibracija_do?: string;
  moment_kljuc_kalibracija_od?: string;
  moment_kljuc_kalibracija_do?: string;
  shal_detector_kalibracija_od?: string;
  shal_detector_kalibracija_do?: string;
  kalibraza_vatro_dojava_od?: string;
  kalibraza_vatro_dojava_do?: string;
  kalibraza_pp_aparata_od?: string;
  kalibraza_pp_aparata_do?: string;
  strucne_licence_radnika_od?: string;
  strucne_licence_radnika_do?: string;
  adr_dozvole_radnika_od?: string;
  adr_dozvole_radnika_do?: string;
  mjerenje_otpora_uzemljenja_od?: string;
  mjerenje_otpora_uzemljenja_do?: string;
  vatro_dojava_od?: string;
  vatro_dojava_do?: string;
  ispitivanje_elektro_instalacija_od?: string;
  ispitivanje_elektro_instalacija_do?: string;
  napomene?: string;
}

// Interface za ažuriranje plana (sva polja optional)
export interface UpdatePlanKalibracijeRequest extends Partial<CreatePlanKalibracijeRequest> {}

// Status tipovi
export type PlanKalibracijeStatus = 'aktivan' | 'istekao' | 'uskoro_istice' | 'nepotpun';

// Interface za status informacije
export interface StatusInfo {
  status: PlanKalibracijeStatus;
  message: string;
  expiredInstruments: string[];
  expiringSoonInstruments: string[];
}

// Interface za plan sa status informacijama
export interface PlanKalibracijeSaStatusom extends PlanKalibracije {
  statusInfo: StatusInfo;
}

// Interface za API odgovor sa listom planova
export interface PlanKalibracijeListResponse {
  planovi: PlanKalibracijeSaStatusom[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    ukupno: number;
    aktivni: number;
    istekli: number;
    uskoro_isticu: number;
    nepotpuni: number;
  };
}

// Interface za search/filter parametre
export interface PlanKalibracijeSearchParams {
  search?: string;
  status?: PlanKalibracijeStatus | 'svi';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Interface za upload odgovor
export interface UploadDocumentResponse {
  message: string;
  dokumenti_url: string;
  plan: PlanKalibracije;
}

// Konstante za instrumente
export const INSTRUMENTI_LISTE = [
  { key: 'volumetar', label: 'Volumetar' },
  { key: 'glavni_volumetar', label: 'Glavni volumetar' },
  { key: 'manometri', label: 'Mjerači pritiska (manometri)' },
  { key: 'crijevo_punjenje', label: 'Crijevo za punjenje' },
  { key: 'glavni_manometar', label: 'Glavni manometar' },
  { key: 'termometar', label: 'Termometar' },
  { key: 'hidrometar', label: 'Hidrometar' },
  { key: 'elektricni_denziometar', label: 'Električni denziometar' },
  { key: 'mjerac_provodljivosti', label: 'Mjerač provodljivosti' },
  { key: 'mjerac_otpora_provoda', label: 'Mjerač otpora provoda' },
  { key: 'moment_kljuc', label: 'Moment ključ' },
  { key: 'shal_detector', label: 'Shal detector' },
  { key: 'kalibraza_vatro_dojava', label: 'Kalibraža vatro dojava' },
  { key: 'kalibraza_pp_aparata', label: 'Kalibraža PP aparata' },
  { key: 'strucne_licence_radnika', label: 'Stručne licence radnika' },
  { key: 'adr_dozvole_radnika', label: 'ADR dozvole za radnike' },
  { key: 'mjerenje_otpora_uzemljenja', label: 'Mjerenje otpora uzemljenja' },
  { key: 'vatro_dojava', label: 'Vatro dojava' },
  { key: 'ispitivanje_elektro_instalacija', label: 'Ispitivanje elektro instalacija' },
] as const;

// Status konstante sa bojama za UI
export const STATUS_CONFIG = {
  aktivan: {
    label: 'Aktivan',
    color: 'bg-green-100 text-green-800',
    icon: '🟢'
  },
  istekao: {
    label: 'Istekao',
    color: 'bg-red-100 text-red-800',
    icon: '🔴'
  },
  uskoro_istice: {
    label: 'Uskoro ističe',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '🟡'
  },
  nepotpun: {
    label: 'Nepotpun',
    color: 'bg-gray-100 text-gray-800',
    icon: '⚪'
  }
} as const;

// Form validation schema helpers
export const VALIDATION_MESSAGES = {
  required: 'Ovo polje je obavezno',
  invalidDate: 'Neispravnan format datuma',
  dateFromAfterTo: 'Datum "od" mora biti prije datuma "do"',
  uniqueId: 'Identifikacijski broj već postoji',
  invalidFile: 'Neispravna vrsta fajla'
} as const; 