export interface ReserveFuelItem {
  id: number;
  tank_id: number;
  tank_type: 'fixed' | 'mobile';
  quantity_liters: number;
  notes?: string | null;
  is_dispensed: boolean;
  dispensed_at?: Date | string | null;
  dispensed_by_user_id?: number | null;
  dispensed_notes?: string | null;
  reference_operation_id?: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ReserveFuelSummary {
  totalAvailableLiters: number;
  recordCount: number;
  availableRecordCount: number;
}

export interface ReserveFuelResponse {
  success: boolean;
  data: ReserveFuelItem[];
  summary: ReserveFuelSummary;
}
