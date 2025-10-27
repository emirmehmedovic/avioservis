import { fetchWithAuth } from '@/lib/apiService';

export interface PhysicalCistern {
  id: number;
  cistern_identifier: string;
  capacity_liters: number;
  current_quantity_liters: number;
  current_quantity_kg: number;
  fuel_type: string;
  is_active: boolean;
  is_cumulative?: boolean;
  average_density?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCisternData {
  cistern_identifier: string;
  capacity_liters: number;
  fuel_type: string;
  is_active?: boolean;
  is_cumulative?: boolean;
}

export interface UpdateCisternData extends Partial<CreateCisternData> {}

export interface PhysicalCisternMrn {
  id: number;
  cistern_id: number;
  customs_declaration_number: string;
  quantity_liters: number;
  quantity_kg: number;
  remaining_quantity_liters: number;
  remaining_quantity_kg: number;
  density_at_intake: number;
  date_added: string;
  source_physical_tank_id?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CisternSummary {
  total_cisterns: number;
  total_capacity_liters: number;
  total_current_liters: number;
  total_current_kg: number;
  average_density: number;
  cisterns: PhysicalCistern[];
}

export interface ManualUpdateData {
  current_quantity_liters: number;
  current_quantity_kg: number;
  notes?: string;
}

class PhysicalCisternService {
  private baseUrl = '/api/physical-cisterns';

  // Get all physical cisterns
  async getAllCisterns(): Promise<PhysicalCistern[]> {
    return fetchWithAuth<PhysicalCistern[]>(this.baseUrl);
  }

  // Get cistern by ID
  async getCisternById(id: number): Promise<PhysicalCistern> {
    return fetchWithAuth<PhysicalCistern>(`${this.baseUrl}/${id}`);
  }

  // Create new cistern
  async createCistern(cisternData: CreateCisternData): Promise<PhysicalCistern> {
    return fetchWithAuth<PhysicalCistern>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(cisternData),
    });
  }

  // Update cistern
  async updateCistern(id: number, cisternData: UpdateCisternData): Promise<PhysicalCistern> {
    return fetchWithAuth<PhysicalCistern>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cisternData),
    });
  }

  // Delete cistern (soft delete)
  async deleteCistern(id: number): Promise<void> {
    return fetchWithAuth<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
  }

  // Get cistern MRN breakdown
  async getCisternMrnBreakdown(id: number): Promise<PhysicalCisternMrn[]> {
    return fetchWithAuth<PhysicalCisternMrn[]>(`${this.baseUrl}/${id}/mrn-breakdown`);
  }

  // Get cisterns summary
  async getCisternsSummary(): Promise<CisternSummary> {
    return fetchWithAuth<CisternSummary>(`${this.baseUrl}/summary`);
  }

  // Manual update cistern quantities
  async manualUpdateCistern(id: number, updateData: ManualUpdateData): Promise<PhysicalCistern> {
    return fetchWithAuth<PhysicalCistern>(`${this.baseUrl}/${id}/manual-update`, {
      method: 'POST',
      body: JSON.stringify(updateData),
    });
  }
}

export const physicalCisternService = new PhysicalCisternService();


