import {
  PlanKalibracije,
  PlanKalibracijeSaStatusom,
  PlanKalibracijeListResponse,
  CreatePlanKalibracijeRequest,
  UpdatePlanKalibracijeRequest,
  PlanKalibracijeSearchParams,
  UploadDocumentResponse
} from '../types/planKalibracije';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const API_ENDPOINT = `${API_BASE_URL}/api/plan-kalibracije`;

// Helper funkcija za API pozive
const apiCall = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = localStorage.getItem('token');
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Service klasa za Plan Kalibracije
class PlanKalibracijeService {
  
  /**
   * Dohvaća sve planove kalibracije sa opcionalnim search/filter parametrima
   */
  async getAllPlanKalibracije(params: PlanKalibracijeSearchParams = {}): Promise<PlanKalibracijeListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const url = `${API_ENDPOINT}?${searchParams.toString()}`;
    return apiCall<PlanKalibracijeListResponse>(url);
  }

  /**
   * Dohvaća plan kalibracije po ID-u
   */
  async getPlanKalibracijeById(id: number): Promise<PlanKalibracijeSaStatusom> {
    const url = `${API_ENDPOINT}/${id}`;
    return apiCall<PlanKalibracijeSaStatusom>(url);
  }

  /**
   * Kreira novi plan kalibracije
   */
  async createPlanKalibracije(data: CreatePlanKalibracijeRequest): Promise<PlanKalibracijeSaStatusom> {
    return apiCall<PlanKalibracijeSaStatusom>(API_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Ažurira postojeći plan kalibracije
   */
  async updatePlanKalibracije(id: number, data: UpdatePlanKalibracijeRequest): Promise<PlanKalibracijeSaStatusom> {
    const url = `${API_ENDPOINT}/${id}`;
    return apiCall<PlanKalibracijeSaStatusom>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Briše plan kalibracije
   */
  async deletePlanKalibracije(id: number): Promise<{ message: string }> {
    const url = `${API_ENDPOINT}/${id}`;
    return apiCall<{ message: string }>(url, {
      method: 'DELETE',
    });
  }

  /**
   * Upload dokumenta za plan kalibracije
   */
  async uploadDocument(id: number, file: File): Promise<UploadDocumentResponse> {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('document', file);

    const url = `${API_ENDPOINT}/${id}/upload`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Generira i downloaduje PDF izvještaj za plan kalibracije
   */
  async generatePDF(id: number): Promise<Blob> {
    const token = localStorage.getItem('token');
    const url = `${API_ENDPOINT}/${id}/pdf`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `PDF generation failed: ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Helper metoda za downloadovanje PDF-a sa automatskim filename
   */
  async downloadPDF(id: number, planNaziv?: string): Promise<void> {
    try {
      const pdfBlob = await this.generatePDF(id);
      
      // Kreiranje download linka
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generiranje filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = planNaziv 
        ? `plan_kalibracije_${planNaziv.replace(/\s+/g, '_')}_${timestamp}.pdf`
        : `plan_kalibracije_${id}_${timestamp}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Greška pri download-u PDF-a:', error);
      throw error;
    }
  }

  /**
   * Generira i downloaduje ukupni PDF izvještaj za više planova kalibracije
   */
  async generateFullReport(planIds: number[]): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_ENDPOINT}/full-report`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ planIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Full report generation failed: ${response.status}`);
      }

      const pdfBlob = await response.blob();
      
      // Kreiranje download linka
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Generiranje filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `ukupni_izvjestaj_plan_kalibracije_${timestamp}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Greška pri generiranju ukupnog izvještaja:', error);
      throw error;
    }
  }

  /**
   * Validacija datuma - provjerava da li je "od" datum prije "do" datuma
   */
  validateDateRange(odDatum?: string, doDatum?: string): boolean {
    if (!odDatum || !doDatum) return true; // Ako jedan od datuma nije postavljen, ne validiramo
    
    const od = new Date(odDatum);
    const do_ = new Date(doDatum);
    
    return od <= do_;
  }

  /**
   * Helper metoda za provjeru da li je plan aktivan/istekao/uskoro ističe
   */
  calculateStatus(plan: PlanKalibracije): {
    status: 'aktivan' | 'istekao' | 'uskoro_istice' | 'nepotpun';
    expiredInstruments: string[];
    expiringSoonInstruments: string[];
  } {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const instruments = [
      { name: 'Volumetar', date: plan.volumetar_kalibracija_do },
      { name: 'Glavni volumetar', date: plan.glavni_volumetar_kalibracija_do },
      { name: 'Manometri', date: plan.manometri_kalibracija_do },
      { name: 'Crijevo za punjenje', date: plan.crijevo_punjenje_kalibracija_do },
      { name: 'Glavni manometar', date: plan.glavni_manometar_kalibracija_do },
      { name: 'Termometar', date: plan.termometar_kalibracija_do },
      { name: 'Hidrometar', date: plan.hidrometar_kalibracija_do },
      { name: 'Električni denziometar', date: plan.elektricni_denziometar_kalibracija_do },
      { name: 'Mjerač provodljivosti', date: plan.mjerac_provodljivosti_kalibracija_do },
      { name: 'Mjerač otpora provoda', date: plan.mjerac_otpora_provoda_kalibracija_do },
      { name: 'Moment ključ', date: plan.moment_kljuc_kalibracija_do },
      { name: 'Shal detector', date: plan.shal_detector_kalibracija_do },
    ];

    const expiredInstruments: string[] = [];
    const expiringSoonInstruments: string[] = [];
    let hasValidDates = false;

    instruments.forEach(instrument => {
      if (instrument.date) {
        hasValidDates = true;
        const expiryDate = new Date(instrument.date);
        
        if (expiryDate < today) {
          expiredInstruments.push(instrument.name);
        } else if (expiryDate <= thirtyDaysFromNow) {
          expiringSoonInstruments.push(instrument.name);
        }
      }
    });

    if (!hasValidDates) {
      return {
        status: 'nepotpun',
        expiredInstruments,
        expiringSoonInstruments
      };
    }

    if (expiredInstruments.length > 0) {
      return {
        status: 'istekao',
        expiredInstruments,
        expiringSoonInstruments
      };
    }

    if (expiringSoonInstruments.length > 0) {
      return {
        status: 'uskoro_istice',
        expiredInstruments,
        expiringSoonInstruments
      };
    }

    return {
      status: 'aktivan',
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  /**
   * Helper metoda za formatiranje datuma za UI
   */
  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('bs-BA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Neispravni datum';
    }
  }

  /**
   * Helper metoda za formatiranje datuma za input polja
   */
  formatDateForInput(dateString?: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return '';
    }
  }
}

// Eksportiranje singleton instance
export const planKalibracijeService = new PlanKalibracijeService();
export default planKalibracijeService; 