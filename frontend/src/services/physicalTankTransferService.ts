import { fetchWithAuth } from '@/lib/apiService';

export interface PhysicalTankTransfer {
  id: number;
  from_tank_id: number;
  to_cistern_id: number;
  quantity_liters: number;
  quantity_kg: number;
  transfer_date: string;
  notes?: string;
  created_at: string;
  fromTank: {
    id: number;
    tank_name: string;
    tank_identifier: string;
  };
  toCistern: {
    id: number;
    cistern_identifier: string;
  };
}

export interface CreateTransferRequest {
  from_tank_id: number;
  to_cistern_id: number;
  to_sub_cistern_id?: number | null;
  quantity_liters: number;
  quantity_kg: number;
  transfer_date?: string;
  notes?: string;
}

export interface TransferFilters {
  from_tank_id?: number;
  to_cistern_id?: number;
  date_from?: string;
  date_to?: string;
}

class PhysicalTankTransferService {
  private baseUrl = '/api/physical-tank-transfers';

  // Get all transfers
  async getTransfers(filters?: TransferFilters): Promise<PhysicalTankTransfer[]> {
    const queryParams = new URLSearchParams();
    
    if (filters?.from_tank_id) {
      queryParams.append('from_tank_id', filters.from_tank_id.toString());
    }
    if (filters?.to_cistern_id) {
      queryParams.append('to_cistern_id', filters.to_cistern_id.toString());
    }
    if (filters?.date_from) {
      queryParams.append('date_from', filters.date_from);
    }
    if (filters?.date_to) {
      queryParams.append('date_to', filters.date_to);
    }

    const url = `${this.baseUrl}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const data = await fetchWithAuth<any[]>(url);
    
    // Map backend field names to frontend field names
    return data.map(transfer => ({
      ...transfer,
      from_tank_id: transfer.source_physical_tank_id,
      to_cistern_id: transfer.target_cistern_id,
      transfer_date: transfer.transfer_datetime,
      fromTank: transfer.sourceTank || null,
      toCistern: transfer.targetCistern || null
    }));
  }

  // Get transfer by ID
  async getTransferById(id: number): Promise<PhysicalTankTransfer> {
    return fetchWithAuth<PhysicalTankTransfer>(`${this.baseUrl}/${id}`);
  }

  // Create new transfer
  async createTransfer(transferData: CreateTransferRequest): Promise<{ message: string; transfer_id: number }> {
    // Map frontend field names to backend field names
    const backendData = {
      source_physical_tank_id: transferData.from_tank_id,
      target_cistern_id: transferData.to_cistern_id,
      target_sub_cistern_id: transferData.to_sub_cistern_id,
      quantity_liters: transferData.quantity_liters,
      quantity_kg: transferData.quantity_kg,
      transfer_datetime: transferData.transfer_date,
      notes: transferData.notes
    };
    
    return fetchWithAuth<{ message: string; transfer_id: number }>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
  }

  // Delete transfer (reverse)
  async deleteTransfer(id: number): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
  }
}

export const physicalTankTransferService = new PhysicalTankTransferService();

