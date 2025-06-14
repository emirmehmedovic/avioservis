import { fetchWithAuth } from './apiService';
import { ValveTestRecord, CreateValveTestRecordPayload } from '@/types/valve';

const API_BASE_URL = '/api/valve-tests';

// Get all valve test records for a specific vehicle
export const getValveTestRecords = async (vehicleId: string | number): Promise<ValveTestRecord[]> => {
  const response = await fetchWithAuth<ValveTestRecord[]>(`${API_BASE_URL}/vehicle/${vehicleId}`);
  return response;
};

// Get a specific valve test record by ID
export const getValveTestRecordById = async (id: string | number): Promise<ValveTestRecord> => {
  const response = await fetchWithAuth<ValveTestRecord>(`${API_BASE_URL}/${id}`);
  return response;
};

// Create a new valve test record
export const createValveTestRecord = async (data: CreateValveTestRecordPayload): Promise<ValveTestRecord> => {
  const response = await fetchWithAuth<ValveTestRecord>(API_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response;
};

// Update an existing valve test record
export const updateValveTestRecord = async (id: string | number, data: Partial<CreateValveTestRecordPayload>): Promise<ValveTestRecord> => {
  const response = await fetchWithAuth<ValveTestRecord>(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response;
};

// Delete a valve test record
export const deleteValveTestRecord = async (id: string | number): Promise<void> => {
  await fetchWithAuth(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  });
};
