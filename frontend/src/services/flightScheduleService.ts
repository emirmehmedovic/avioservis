/**
 * flightScheduleService.ts
 * API servis za upravljanje rasporedom letova
 */

const API_BASE_URL = '/api/flight-schedules';

// Tipovi
export interface FlightSchedule {
  id: number;
  airlineId: number;
  destination: string;
  flight_number?: string;
  scheduled_date: string;
  expected_operations: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  created_by?: number;
  is_deleted: boolean;
  airline: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    username: string;
  };
}

export interface CreateScheduleData {
  airlineId: number;
  destination: string;
  flight_number?: string;
  scheduled_date: string;
  expected_operations?: number;
  notes?: string;
}

export interface UpdateScheduleData {
  airlineId?: number;
  destination?: string;
  flight_number?: string;
  scheduled_date?: string;
  expected_operations?: number;
  notes?: string;
}

export interface ScheduleComparison {
  date: string;
  comparison: Array<{
    schedule: FlightSchedule;
    realized: {
      count: number;
      operations: Array<{
        id: number;
        dateTime: string;
        flight_number?: string;
        quantity_liters: number;
        operator_name: string;
      }>;
    };
    status: 'completed' | 'partial' | 'missing';
  }>;
  unscheduled: Array<{
    id: number;
    airline: {
      id: number;
      name: string;
    };
    destination: string;
    flight_number?: string;
    dateTime: string;
    quantity_liters: number;
    operator_name: string;
  }>;
  summary: {
    totalScheduled: number;
    totalCompleted: number;
    totalPartial: number;
    totalMissing: number;
    totalUnscheduled: number;
    totalOperations: number;
  };
}

export interface MonthScheduleData {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  dailyData: Array<{
    date: string;
    schedules: FlightSchedule[];
    operations: any[];
  }>;
  schedules: FlightSchedule[];
  operations: any[];
  stats: {
    totalSchedules: number;
    totalExpectedOperations: number;
    totalRealizedOperations: number;
    realizationRate: number;
  };
}

export interface PeriodStatistics {
  period: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  statistics: Array<{
    period: string;
    label: string;
    startDate: string;
    endDate: string;
    scheduled: number;
    realized: number;
    unplanned: number;
    realizationRate: number;
  }>;
}

/**
 * Helper funkcija za API pozive sa error handling
 */
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    let token = localStorage.getItem('authToken');
    
    if (!token) {
      token = localStorage.getItem('token');
    }
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options?.headers
      },
      ...options
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      if (response.status === 403) {
        throw new Error('You do not have permission to perform this action.');
      }
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('API call error:', error);
    throw error;
  }
}

/**
 * Dohvati sve rasporede sa filterima
 */
export async function getAllSchedules(filters?: {
  airlineId?: number;
  destination?: string;
  startDate?: string;
  endDate?: string;
}): Promise<FlightSchedule[]> {
  const params = new URLSearchParams();
  
  if (filters?.airlineId) params.append('airlineId', filters.airlineId.toString());
  if (filters?.destination) params.append('destination', filters.destination);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  
  const url = `${API_BASE_URL}?${params.toString()}`;
  return apiCall<FlightSchedule[]>(url);
}

/**
 * Dohvati pojedinačni raspored po ID
 */
export async function getScheduleById(id: number): Promise<FlightSchedule> {
  const url = `${API_BASE_URL}/${id}`;
  return apiCall<FlightSchedule>(url);
}

/**
 * Kreiraj novi raspored
 */
export async function createSchedule(data: CreateScheduleData): Promise<FlightSchedule> {
  return apiCall<FlightSchedule>(API_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Ažuriraj raspored
 */
export async function updateSchedule(id: number, data: UpdateScheduleData): Promise<FlightSchedule> {
  const url = `${API_BASE_URL}/${id}`;
  return apiCall<FlightSchedule>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Obriši raspored (soft delete)
 */
export async function deleteSchedule(id: number): Promise<{ message: string }> {
  const url = `${API_BASE_URL}/${id}`;
  return apiCall<{ message: string }>(url, {
    method: 'DELETE',
  });
}

/**
 * Dohvati komparaciju raspored vs realizovano za određeni datum
 */
export async function getScheduleComparison(date: string): Promise<ScheduleComparison> {
  const url = `${API_BASE_URL}/comparison/${date}`;
  return apiCall<ScheduleComparison>(url);
}

/**
 * Dohvati rasporede za cijeli mjesec sa komparacijom
 */
export async function getMonthSchedules(
  year: number, 
  month: number, 
  airlineId?: number
): Promise<MonthScheduleData> {
  const params = new URLSearchParams();
  if (airlineId) params.append('airlineId', airlineId.toString());
  
  const url = `${API_BASE_URL}/month/${year}/${month}?${params.toString()}`;
  return apiCall<MonthScheduleData>(url);
}

/**
 * Bulk create - kreiraj više rasporeda odjednom
 */
export async function createBulkSchedules(schedules: CreateScheduleData[]): Promise<FlightSchedule[]> {
  const results: FlightSchedule[] = [];
  
  for (const schedule of schedules) {
    try {
      const result = await createSchedule(schedule);
      results.push(result);
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  }
  
  return results;
}

/**
 * Preview CSV import
 */
export async function previewCSVImport(csvContent: string, importType: 'arrival' | 'departure' | 'both' = 'departure'): Promise<any> {
  return apiCall<any>(`${API_BASE_URL}/import/preview`, {
    method: 'POST',
    body: JSON.stringify({ csvContent, importType }),
  });
}

/**
 * Import schedules from CSV
 */
export async function importCSV(csvContent: string, importType: 'arrival' | 'departure' | 'both' = 'departure'): Promise<any> {
  return apiCall<any>(`${API_BASE_URL}/import`, {
    method: 'POST',
    body: JSON.stringify({ csvContent, importType }),
  });
}

/**
 * Download CSV template
 */
export async function downloadCSVTemplate(): Promise<Blob> {
  try {
    let token = localStorage.getItem('authToken');
    
    if (!token) {
      token = localStorage.getItem('token');
    }
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(`${API_BASE_URL}/import/template`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error: any) {
    console.error('Download template error:', error);
    throw error;
  }
}

/**
 * Bulk delete schedules
 */
export async function bulkDeleteSchedules(
  startDate?: string,
  endDate?: string,
  airlineId?: number
): Promise<{ message: string; count: number }> {
  return apiCall<{ message: string; count: number }>(`${API_BASE_URL}/bulk`, {
    method: 'DELETE',
    body: JSON.stringify({ startDate, endDate, airlineId }),
  });
}

/**
 * Get period statistics (weekly or monthly)
 */
export async function getStatistics(
  period: 'weekly' | 'monthly',
  startDate: string,
  endDate: string,
  airlineId?: number
): Promise<PeriodStatistics> {
  const params = new URLSearchParams();
  params.append('startDate', startDate);
  params.append('endDate', endDate);
  if (airlineId) params.append('airlineId', airlineId.toString());
  
  const url = `${API_BASE_URL}/statistics/${period}?${params.toString()}`;
  return apiCall<PeriodStatistics>(url);
}

