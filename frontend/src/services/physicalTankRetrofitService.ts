import { fetchWithAuth } from '@/lib/apiService';

export interface FuelIntakeRecord {
  id: number;
  customs_declaration_number: string;
  fuel_type: string;
  intake_datetime: string;
  quantity_liters_received: number;
  quantity_kg_received: string;
  specific_gravity: number;
  refinery_name: string;
  supplier_name: string;
  delivery_vehicle_plate: string;
  delivery_vehicle_driver_name: string;
  delivery_note_number: string;
  total_price: number;
  currency: string;
  price_per_kg: number;
  fuel_category: string;
  physical_tank_distribution: any;
  createdAt: string;
  updatedAt: string;
}

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
  createdAt: string;
  updatedAt: string;
}

export interface RetrofitPreview {
  existing_mrn_records: Array<{
    customs_declaration_number: string;
    fuel_type: string;
    date_added: string;
    density_at_intake: number;
    total_liters: number;
    total_kg: number;
    supplier_name: string;
    records: FuelIntakeRecord[];
  }>;
  physical_tanks: PhysicalTank[];
  total_available_liters: number;
  total_available_kg: number;
}

export interface ExecuteRetrofitRequest {
  customs_declaration_number: string;
  fuel_type: string;
  distribution: Array<{
    tank_id: number;
    quantity_liters: number;
    quantity_kg: number;
  }>;
}

export interface RetrofitStatus {
  tank_id: number;
  tank_name: string;
  total_mrn_records: number;
  total_liters: number;
  total_kg: number;
  records: Array<{
    customs_declaration_number: string;
    date_added: string;
    quantity_liters: number;
    quantity_kg: number;
    density_at_intake: number;
    is_retrofitted: boolean;
  }>;
}

class PhysicalTankRetrofitService {
  private baseUrl = '/api/physical-tanks/retrofit';

  /**
   * Get preview of available MRN records for retrofit
   */
  async getRetrofitPreview(fuel_type?: string): Promise<RetrofitPreview> {
    const params = new URLSearchParams();
    if (fuel_type && fuel_type !== 'all') {
      params.append('fuel_type', fuel_type);
    }
    const url = params.toString() ? `${this.baseUrl}/preview?${params.toString()}` : `${this.baseUrl}/preview`;
    return fetchWithAuth<RetrofitPreview>(url);
  }

  /**
   * Execute retrofit operation
   */
  async executeRetrofit(data: ExecuteRetrofitRequest): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`${this.baseUrl}/execute`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get retrofit status for a specific tank
   */
  async getRetrofitStatus(tankId: number): Promise<RetrofitStatus> {
    return fetchWithAuth<RetrofitStatus>(`${this.baseUrl}/status/${tankId}`);
  }
}

export const physicalTankRetrofitService = new PhysicalTankRetrofitService();
