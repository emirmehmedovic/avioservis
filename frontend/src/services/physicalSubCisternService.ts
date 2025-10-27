import { fetchWithAuth } from '@/lib/apiService';

export interface SubCistern {
  id: number;
  parent_cistern_id: number;
  sub_cistern_name: string;
  capacity_liters: number;
  current_quantity_liters: number;
  current_quantity_kg: number;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubCisternDto {
  parent_cistern_id: number;
  sub_cistern_name: string;
  capacity_liters: number;
}

export interface UpdateSubCisternDto {
  sub_cistern_name?: string;
  capacity_liters?: number;
  is_active?: boolean;
}

export interface ManualUpdateSubCisternData {
  current_quantity_liters: number;
  current_quantity_kg: number;
  notes?: string;
}

export interface TransferBetweenSubCisternsData {
  source_sub_cistern_id: number;
  destination_sub_cistern_id: number;
  quantity_liters: number;
  quantity_kg: number;
  notes?: string;
}

export const physicalSubCisternService = {
  /**
   * Get all sub-cisterns
   */
  async getAllSubCisterns(): Promise<SubCistern[]> {
    // Note: This endpoint might need to be created in the backend
    // For now, return empty array
    return fetchWithAuth<SubCistern[]>('/api/physical-sub-cisterns').catch(() => []);
  },

  /**
   * Get all sub-cisterns for a parent cistern
   */
  async getSubCisterns(parentCisternId: number): Promise<SubCistern[]> {
    return fetchWithAuth<SubCistern[]>(`/api/physical-sub-cisterns/${parentCisternId}`);
  },

  /**
   * Create sub-cisterns for a cumulative cistern
   */
  async createSubCisterns(cisternId: number, subCisterns: CreateSubCisternDto[]): Promise<void> {
    await fetchWithAuth<{ message: string }>('/api/physical-sub-cisterns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cisternId,
        subCisterns
      }),
    });
  },

  /**
   * Update sub-cistern configuration
   */
  async updateSubCistern(subCisternId: number, data: UpdateSubCisternDto): Promise<void> {
    await fetchWithAuth<{ message: string }>(`/api/physical-sub-cisterns/${subCisternId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Manual update of sub-cistern quantities (reconciliation)
   */
  async manualUpdate(subCisternId: number, data: ManualUpdateSubCisternData): Promise<void> {
    await fetchWithAuth<{ message: string }>(`/api/physical-sub-cisterns/${subCisternId}/manual-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Transfer fuel between sub-cisterns
   */
  async transferBetweenSubCisterns(data: TransferBetweenSubCisternsData): Promise<void> {
    await fetchWithAuth<{ message: string }>('/api/physical-sub-cisterns/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete sub-cistern
   */
  async deleteSubCistern(subCisternId: number): Promise<void> {
    await fetchWithAuth<{ message: string }>(`/api/physical-sub-cisterns/${subCisternId}`, {
      method: 'DELETE',
    });
  }
};
