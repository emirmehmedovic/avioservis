export interface Airline {
  id: number;
  name: string;
  contact_details?: string | null;
  taxId?: string | null;
  address?: string | null;
  isForeign?: boolean;
  operatingDestinations?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Document {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedAt: string;
  fuelReceiptId?: number | null;
  fuelingOperationId?: number | null;
}

export interface Tank {
  id: number;
  identifier: string;
  name: string;
  location?: string;
  capacity_liters?: number;
  current_liters?: number;
  fuel_type: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FuelOperation {
  id: number;
  dateTime: string;
  aircraftId?: number | null;
  aircraft_registration?: string | null;
  airlineId?: number | null;
  airline?: Airline | null;
  destination?: string | null;
  quantity_liters: number;
  specific_density?: number; // Gustoća goriva
  quantity_kg?: number; // Količina u kilogramima
  price_per_kg?: number; // Cijena po kilogramu
  currency?: string; // Valuta (BAM, EUR, USD, itd.)
  total_amount?: number; // Ukupan iznos
  tankId?: number | null; // ID izvora goriva (fiksnog ili mobilnog tanka)
  tank?: Tank | null; // Tank object with details
  documents?: Document[]; // Dokumenti povezani s operacijom
  flight_number?: string | null;
  operator_name?: string | null;
  notes?: string | null;
  tip_saobracaja?: string | null; // Npr. 'Izvoz', 'Unutarnji saobraćaj'
  createdAt?: string;
  updatedAt?: string;
  delivery_note_number?: string | null; // Broj dostavnice
  mrnBreakdown?: string | null; // JSON string s MRN podacima
  parsedMrnBreakdown?: { mrn: string, quantity: number, quantity_kg?: number | null }[] | null; // Parsirani MRN podaci

  // Polja koja trenutno nedostaju u API odgovoru, ali mogu biti korisna
  fuel_type?: string | null; 
  document_url?: string | null; // URL do zakačenog dokumenta
  source_tank_name?: string | null; // Detaljnije ime izvornog tanka
  tank_identifier?: string | null; // Identifier for the fuel tank
  tank_name?: string | null; // Name of the fuel tank
}

// Ovdje možete dodati i druge tipove koje koristite kroz aplikaciju
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string; // Npr. ADMIN, KONTROLA, USER
  // Dodajte ostala polja po potrebi, npr. token ako ga ovdje čuvate
}

export interface LoginResponse {
  token: string;
  user: User;
}
