/**
 * analyticsApiService.ts
 * API servis za analitiku i komparacije
 */

const API_BASE_URL = '/api/analytics/comparison';

// Tipovi za API pozive
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  metadata?: any;
  error?: string;
}

// Cache za API pozive
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minuta

/**
 * Helper funkcija za API pozive sa error handling
 */
async function apiCall<T>(url: string, options?: RequestInit, cacheTTL = DEFAULT_CACHE_TTL): Promise<T> {
  const cacheKey = `${url}_${JSON.stringify(options)}`;
  
  // Provjeri cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  
  try {
    // Check both possible token storage locations (same as other services)
    let token = localStorage.getItem('authToken');
    
    // If token not found in 'authToken', try 'token' as fallback
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
      // Handle authentication/authorization errors
      if (response.status === 401 || response.status === 403) {
        console.error('Authentication/authorization error:', response.status);
        // Clear tokens and redirect to login if needed
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      throw new Error(`API poziv neuspješan: ${response.status} ${response.statusText}`);
    }
    
    const result: ApiResponse<T> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API poziv neuspješan');
    }
    
    // Spremi u cache
    cache.set(cacheKey, {
      data: result.data,
      timestamp: Date.now(),
      ttl: cacheTTL
    });
    
    return result.data;
  } catch (error) {
    console.error('API poziv greška:', error);
    throw error;
  }
}

/**
 * Dohvati cached analitiku za dashboard
 */
export async function getCachedAnalytics() {
  return apiCall(`${API_BASE_URL}/cached`, undefined, 2 * 60 * 1000); // 2 minute cache
}

/**
 * Generiraj sedmičnu komparaciju
 */
export async function getWeeklyComparison(date?: string) {
  const params = date ? `?date=${date}` : '';
  return apiCall(`${API_BASE_URL}/weekly${params}`);
}

/**
 * Generiraj mjesečnu komparaciju
 */
export async function getMonthlyComparison(date?: string) {
  const params = date ? `?date=${date}` : '';
  return apiCall(`${API_BASE_URL}/monthly${params}`);
}

/**
 * Generiraj godišnju komparaciju
 */
export async function getYearlyComparison(year?: number) {
  const params = year ? `?year=${year}` : '';
  return apiCall(`${API_BASE_URL}/yearly${params}`);
}

/**
 * Generiraj custom komparaciju
 */
export async function getCustomComparison(
  currentPeriod: DateRange,
  previousPeriod: DateRange,
  analysisType: 'destinations' | 'airlines' | 'market-share' = 'destinations'
) {
  return apiCall(`${API_BASE_URL}/custom`, {
    method: 'POST',
    body: JSON.stringify({
      currentPeriod,
      previousPeriod,
      analysisType
    })
  });
}

/**
 * Generiraj detaljnu komparaciju aviokompanija
 */
export async function getAirlineComparison(
  currentPeriod: DateRange,
  previousPeriod: DateRange,
  airlineIds?: number[]
) {
  return apiCall(`${API_BASE_URL}/airlines`, {
    method: 'POST',
    body: JSON.stringify({
      currentPeriod,
      previousPeriod,
      airlineIds
    })
  });
}

/**
 * Dohvati sedmične trendove
 */
export async function getWeeklyTrends(startDate: string, endDate: string) {
  return apiCall(`${API_BASE_URL}/trends/weekly?startDate=${startDate}&endDate=${endDate}`);
}

/**
 * Dohvati mjesečne trendove
 */
export async function getMonthlyTrends(startDate: string, endDate: string) {
  return apiCall(`${API_BASE_URL}/trends/monthly?startDate=${startDate}&endDate=${endDate}`);
}

/**
 * Dohvati year-over-year trendove
 */
export async function getYearOverYearTrends(year?: number) {
  const params = year ? `?year=${year}` : '';
  return apiCall(`${API_BASE_URL}/trends/year-over-year${params}`);
}

/**
 * Dohvati sezonske obrasce
 */
export async function getSeasonalPatterns(startDate: string, endDate: string) {
  return apiCall(`${API_BASE_URL}/trends/seasonal?startDate=${startDate}&endDate=${endDate}`);
}

/**
 * Detekcija anomalija
 */
export async function detectAnomalies(
  currentPeriod: DateRange,
  previousPeriod: DateRange
) {
  return apiCall(`${API_BASE_URL}/anomalies`, {
    method: 'POST',
    body: JSON.stringify({
      currentPeriod,
      previousPeriod
    })
  }, 1 * 60 * 1000); // 1 minuta cache za anomalije
}

/**
 * Dohvati listu aviokompanija
 */
export async function getAirlines() {
  return apiCall(`${API_BASE_URL}/airlines`, undefined, 10 * 60 * 1000); // 10 minuta cache
}

/**
 * Dohvati listu destinacija (opcionalno filtrirane po aviokompaniji)
 */
export async function getDestinations(airlineId?: number) {
  const params = airlineId ? `?airlineId=${airlineId}` : '';
  return apiCall(`${API_BASE_URL}/destinations${params}`, undefined, 10 * 60 * 1000); // 10 minuta cache
}

/**
 * Komparacija po aviokompaniji i/ili destinaciji
 */
export async function getAirlineDestinationComparison(
  currentPeriod: DateRange,
  previousPeriod: DateRange,
  airlineId?: number,
  destinationId?: string
) {
  return apiCall(`${API_BASE_URL}/airline-destination`, {
    method: 'POST',
    body: JSON.stringify({
      currentPeriod,
      previousPeriod,
      airlineId,
      destinationId
    })
  });
}

/**
 * Sedmična analiza sa filterima
 */
export async function getWeeklyFilteredAnalysis(
  startDate: string,
  endDate: string,
  airlineId?: number,
  destinationId?: string
) {
  return apiCall(`${API_BASE_URL}/weekly-filtered`, {
    method: 'POST',
    body: JSON.stringify({
      startDate,
      endDate,
      airlineId,
      destinationId
    })
  });
}

/**
 * Mjesečna analiza sa filterima
 */
export async function getMonthlyFilteredAnalysis(
  startDate: string,
  endDate: string,
  airlineId?: number,
  destinationId?: string
) {
  return apiCall(`${API_BASE_URL}/monthly-filtered`, {
    method: 'POST',
    body: JSON.stringify({
      startDate,
      endDate,
      airlineId,
      destinationId
    })
  });
}

export async function getCustomFilteredAnalysis(
  startDate: string,
  endDate: string,
  airlineId?: number,
  destinationId?: string,
  comparisonPeriod?: string
) {
  return apiCall(`${API_BASE_URL}/custom-filtered`, {
    method: 'POST',
    body: JSON.stringify({
      startDate,
      endDate,
      airlineId,
      destinationId,
      comparisonPeriod
    })
  });
}

/**
 * Očisti cache
 */
export function clearCache(pattern?: string) {
  if (pattern) {
    // Očisti specifične cache ključeve
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    // Očisti sav cache
    cache.clear();
  }
}

/**
 * Provjeri cache status
 */
export function getCacheStatus() {
  const now = Date.now();
  const entries = Array.from(cache.entries()).map(([key, value]) => ({
    key,
    age: now - value.timestamp,
    ttl: value.ttl,
    expired: now - value.timestamp > value.ttl
  }));
  
  return {
    totalEntries: cache.size,
    entries,
    expiredEntries: entries.filter(e => e.expired).length
  };
}

/**
 * Automatsko čišćenje isteklih cache zapisa
 */
export function cleanupExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > value.ttl) {
      cache.delete(key);
    }
  }
}

// Pokreni cleanup svakih 5 minuta
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}

/**
 * Preload podataka za brže učitavanje
 */
export async function preloadAnalytics() {
  try {
    // Preload cached analytics
    getCachedAnalytics();
    
    // Preload current week comparison
    getWeeklyComparison();
    
    // Preload current month comparison  
    getMonthlyComparison();
    
    console.log('Analytics preload started');
  } catch (error) {
    console.warn('Analytics preload failed:', error);
  }
}

/**
 * Batch API pozivi za efikasniju komunikaciju
 */
export async function getBatchAnalytics(requests: Array<{
  type: 'weekly' | 'monthly' | 'yearly' | 'trends' | 'anomalies';
  params?: any;
}>) {
  // Za sada, pozovi svaki API pojedinačno
  // U budućnosti, možemo implementirati batch endpoint
  const results = await Promise.allSettled(
    requests.map(async (request) => {
      switch (request.type) {
        case 'weekly':
          return getWeeklyComparison(request.params?.date);
        case 'monthly':
          return getMonthlyComparison(request.params?.date);
        case 'yearly':
          return getYearlyComparison(request.params?.year);
        case 'trends':
          return getWeeklyTrends(request.params?.startDate, request.params?.endDate);
        case 'anomalies':
          return detectAnomalies(request.params?.currentPeriod, request.params?.previousPeriod);
        default:
          throw new Error(`Nepoznat tip zahtjeva: ${request.type}`);
      }
    })
  );
  
  return results.map((result, index) => ({
    type: requests[index].type,
    status: result.status,
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null
  }));
}

/**
 * Real-time updates (WebSocket ili polling)
 */
export class AnalyticsRealTimeUpdater {
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: Array<(data: any) => void> = [];
  
  start(intervalMs = 30000) { // 30 sekundi
    if (this.intervalId) return;
    
    this.intervalId = setInterval(async () => {
      try {
        const data = await getCachedAnalytics();
        this.callbacks.forEach(callback => callback(data));
      } catch (error) {
        console.warn('Real-time update failed:', error);
      }
    }, intervalMs);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  subscribe(callback: (data: any) => void) {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }
}

// Singleton instance za real-time updates
export const analyticsUpdater = new AnalyticsRealTimeUpdater();
