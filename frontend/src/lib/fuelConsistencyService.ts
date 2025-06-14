// Direktan import API_BASE_URL iz apiService.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Helper funkcija za dohvaćanje auth headera
function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Tipovi podataka za API komunikaciju
 */
export interface TankConsistencyResult {
  tankId: number;
  tankName: string;
  tankType: string;
  isConsistent: boolean;
  currentQuantityLiters: number;
  sumMrnQuantities: number;
  difference: number;
  lastCheck: string;
  recommendations?: string[];
}

export interface OverrideTokenResponse {
  success: boolean;
  token: string;
  expiresIn: number;
  message: string;
}

export interface ConsistencyCorrectionResponse {
  success: boolean;
  tankId: number;
  message: string;
}

/**
 * Servis za upravljanje konzistentnosti podataka o gorivu
 */
const fuelConsistencyService = {
  /**
   * Dohvaća stanje konzistentnosti za jedan tank
   * @param tankId ID tanka
   */
  async checkTankConsistency(tankId: number): Promise<TankConsistencyResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fuel-consistency/tanks/${tankId}`, {
        headers: getAuthHeader()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Neuspješno dohvaćanje konzistentnosti tanka');
      }
      
      const result = await response.json();
      // Provjeravamo strukturu odgovora - očekujemo direktno TankConsistencyResult ili objekt s data poljem
      return result.data ? result.data : result;
    } catch (error: any) {
      console.error('Greška pri dohvaćanju konzistentnosti tanka:', error);
      throw new Error(error.message || 'Neuspješno dohvaćanje konzistentnosti tanka');
    }
  },

  /**
   * Dohvaća stanje konzistentnosti za sve tankove
   */
  async checkAllTanksConsistency(): Promise<TankConsistencyResult[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fuel-consistency/tanks`, {
        headers: getAuthHeader()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Neuspješno dohvaćanje konzistentnosti tankova');
      }
      
      const result = await response.json();
      // Obradimo ugnijezdjenu strukturu odgovora s backend kontrolera
      if (Array.isArray(result)) {
        return result;
      } else if (result.data) {
        // Backend vraća strukturu { data: { all: [...], inconsistent: [...], consistent: [...] } }
        if (result.data.all && Array.isArray(result.data.all)) {
          return result.data.all;
        } else if (Array.isArray(result.data)) {
          return result.data;
        }
      } else if (result.results && Array.isArray(result.results)) {
        return result.results;
      } else if (result.tankConsistencyResults && Array.isArray(result.tankConsistencyResults)) {
        return result.tankConsistencyResults;
      }
      
      // Ako ne prepoznajemo strukturu, vraćamo prazan niz
      console.error('Nepoznata struktura odgovora:', result);
      return [];
    } catch (error: any) {
      console.error('Greška pri dohvaćanju konzistentnosti svih tankova:', error);
      throw new Error(error.message || 'Neuspješno dohvaćanje konzistentnosti tankova');
    }
  },

  /**
   * Korigira nekonzistentnost u tanku
   * @param tankId ID tanka
   * @param action Akcija korekcije ('ADJUST_TANK' ili 'ADJUST_MRN')
   * @param notes Bilješke o korekciji
   */
  async correctTankInconsistency(
    tankId: number, 
    action: 'adjustTank' | 'adjustMrn' | 'createBalancingMrn',
    notes?: string
  ): Promise<ConsistencyCorrectionResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/fuel-consistency/tanks/${tankId}/correct`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action, notes })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Neuspješna korekcija nekonzistentnosti tanka');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Greška pri korekciji nekonzistentnosti tanka:', error);
      throw new Error(error.message || 'Neuspješna korekcija nekonzistentnosti tanka');
    }
  },

  /**
   * Traži token za zaobilaženje provjere konzistentnosti
   * @param tankId ID tanka
   * @param operationType Tip operacije ('TRANSFER_IN', 'TRANSFER_OUT', 'DRAIN', itd.)
   * @param notes Razlog za zaobilaženje provjere
   */
  async requestOverrideToken(
    tankId: number,
    operationType: string,
    notes: string
  ): Promise<OverrideTokenResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/fuel-consistency/tanks/${tankId}/override`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ operationType, notes })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Neuspješan zahtjev za override token');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Greška pri zahtjevu za override token:', error);
      throw new Error(error.message || 'Neuspješan zahtjev za override token');
    }
  }
};

export default fuelConsistencyService;
