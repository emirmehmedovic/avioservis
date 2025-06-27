export interface Rezervoar {
  id: number;
  naziv_rezervoara: string;
  mjesto_koristenja: string;
  id_broj: string;
  vlasnik: string;
  oblik_rezervoara: string;
  kapacitet: number;
  materijal_izgradnje: string;
  zastita_unutrasnjeg_rezervoara: string;
  datum_kalibracije: string;
  dimenzije_l: number;
  dimenzije_w: number;
  dimenzije_h: number;
  napomene?: string;
  dokument_url?: string;
  kreiran: string;
  azuriran: string;
}

export interface CreateRezervoarRequest {
  naziv_rezervoara: string;
  mjesto_koristenja: string;
  id_broj: string;
  vlasnik: string;
  oblik_rezervoara: string;
  kapacitet: number;
  materijal_izgradnje: string;
  zastita_unutrasnjeg_rezervoara: string;
  datum_kalibracije: string;
  dimenzije_l: number;
  dimenzije_w: number;
  dimenzije_h: number;
  napomene?: string;
  dokument?: File;
}

export interface UpdateRezervoarRequest {
  naziv_rezervoara: string;
  mjesto_koristenja: string;
  id_broj: string;
  vlasnik: string;
  oblik_rezervoara: string;
  kapacitet: number;
  materijal_izgradnje: string;
  zastita_unutrasnjeg_rezervoara: string;
  datum_kalibracije: string;
  dimenzije_l: number;
  dimenzije_w: number;
  dimenzije_h: number;
  napomene?: string;
  dokument?: File;
}

// Options za oblik rezervoara
export const OBLICI_REZERVOARA = [
  { value: 'cilindrični', label: 'Cilindrični' },
  { value: 'kockast', label: 'Kockast' },
  { value: 'sferični', label: 'Sferični' },
  { value: 'eliptični', label: 'Eliptični' },
  { value: 'horizontalni', label: 'Horizontalni' },
  { value: 'vertikalni', label: 'Vertikalni' },
] as const; 