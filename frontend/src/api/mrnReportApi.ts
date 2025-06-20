import axios from 'axios';
import { FuelIntakeRecord } from '../types/fuel';
import { FuelOperation, MrnReportBalance } from '../types/mrnReport';

/**
 * Interface for MRN Report API response
 */
interface MrnReportResponse {
  intake: FuelIntakeRecord;
  transactionHistory: FuelOperation[];
  drainedFuel: any[];
  balance: MrnReportBalance;
}

/**
 * Fetch all fuel intake records (MRN records)
 */
export const fetchMrnList = async (): Promise<FuelIntakeRecord[]> => {
  try {
    const response = await axios.get('/api/fuel-intake');
    return response.data;
  } catch (error) {
    console.error('Greška pri dohvaćanju MRN liste:', error);
    throw error;
  }
};

/**
 * Fetch detailed report data for a specific MRN
 */
export const fetchMrnReportData = async (mrnId: number): Promise<MrnReportResponse> => {
  try {
    const response = await axios.get(`/api/fuel-intake/${mrnId}/mrn-report`);
    
    return {
      intake: response.data.intake || {},
      transactionHistory: response.data.transactionHistory || [],
      drainedFuel: response.data.drainedFuel || [],
      balance: response.data.balance || {
        totalIntakeLiters: 0,
        totalOutflowLiters: 0,
        totalDrainedLiters: 0,
        remainingLiters: 0,
      },
    };
  } catch (error) {
    console.error('Greška pri dohvaćanju podataka za MRN izvještaj:', error);
    throw error;
  }
};
