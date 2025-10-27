import { fetchWithAuth } from '@/lib/apiService';

export interface PhysicalTank {
  id: number;
  tank_name: string;
  tank_identifier: string;
  capacity_liters: number;
  current_quantity_liters: number;
  current_quantity_kg: number;
  fuel_type: string;
  location_description?: string;
  display_order: number;
  is_active: boolean;
  average_density?: number;
  last_fuel_intake_date?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTankData {
  tank_name: string;
  tank_identifier: string;
  capacity_liters: number;
  fuel_type: string;
  location_description?: string;
}

export interface UpdateTankData extends Partial<CreateTankData> {}

export interface PhysicalTankMrn {
  id: number;
  physical_tank_id: number;
  customs_declaration_number: string;
  quantity_liters: number;
  quantity_kg: number;
  remaining_quantity_liters: number;
  remaining_quantity_kg: number;
  density_at_intake: number;
  date_added: string;
  fuel_intake_record_id?: number;
  is_retrofitted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TankMrnBreakdown {
  mrn_records: PhysicalTankMrn[];
  summary: {
    total_liters: number;
    total_kg: number;
    remaining_liters: number;
    remaining_kg: number;
    average_density: number;
    record_count: number;
  };
}

export interface PhysicalTankSummary {
  total_tanks: number;
  total_capacity_liters: number;
  total_current_liters: number;
  total_current_kg: number;
  average_density: number;
  tanks: PhysicalTank[];
}

export interface ManualUpdateData {
  measured_liters: number;
  measured_kg: number;
  notes?: string;
}

class PhysicalTankService {
  private baseUrl = '/api/physical-tanks';

  // Get all physical tanks
  async getAllTanks(): Promise<PhysicalTank[]> {
    return fetchWithAuth<PhysicalTank[]>(this.baseUrl);
  }

  // Get tank by ID
  async getTankById(id: number): Promise<PhysicalTank> {
    return fetchWithAuth<PhysicalTank>(`${this.baseUrl}/${id}`);
  }

  // Create new tank
  async createTank(tankData: CreateTankData): Promise<PhysicalTank> {
    return fetchWithAuth<PhysicalTank>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(tankData),
    });
  }

  // Update tank
  async updateTank(id: number, tankData: UpdateTankData): Promise<PhysicalTank> {
    return fetchWithAuth<PhysicalTank>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tankData),
    });
  }

  // Delete tank (soft delete)
  async deleteTank(id: number): Promise<void> {
    return fetchWithAuth<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
  }

  // Get tank MRN breakdown
  async getTankMrnBreakdown(id: number): Promise<TankMrnBreakdown> {
    return fetchWithAuth<TankMrnBreakdown>(`${this.baseUrl}/${id}/mrn-breakdown`);
  }

  // Get tanks summary
  async getTanksSummary(): Promise<PhysicalTankSummary> {
    return fetchWithAuth<PhysicalTankSummary>(`${this.baseUrl}/summary`);
  }

  // Manual update tank quantities
  async manualUpdateTank(id: number, updateData: ManualUpdateData): Promise<PhysicalTank> {
    return fetchWithAuth<PhysicalTank>(`${this.baseUrl}/${id}/manual-update`, {
      method: 'POST',
      body: JSON.stringify(updateData),
    });
  }

  // Get tank transfer history
  async getTankTransferHistory(tankId: number): Promise<any[]> {
    return fetchWithAuth<any[]>(`/api/physical-tank-transfers?from_tank_id=${tankId}`);
  }
}

export const physicalTankService = new PhysicalTankService();
