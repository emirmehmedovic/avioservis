/**
 * reportService.ts
 * API servis za upravljanje izvještajima
 */

const API_BASE_URL = '/api/reports';

// Tipovi
export interface Report {
  id: number;
  title: string;
  template: 'daily' | 'weekly' | 'monthly' | 'comparison';
  period1_start: string;
  period1_end: string;
  period2_start?: string;
  period2_end?: string;
  generated_by: number;
  generated_at: string;
  access_token: string;
  is_public: boolean;
  generated_by_user?: {
    id: number;
    username: string;
  };
  _count?: {
    accesses: number;
  };
}

export interface GenerateReportData {
  period1_start: string;
  period1_end: string;
  period2_start?: string;
  period2_end?: string;
  airlineId?: number;
  destinationId?: string;
}

export interface ReportResponse {
  reportId: number;
  accessToken: string;
  title: string;
  template: string;
  url: string;
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
        const error = new Error('Authentication required. Please log in again.');
        (error as any).status = 401;
        throw error;
      }
      if (response.status === 403) {
        const error = new Error('You do not have permission to perform this action.');
        (error as any).status = 403;
        throw error;
      }
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('API call error:', error);
    throw error;
  }
}

/**
 * Generiši novi izvještaj
 */
export async function generateReport(data: GenerateReportData): Promise<ReportResponse> {
  return apiCall<ReportResponse>(`${API_BASE_URL}/generate`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Dohvati izvještaj po token-u
 */
export async function getReport(token: string): Promise<{
  success: boolean;
  data: {
    report: Report;
    reportData: any;
  };
  metadata: {
    accessedAt: string;
    accessedBy: string;
  };
}> {
  // Provjeri da li korisnik ima token
  let authToken = null;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  
  if (!authToken) {
    const error = new Error('Authentication required. Please log in again.');
    (error as any).status = 401;
    throw error;
  }
  
  return apiCall<any>(`${API_BASE_URL}/${token}`);
}

/**
 * Dohvati moje izvještaje
 */
export async function getMyReports(): Promise<Report[]> {
  const response = await apiCall<{
    success: boolean;
    data: Report[];
    metadata: {
      totalReports: number;
      generatedAt: string;
    };
  }>(`${API_BASE_URL}/my`);
  
  return response.data;
}

/**
 * Obriši izvještaj
 */
export async function deleteReport(id: number): Promise<{ success: boolean; message: string }> {
  return apiCall<{ success: boolean; message: string }>(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  });
}


