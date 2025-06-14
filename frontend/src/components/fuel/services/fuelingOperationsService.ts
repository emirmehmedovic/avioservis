import { fetchWithAuth } from '@/lib/apiService';
import dayjs from 'dayjs';
import { FuelingOperation, FuelingOperationsApiResponse, FuelTankFE, AirlineFE, ProjectionResult, TotalProjection, FuelProjectionPresetData, CalculatedResultsData, FullFuelProjectionPreset } from '../types';

/**
 * Fetch a single fueling operation by ID
 */
export const fetchFuelingOperation = async (id: number): Promise<FuelingOperation> => {
  try {
    const response = await fetchWithAuth(`/api/fuel/operations/${id}`);
    return response as FuelingOperation;
  } catch (error) {
    console.error('Error fetching fueling operation:', error);
    throw error;
  }
};



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
  selectedCurrency: string,
  deliveryVoucherFilter?: string // Added optional deliveryVoucherFilter
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
    if (deliveryVoucherFilter) {
      params.append('deliveryVoucher', deliveryVoucherFilter);
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
      
      // Ensure all operations have the delivery_note_number field
      const processedOperations = responseData.map(op => ({
        ...op,
        delivery_note_number: op.delivery_note_number || null
      }));
      
      // Calculate total liters from operations
      const total = processedOperations.reduce((sum, op: FuelingOperation) => sum + (op.quantity_liters || 0), 0);
      return { operations: processedOperations, totalLiters: total };
    } else if (responseData && typeof responseData === 'object' && 'operations' in responseData) {
      // Handle the case where the response matches FuelingOperationsApiResponse
      console.log('Response has operations property');
      const typedResponse = responseData as FuelingOperationsApiResponse;
      
      // Ensure all operations have the delivery_note_number field
      const processedOperations = typedResponse.operations.map(op => ({
        ...op,
        delivery_note_number: op.delivery_note_number || null
      }));
      
      return { 
        operations: processedOperations, 
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
    // Log the form data being sent for debugging purposes
    console.log('Form data being sent:');
    for (const pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }
    
    return await fetchWithAuth<FuelingOperation>('/api/fuel/fueling-operations', {
      method: 'POST',
      body: formData,
    });
  } catch (error: any) {
    console.error('Error adding fueling operation:', error);
    
    // Try to extract more detailed error information
    if (error.responseBody && error.responseBody.errors) {
      console.error('Validation errors:', error.responseBody.errors);
      const errorMessages = error.responseBody.errors.map((err: any) => {
        if (typeof err === 'object') {
          return Object.values(err).join(', ');
        }
        return err;
      }).join('; ');
      
      throw new Error(`Greška pri kreiranju operacije točenja: ${errorMessages}`);
    }
    
    throw error;
  }
};

/**
 * Delete a fueling operation
 */
export const deleteFuelingOperation = async (id: number): Promise<void> => {
  try {
    await fetchWithAuth<{ message: string }>(`/api/fuel/fueling-operations/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error(`Error deleting fueling operation with ID ${id}:`, error);
    throw error;
  }
};

// Interface for the data structure of a single row in the fuel projection preset


/**
 * Fetch the global fuel projection preset
 */
export const getGlobalFuelProjectionPreset = async (): Promise<FullFuelProjectionPreset | null> => {
  try {
    // Backend now returns the full preset object
    const preset = await fetchWithAuth<FullFuelProjectionPreset>('/api/fuel-projection-presets/default');
    // Ensure presetData is at least an empty array if preset is null or presetData is missing
    if (preset && !preset.presetData) {
      preset.presetData = [];
    }
    return preset;
  } catch (error) {
    console.error('Error fetching global fuel projection preset:', error);
    // Return a default structure in case of error, or rethrow if preferred
    // For now, returning null, which the component should handle
    return null;
  }
};

/**
 * Save/Update the global fuel projection preset
 */
export const saveGlobalFuelProjectionPreset = async (
  presetData: FuelProjectionPresetData[], 
  calculatedResultsData?: CalculatedResultsData | null
): Promise<void> => {
  try {
    const body: Partial<FullFuelProjectionPreset> = { presetData };
    if (calculatedResultsData !== undefined) { // Check for undefined to allow sending null
      body.calculatedResultsData = calculatedResultsData;
    }

    await fetchWithAuth('/api/fuel-projection-presets/default', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body), 
    });
  } catch (error) {
    console.error('Error saving global fuel projection preset:', error);
    throw error; 
  }
};
