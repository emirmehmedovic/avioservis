import { fetchWithAuth } from '@/lib/apiService';
import dayjs from 'dayjs';
import { FuelingOperation, FuelingOperationsApiResponse, FuelTankFE, AirlineFE } from '../types';

/**
 * Fetch fueling operations with optional filters
 */
export const fetchOperations = async (
  startDate: string | null,
  endDate: string | null,
  selectedAirline: string,
  selectedDestination: string,
  selectedTank: string,
  selectedTrafficType: string,
  selectedCurrency: string
): Promise<{ operations: FuelingOperation[], totalLiters: number }> => {
  try {
    let url = '/api/fuel/fueling-operations';
    const params = new URLSearchParams();
    
    if (startDate) {
      params.append('startDate', dayjs(startDate).startOf('day').toISOString());
    }
    if (endDate) {
      params.append('endDate', dayjs(endDate).endOf('day').toISOString());
    }
    if (selectedAirline) {
      params.append('airlineId', selectedAirline);
    }
    if (selectedDestination) {
      params.append('destination', selectedDestination);
    }
    if (selectedTank) {
      params.append('tankId', selectedTank);
    }
    if (selectedTrafficType) {
      params.append('tip_saobracaja', selectedTrafficType);
    }
    if (selectedCurrency) {
      params.append('currency', selectedCurrency);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    console.log('Fetching operations from URL:', url);
    
    // Use fetchWithAuth to make the API request
    const responseData = await fetchWithAuth<FuelingOperation[] | FuelingOperationsApiResponse>(url);
    
    // Check if the response is an array (direct operations) or has an operations property
    if (Array.isArray(responseData)) {
      console.log('Response is an array with', responseData.length, 'operations');
      // Calculate total liters from operations
      const total = responseData.reduce((sum, op) => sum + (op.quantity_liters || 0), 0);
      return { operations: responseData, totalLiters: total };
    } else if (responseData && typeof responseData === 'object' && 'operations' in responseData) {
      // Handle the case where the response matches FuelingOperationsApiResponse
      console.log('Response has operations property');
      const typedResponse = responseData as FuelingOperationsApiResponse;
      return { 
        operations: typedResponse.operations, 
        totalLiters: typedResponse.totalLiters 
      };
    } else {
      console.error('Unexpected response format:', responseData);
      return { operations: [], totalLiters: 0 };
    }
  } catch (error) {
    console.error("Failed to fetch fueling operations:", error);
    throw error;
  }
};

/**
 * Fetch fuel tanks
 */
export const fetchTanks = async (): Promise<FuelTankFE[]> => {
  try {
    return await fetchWithAuth<FuelTankFE[]>('/api/fuel/tanks');
  } catch (error) {
    console.error('Error fetching tanks:', error);
    throw error;
  }
};

/**
 * Fetch airlines
 */
export const fetchAirlines = async (): Promise<AirlineFE[]> => {
  try {
    return await fetchWithAuth<AirlineFE[]>('/api/fuel/airlines');
  } catch (error) {
    console.error('Error fetching airlines:', error);
    throw error;
  }
};

/**
 * Add a new fueling operation
 */
export const addFuelingOperation = async (formData: FormData): Promise<FuelingOperation> => {
  try {
    return await fetchWithAuth<FuelingOperation>('/api/fuel/fueling-operations', {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    console.error('Error adding fueling operation:', error);
    throw error;
  }
};
