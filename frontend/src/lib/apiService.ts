import {
  User as ImportedUser,
  LoginResponse as ImportedLoginResponse,
  Vehicle,
  Company,
  Location,
  CreateVehiclePayload, // For creating new vehicles
  CreateLocationPayload, // For creating new locations
  VehicleImage, // Added VehicleImage
  ServiceRecord,
  CreateServiceRecordPayload,
  UserRole,             // Added UserRole
  CreateUserPayload,    // Added CreateUserPayload
  UpdateUserPayload     // Added UpdateUserPayload
} from '@/types';
import { ReserveFuelResponse } from '@/types/reserveFuel';
import {
  FixedStorageTank,
  TankTransaction,
  FuelIntakeRecord,      // Added FuelIntakeRecord
  FuelIntakeFilters,     // Added FuelIntakeFilters
  FuelIntakeDocument,    // Added FuelIntakeDocument (proactively, might be needed soon)
  FixedTankTransfer,      // Added FixedTankTransfer (proactively)
  FuelType,              // Ensure FuelType is imported for the payload type
  FixedTankStatus,        // Added FixedTankStatus
  Airline,                // Added Airline type
  FuelPriceRule,          // Added FuelPriceRule type
  CreateFuelPriceRulePayload, // Added CreateFuelPriceRulePayload type
  UpdateFuelPriceRulePayload // Added UpdateFuelPriceRulePayload type
} from '@/types/fuel';
import { FuelingOperation } from '@/components/fuel/types/index'; // Import from correct location
import { getSecureFileUrl } from '@/lib/utils';

// Re-export the types needed by other components
export type LoginResponse = ImportedLoginResponse;
export type User = ImportedUser;

// Type for login credentials, can also be moved to @/types if used elsewhere
interface LoginCredentials {
  username: string;
  password: string;
}

// Payload for fixed tank to fixed tank transfer
export interface FixedTankToFixedTankTransferPayload {
  sourceTankId: number;
  destinationTankId: number;
  quantityLiters: number;
}

// API_BASE_URL should be the pure base, e.g., http://localhost:3001
// The '/api' part will be added in each function call or within fetchWithAuth if preferred.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Function to download documents with authentication
export async function downloadDocument(filePathWithinPrivateUploads: string, desiredFilename: string): Promise<void> {
  if (!filePathWithinPrivateUploads) {
    console.error('Error downloading document: filePathWithinPrivateUploads is missing.');
    throw new Error('File path is required for download.');
  }
  try {
    const secureUrl = getSecureFileUrl(filePathWithinPrivateUploads);
    console.log(`Attempting to download from secure URL: ${secureUrl} as ${desiredFilename}`); // For debugging

    const response = await fetchWithAuth<Response>(secureUrl, { // fetchWithAuth will use the full URL, expecting a Response object
      method: 'GET',
      returnRawResponse: true, // Ensure we get the raw response object to call .blob()
    });

    // Convert the response to a blob
    const blob = await response.blob();

    if (blob.size === 0) {
      console.error('Downloaded blob is empty. Check server response and path:', filePathWithinPrivateUploads);
      throw new Error('Downloaded file is empty or path is incorrect.');
    }
    
    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = desiredFilename;
    
    // Append to the document, click it, and remove it
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    // If already redirecting due to an auth error, suppress further errors for this fetch chain
    if (isRedirecting) {
        console.log("Redirecting due to auth error, suppressing further errors for this fetch.");
        return new Promise(() => {}); // Suppress further processing if redirecting
    }
    console.error(`Error downloading document '${desiredFilename}' from path '${filePathWithinPrivateUploads}':`, error);
    throw error;
  }
}

// Modifikovana fetchWithAuth da bude generička
interface FetchWithAuthOptions extends RequestInit {
  returnRawResponse?: boolean;
}

// Flag to prevent multiple redirects
let isRedirecting = false;

// Function to handle automatic logout when token expires
const handleTokenExpiration = () => {
  if (typeof window !== 'undefined') {
    if (isRedirecting) {
      return; // Already handling a redirect
    }
    isRedirecting = true; // Set flag

    console.log('Session expired. Clearing token and redirecting to login.');
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('token'); // Clear fallback token location too
    
    // Redirect to login page with a query parameter
    window.location.href = '/login?sessionExpired=true';
  }
};

export async function fetchWithAuth<T>(urlPath: string, options: FetchWithAuthOptions = {}): Promise<T> {
  // Check both possible token storage locations
  let token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  
  // If token not found in 'authToken', try 'token' as fallback
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('token');
    if (token) {
      console.log('Using token from localStorage.token instead of localStorage.authToken');
    }
  }
  
  // Destructure our custom option and spread the rest for native fetch
  const { returnRawResponse, ...nativeFetchOptions } = options;

  let fullUrl = urlPath;
  // Check if urlPath is relative (starts with '/') and prepend API_BASE_URL
  if (urlPath.startsWith('/')) {
    fullUrl = `${API_BASE_URL}${urlPath}`;
  }

  // Podrazumevani headeri
  const defaultHeaders: HeadersInit = {};
  if (!(nativeFetchOptions.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('No authentication token found in localStorage');
  }

  const headers = {
    ...defaultHeaders,
    ...nativeFetchOptions.headers, // Use headers from nativeFetchOptions
  };

  const response = await fetch(fullUrl, { ...nativeFetchOptions, headers }); // Use fullUrl

  // Check for token expiration (401 Unauthorized)
  if (response.status === 401 || response.status === 403) {
    // Token is invalid or expired, or user is not authorized
    console.error(`Authentication error: ${response.status} for ${urlPath}`);
    handleTokenExpiration(); // This function handles logout and redirection
    return new Promise(() => {}); 
  }

  if (!response.ok) {
    let errorData;
    const responseText = await response.text();
    console.log('Raw error response from server:', responseText); // Log raw response
    try {
      // Try to parse the raw text as JSON
      errorData = JSON.parse(responseText);
    } catch (e) {
      // If parsing fails, use the raw text or status text as the message
      errorData = { message: responseText || response.statusText };
    }
    console.error('API Error:', errorData, 'URL:', fullUrl); // Use fullUrl
    
    // Improved error message extraction
    let errorMessage = errorData.message || `Server error (${response.status})`;
    
    // Handle validation errors from express-validator
    if (errorData.errors && Array.isArray(errorData.errors)) {
      console.log('Validation errors detected:', errorData.errors);
      const validationErrors = errorData.errors.map((err: any) => {
        if (typeof err === 'object') {
          // Handle both {field: message} format and {msg, param} format
          if (err.msg && err.param) {
            return `${err.param}: ${err.msg}`;
          } else {
            return Object.entries(err).map(([key, value]) => `${key}: ${value}`).join(', ');
          }
        }
        return err;
      }).join('; ');
      
      if (validationErrors) {
        errorMessage = `${errorMessage} - ${validationErrors}`;
      }
    }
    
    const errorToThrow = new Error(errorMessage);
    // Dodajemo cijelo parsirano tijelo greške na error objekt za lakši pristup u catch blokovima
    (errorToThrow as any).responseBody = errorData; 
    throw errorToThrow;
  }
  
  // If returnRawResponse is true, return the raw response object
  // This is useful for file downloads where we need the blob, not JSON
  if (returnRawResponse) { // Use the destructured custom option
    return response as unknown as T; // Cast to T, caller must handle it as Response
  }

  // Handle 204 No Content specifically
  if (response.status === 204) {
    // For 204, it's common to return an empty array if an array is expected (e.g., list endpoints)
    // Or null/undefined if an object is expected and 204 means 'not found' or 'no data'.
    // Returning [] as T is a common safe default for list operations.
    return [] as unknown as T;
  }

  // Ako status nije OK, ali nema JSON tijela, response.json() će baciti grešku koju će uhvatiti viši catch blok.
  // Ako je status OK, ali tijelo nije JSON, također će baciti grešku.
  try {
    // For other OK statuses (e.g., 200), expect a JSON body.
    const jsonData = await response.json();
    return jsonData;
  } catch (e) {
    // This catch block handles errors if response.json() fails for an OK status
    // (e.g., 200 OK but the body is not valid JSON).
    console.error(
      `Error parsing JSON response for an OK status (Status: ${response.status}) from URL: ${fullUrl}. Error:`, e
    );
    throw new Error(
      `API returned an OK status (${response.status}) but failed to provide valid JSON from ${fullUrl}.`
    );
  }
}

// --- Auth API --- //
export async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
  // Note: No 'Authorization' header needed for login
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Login API Error:', data);
    throw new Error(data.message || data.errors?.map((e: any) => e.msg).join(', ') || `Error ${response.status}`);
  }
  return data;
}

// --- Vehicle API --- //
export async function createVehicle(vehicleData: CreateVehiclePayload): Promise<Vehicle> {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles`, {
    method: 'POST',
    body: JSON.stringify(vehicleData),
  });
}

export async function getVehicles(): Promise<Vehicle[]> {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles`); // Changed to /vehicles (plural)
}

export async function getVehicleById(id: string): Promise<Vehicle> {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${id}`); // Added function, using /vehicles (plural)
}

export async function updateVehicle(id: number, vehicleData: Partial<Vehicle>): Promise<Vehicle> {
  try {
    console.log('Updating vehicle with ID:', id, 'Data:', vehicleData);
    const response = await fetchWithAuth<Vehicle>(`${API_BASE_URL}/api/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vehicleData),
    });
    console.log('Update successful, response:', response);
    return response;
  } catch (error) {
    console.error(`Error updating vehicle with ID ${id}:`, error);
    throw error;
  }
}

// Funkcija za upload slike vozila
export const uploadVehicleImage = async (vehicleId: string, file: File): Promise<VehicleImage> => {
  const formData = new FormData();
  formData.append('image', file);

  // URL treba da bude kompletan, uključujući API_BASE_URL
  return fetchWithAuth<VehicleImage>(`${API_BASE_URL}/api/vehicles/${vehicleId}/images`, {
    method: 'POST',
    body: formData,
    // Content-Type se ne postavlja manuelno za FormData
  });
};

// Funkcija za brisanje slike vozila
export const deleteVehicleImage = async (vehicleId: string, imageId: number): Promise<{ message: string }> => {
  return fetchWithAuth<{ message: string }>(`${API_BASE_URL}/api/vehicles/${vehicleId}/images/${imageId}`, {
    method: 'DELETE',
  });
};

// Funkcija za postavljanje glavne slike vozila
export const setMainVehicleImage = async (vehicleId: string, imageId: number): Promise<{ message: string; image: VehicleImage }> => {
  return fetchWithAuth<{ message: string; image: VehicleImage }>(`${API_BASE_URL}/api/vehicles/${vehicleId}/images/${imageId}/set-main`, {
    method: 'PATCH',
  });
};

// Add deleteVehicle function
export async function deleteVehicle(id: number): Promise<{ message: string }> {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${id}`, {
    method: 'DELETE',
  });
}

// --- Company API --- //
export async function getCompanies(): Promise<Company[]> {
  return fetchWithAuth(`${API_BASE_URL}/api/companies`);
}

export async function getCompanyById(id: number): Promise<Company> {
  return fetchWithAuth(`${API_BASE_URL}/api/companies/${id}`);
}

export interface CreateCompanyPayload {
  name: string;
}

export async function createCompany(companyData: CreateCompanyPayload): Promise<Company> {
  return fetchWithAuth(`${API_BASE_URL}/api/companies`, {
    method: 'POST',
    body: JSON.stringify(companyData),
  });
}

export interface UpdateCompanyPayload {
  name?: string; // Made name optional
  taxId?: string;
  city?: string;
  address?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
}

export async function updateCompany(id: number, companyData: UpdateCompanyPayload): Promise<Company> {
  return fetchWithAuth(`${API_BASE_URL}/api/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(companyData),
  });
}

export async function deleteCompany(id: number): Promise<{ message: string }> { // Backend returns { message: '...' }
  return fetchWithAuth(`${API_BASE_URL}/api/companies/${id}`, {
    method: 'DELETE',
  });
}

// --- Location API --- //
export async function getLocations(): Promise<Location[]> {
  return fetchWithAuth(`${API_BASE_URL}/api/locations`); // Changed to /locations (plural)
}

export async function createLocation(locationData: CreateLocationPayload): Promise<Location> {
  return fetchWithAuth(`${API_BASE_URL}/api/locations`, { // Changed to /locations (plural)
    method: 'POST',
    body: JSON.stringify(locationData),
  });
}

// --- User Management API --- //
export async function getUsers(): Promise<User[]> {
  return fetchWithAuth(`${API_BASE_URL}/api/users`);
}

export async function createUser(userData: CreateUserPayload): Promise<User> {
  return fetchWithAuth(`${API_BASE_URL}/api/users`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(id: number, userData: UpdateUserPayload): Promise<User> {
  return fetchWithAuth(`${API_BASE_URL}/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
}

export async function deleteUser(id: number): Promise<{ message: string }> {
  return fetchWithAuth(`${API_BASE_URL}/api/users/${id}`, {
    method: 'DELETE',
  });
}

// FIXED STORAGE TANKS -- START

// Upload image for a tank
export const uploadTankImage = async (tankId: number, file: File): Promise<{ image_url: string, message: string }> => {
  const formData = new FormData();
  formData.append('image', file);
  
  return fetchWithAuth<{ image_url: string, message: string }>(`/api/fuel/tanks/${tankId}/image`, {
    method: 'POST',
    body: formData,
  });
};

// Cache for Fixed Tanks
let fixedTanksCache: FixedStorageTank[] | null = null;
let fixedTanksCacheTimestamp: number | null = null;
const CACHE_DURATION_MS = 30000; // Cache for 30 seconds

export const getFixedTanks = async (forceRefresh: boolean = false): Promise<FixedStorageTank[]> => {
  const now = Date.now();
  if (!forceRefresh && fixedTanksCache && fixedTanksCacheTimestamp && (now - fixedTanksCacheTimestamp < CACHE_DURATION_MS)) {
    console.log('Returning fixed tanks from cache');
    return Promise.resolve(fixedTanksCache);
  }

  const url = `${API_BASE_URL}/api/fuel/fixed-tanks`;
  console.log('Fetching fixed tanks from API URL:', url);
  try {
    const data = await fetchWithAuth<FixedStorageTank[]>(url);
    fixedTanksCache = data;
    fixedTanksCacheTimestamp = now;
    return data;
  } catch (error) {
    if (isRedirecting) {
        console.log("Redirecting due to auth error, suppressing further errors for this fetch.");
        return new Promise(() => {});
    }
    console.error('Error fetching fixed tanks:', error);
    throw error;
  }
};

export const createFixedTank = async (data: Partial<Omit<FixedStorageTank, 'id' | 'createdAt' | 'updatedAt' | 'current_quantity_liters'>> & { current_liters?: number } | FormData): Promise<FixedStorageTank> => {
  try {
    let response;
    if (data instanceof FormData) {
      response = await fetchWithAuth<FixedStorageTank>(`${API_BASE_URL}/api/fuel/fixed-tanks`, {
        method: 'POST',
        body: data, // Send FormData directly
      });
    } else {
      response = await fetchWithAuth<FixedStorageTank>(`${API_BASE_URL}/api/fuel/fixed-tanks`, {
        method: 'POST',
        body: JSON.stringify(data),
        // headers: { 'Content-Type': 'application/json' } // fetchWithAuth should handle this
      });
    }
    return response;
  } catch (error: any) { 
    console.error('Error creating fixed tank:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to create fixed tank');
  }
};

export const updateFixedTank = async (tankId: number, data: Partial<FixedStorageTank> | FormData): Promise<FixedStorageTank> => {
  try {
    let response;
    if (data instanceof FormData) {
      // When sending FormData, browser sets the Content-Type header automatically with the correct boundary.
      // Do not set it manually to 'multipart/form-data' as it might miss the boundary string.
      response = await fetchWithAuth<FixedStorageTank>(`${API_BASE_URL}/api/fuel/fixed-tanks/${tankId}`, {
        method: 'PUT',
        body: data, // Send FormData directly
      });
    } else {
      response = await fetchWithAuth<FixedStorageTank>(`${API_BASE_URL}/api/fuel/fixed-tanks/${tankId}`, {
        method: 'PUT',
        body: JSON.stringify(data), // Existing logic for JSON payload
        // headers: { 'Content-Type': 'application/json' } // fetchWithAuth should handle this
      });
    }
        // Clear relevant caches after successful update
        if (response) { // Ensure response is truthy (i.e., update was successful)
          clearAllFixedTankHistoryCacheForTank(tankId);
          clearFixedTankCustomsCache(tankId);
          clearReserveFuelCache(tankId, 'fixed');
          console.log(`Cleared caches for fixed tank ID: ${tankId} after update.`);
        }
    return response;
    
  } catch (error: any) { 
    console.error(`Error updating fixed tank with ID ${tankId}:`, error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to update fixed tank');
  }
};

export const deleteFixedTank = async (tankId: number): Promise<{ message: string }> => {
  return fetchWithAuth(`${API_BASE_URL}/api/fuel/fixed-tanks/${tankId}`, {
    method: 'DELETE',
  });
};

// Cache for Drain Records
let drainRecordsCache: DrainRecord[] | null = null;
let drainRecordsCacheTimestamp: number | null = null;
const DRAIN_RECORDS_CACHE_DURATION_MS = 5 * 60 * 1000; // Cache for 5 minutes

// Interface for DrainRecord - assuming it might be defined elsewhere, adding a basic one if not
// If DrainRecord is already imported or defined globally, this might not be strictly necessary here
// For the sake of this example, let's assume it needs a local reference or import.
// Ensure DrainRecord is properly typed based on your application's needs.
interface DrainRecord {
  id: number;
  dateTime: string;
  sourceId: number;
  sourceName: string;
  sourceType: 'fixed' | 'mobile';
  quantityLiters: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number;
  userName: string;
  originalDrainId?: number;
  mrnBreakdown?: string; 
}

export const clearDrainRecordsCache = () => {
  drainRecordsCache = null;
  drainRecordsCacheTimestamp = null;
  console.log('Drain records cache cleared.');
};

export const getDrainRecords = async (forceRefresh: boolean = false): Promise<DrainRecord[]> => {
  const now = Date.now();
  if (!forceRefresh && drainRecordsCache && drainRecordsCacheTimestamp && (now - drainRecordsCacheTimestamp < DRAIN_RECORDS_CACHE_DURATION_MS)) {
    console.log('Returning cached drain records.');
    return Promise.resolve([...drainRecordsCache]);
  }
  console.log(forceRefresh ? 'Forcing refresh for drain records.' : 'Fetching drain records from API.');
  const records = await fetchWithAuth<DrainRecord[]>(`${API_BASE_URL}/api/fuel/drains/records`);
  // Assuming records might need parsing for mrnBreakdown similar to DrainedFuelOperations.tsx
  // If parsing is done on the client, the cache should store the raw or parsed version consistently.
  // For now, caching the raw response from API.
  drainRecordsCache = [...records];
  drainRecordsCacheTimestamp = now;
  return records;
};

// Definicija tipova za MRN podatke
export interface CustomsBreakdownItem {
  mrn: string;
  quantity: number;
  date_received: string;
}

export interface CustomsBreakdownResponse {
  tank?: any;
  customs_breakdown?: Array<{
    id: number;
    customs_declaration_number: string;
    quantity_liters: number;
    remaining_quantity_liters: number;
    quantity_kg?: number;
    remaining_quantity_kg?: number;
    density_at_intake?: number;
    specific_gravity?: number | null;
    date_added: string;
    supplier_name?: string | null;
  }>;
  total_customs_tracked_liters?: number;
}

// Cache for Fixed Tank Customs Breakdown
const fixedTankCustomsCache: { [key: string]: { data: CustomsBreakdownResponse | CustomsBreakdownItem[], timestamp: number } } = {};
const FIXED_TANK_CUSTOMS_CACHE_DURATION_MS = 2 * 60 * 1000; // Cache for 2 minutes

export const clearFixedTankCustomsCache = (tankId: number) => {
  const cacheKey = `customs-${tankId}`;
  if (fixedTankCustomsCache[cacheKey]) {
    delete fixedTankCustomsCache[cacheKey];
    console.log(`Cleared fixed tank customs cache for key: ${cacheKey}`);
  }
};

// Function for fetching tank customs breakdown (MRN stanje) for fixed tanks
export const getFixedTankCustomsBreakdown = async (tankId: number, forceRefresh: boolean = false): Promise<CustomsBreakdownResponse | CustomsBreakdownItem[]> => {
  const cacheKey = `customs-${tankId}`;
  const now = Date.now();

  if (!forceRefresh && fixedTankCustomsCache[cacheKey] && (now - fixedTankCustomsCache[cacheKey].timestamp < FIXED_TANK_CUSTOMS_CACHE_DURATION_MS)) {
    console.log(`Returning fixed tank customs breakdown from cache for key: ${cacheKey}`);
    return Promise.resolve(fixedTankCustomsCache[cacheKey].data);
  }

  console.log(forceRefresh ? `Forcing refresh for fixed tank customs breakdown for key: ${cacheKey}` : `Fetching fixed tank customs breakdown from API for key: ${cacheKey}`);

  try {
    const url = `${API_BASE_URL}/api/fuel/fixed-tanks/${tankId}/customs-breakdown`;
    const data = await fetchWithAuth<CustomsBreakdownResponse | CustomsBreakdownItem[]>(url);
    fixedTankCustomsCache[cacheKey] = { data, timestamp: now };
    return data;
  } catch (error) {
    console.error(`Error fetching customs breakdown for tank ID ${tankId}:`, error);
    throw error; // Rethrow to be handled by the calling component
  }
};

// Cache for Mobile Tank Customs Breakdown
const mobileTankCustomsCache: { [key: string]: { data: CustomsBreakdownResponse | CustomsBreakdownItem[], timestamp: number } } = {};
const MOBILE_TANK_CUSTOMS_CACHE_DURATION_MS = 2 * 60 * 1000; // Cache for 2 minutes

export const clearMobileTankCustomsCache = (tankId: number) => {
  const cacheKey = `mobile-customs-${tankId}`;
  if (mobileTankCustomsCache[cacheKey]) {
    delete mobileTankCustomsCache[cacheKey];
    console.log(`Cleared mobile tank customs cache for key: ${cacheKey}`);
  }
};

// Function for fetching tank customs breakdown (MRN stanje) for mobile tanks
export const getMobileTankCustomsBreakdown = async (tankId: number, forceRefresh: boolean = false): Promise<CustomsBreakdownResponse | CustomsBreakdownItem[]> => {
  const cacheKey = `mobile-customs-${tankId}`;
  const now = Date.now();
  
  if (!forceRefresh && mobileTankCustomsCache[cacheKey] && (now - mobileTankCustomsCache[cacheKey].timestamp < MOBILE_TANK_CUSTOMS_CACHE_DURATION_MS)) {
    console.log(`Returning mobile tank customs breakdown from cache for key: ${cacheKey}`);
    return Promise.resolve(mobileTankCustomsCache[cacheKey].data);
  }
  
  console.log(forceRefresh ? `Forcing refresh for mobile tank customs breakdown for key: ${cacheKey}` : `Fetching mobile tank customs breakdown from API for key: ${cacheKey}`);
  try {
    const url = `${API_BASE_URL}/api/fuel/tanks/${tankId}/customs-breakdown`;
    const data = await fetchWithAuth<CustomsBreakdownResponse | CustomsBreakdownItem[]>(url);
    mobileTankCustomsCache[cacheKey] = { data, timestamp: now };
    return data;
  } catch (error) {
    console.error(`Error fetching customs breakdown for mobile tank ID ${tankId}:`, error);
    throw error;
  }
};

// Cache for Fixed Tank History
const fixedTankHistoryCache: { [key: string]: { data: TankTransaction[], timestamp: number } } = {};
const FIXED_TANK_HISTORY_CACHE_DURATION_MS = 2 * 60 * 1000; // Cache for 2 minutes

export const clearFixedTankHistoryCache = (tankId: number, startDate?: string | null, endDate?: string | null) => {
  const cacheKey = `history-${tankId}-${startDate || 'all'}-${endDate || 'all'}`;
  if (fixedTankHistoryCache[cacheKey]) {
    delete fixedTankHistoryCache[cacheKey];
    console.log(`Cleared fixed tank history cache for key: ${cacheKey}`);
  }
};

export const clearAllFixedTankHistoryCacheForTank = (tankId: number) => {
  Object.keys(fixedTankHistoryCache).forEach(key => {
    if (key.startsWith(`history-${tankId}-`)) {
      delete fixedTankHistoryCache[key];
      console.log(`Cleared fixed tank history cache for key: ${key}`);
    }
  });
};

// Function for fetching tank history
export const getFixedTankHistory = async (
  tankId: number,
  startDate?: string | null, // Optional startDate
  endDate?: string | null,    // Optional endDate
  forceRefresh: boolean = false
): Promise<TankTransaction[]> => {
  const cacheKey = `history-${tankId}-${startDate || 'all'}-${endDate || 'all'}`;
  const now = Date.now();

  if (!forceRefresh && fixedTankHistoryCache[cacheKey] && (now - fixedTankHistoryCache[cacheKey].timestamp < FIXED_TANK_HISTORY_CACHE_DURATION_MS)) {
    console.log(`Returning fixed tank history from cache for key: ${cacheKey}`);
    return Promise.resolve(fixedTankHistoryCache[cacheKey].data);
  }

  console.log(forceRefresh ? `Forcing refresh for fixed tank history for key: ${cacheKey}` : `Fetching fixed tank history from API for key: ${cacheKey}`);

  try {
    const params = new URLSearchParams();
    if (startDate) {
      params.append('startDate', startDate);
    }
    if (endDate) {
      params.append('endDate', endDate);
    }
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/fuel/fixed-tanks/${tankId}/history${queryString ? `?${queryString}` : ''}`;
    
    console.log(`Fetching tank history from URL: ${url}`);
    console.log(`Environment: ${process.env.NODE_ENV}, API_BASE_URL: ${API_BASE_URL}`);

    const data = await fetchWithAuth<TankTransaction[]>(url);
    
    console.log(`Received tank history data for tank ID ${tankId}:`, data);
    console.log(`Number of transactions: ${data.length}`);
    console.log(`Transaction types:`, data.map(t => t.type));
    
    // Check if there are any 'intake' transactions
    const intakeTransactions = data.filter(t => t.type === 'intake');
    console.log(`Number of 'intake' transactions: ${intakeTransactions.length}`);
    if (intakeTransactions.length > 0) {
      console.log('Sample intake transaction:', intakeTransactions[0]);
    }

    fixedTankHistoryCache[cacheKey] = { data, timestamp: now };
    return data;

  } catch (error) {
    console.error(`Error fetching tank history for tank ID ${tankId} with params: ${JSON.stringify({startDate, endDate})}:`, error);
    throw error; // Rethrow to be handled by the calling component
  }
};

// Function for fetching total fuel intake across all fixed tanks
export const getTotalFixedTankIntake = async (
  startDate?: string | null,
  endDate?: string | null
): Promise<{ totalIntake: number }> => {
  const queryParams = new URLSearchParams();
  if (startDate) {
    queryParams.append('startDate', startDate);
  }
  if (endDate) {
    queryParams.append('endDate', endDate);
  }
  const url = `${API_BASE_URL}/api/fuel/fixed-tanks/summary/total-intake?${queryParams.toString()}`;
  return fetchWithAuth<{ totalIntake: number }>(url);
};

// Function for fetching a list of all intake transactions across all fixed tanks
export const getAllFixedTankIntakesList = async (
  startDate?: string | null,
  endDate?: string | null
): Promise<TankTransaction[]> => {
  const queryParams = new URLSearchParams();
  if (startDate) {
    queryParams.append('startDate', startDate);
  }
  if (endDate) {
    queryParams.append('endDate', endDate);
  }
  const url = `${API_BASE_URL}/api/fuel/fixed-tanks/summary/all-intakes-list?${queryParams.toString()}`;
  return fetchWithAuth<TankTransaction[]>(url);
};

// Function for transferring fuel between two fixed tanks
export const createFixedTankToFixedTankTransfer = async (
  payload: FixedTankToFixedTankTransferPayload
): Promise<any> => { // Consider a more specific return type based on backend response
  const url = `${API_BASE_URL}/api/fuel/fixed-tanks/internal-transfer`;
  return fetchWithAuth<any>(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// --- Fuel Intake API --- //

// Payload for creating a new Fuel Intake Record
// This matches the backend expectation: FuelIntakeRecord data + FixedTankTransfers array
export interface CreateFuelIntakePayload {
  delivery_vehicle_plate: string;
  delivery_vehicle_driver_name?: string | null;
  intake_datetime: string; // ISO date-time string
  quantity_liters_received: number;
  quantity_kg_received: number;
  specific_gravity: number;
  fuel_type: string; // Fuel type as string (e.g., 'DIESEL', 'JET_A1')
  fuel_category: string; // New field for category (Izvoz/Domaće tržište)
  refinery_name?: string | null; // Added refinery_name field
  supplier_name?: string | null;
  delivery_note_number?: string | null;
  customs_declaration_number?: string | null;
  price_per_kg?: number | null; // Price per kilogram
  currency?: string | null; // Currency (BAM, EUR, USD)
  total_price?: number | null; // Total price calculated as price_per_kg * quantity_kg_received
  tank_distributions: Array<{
    tank_id: number; // Corresponds to fixed_storage_tank_id in FixedTankTransfers model
    quantity_liters: number; // Corresponds to quantity_liters_transferred
    // transfer_datetime will be set by backend (DEFAULT NOW() or from intake_datetime)
    // notes are optional and not currently captured in the wizard's TankDistributionData
  }>;
}

export const createFuelIntake = async (payload: CreateFuelIntakePayload): Promise<FuelIntakeRecord> => {
  const url = `${API_BASE_URL}/api/fuel/intakes`;
  return fetchWithAuth<FuelIntakeRecord>(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const uploadFuelIntakeDocument = async (
  intakeRecordId: number,
  file: File,
  documentType: string
): Promise<FuelIntakeDocument> => {
  const formData = new FormData();
  formData.append('document', file); // Changed 'file' to 'document' to match backend Multer config
  formData.append('document_type', documentType);
  formData.append('document_name', file.name); // Added document_name based on original file name

  const url = `${API_BASE_URL}/api/fuel/intakes/${intakeRecordId}/documents`;
  return fetchWithAuth<FuelIntakeDocument>(url, {
    method: 'POST',
    body: formData,
    // Content-Type is not set manually for FormData, fetch handles it
  });
};

// Existing getFuelIntakes function (if any, or other fuel related functions)
export const getFuelIntakes = async (filters?: Partial<FuelIntakeFilters>): Promise<FuelIntakeRecord[]> => {
  const queryParams = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        queryParams.append(key, String(value));
      }
    });
  }
  const url = `${API_BASE_URL}/api/fuel/intakes?${queryParams.toString()}`;
  console.log('Fetching fuel intakes from URL:', url);
  try {
    const data = await fetchWithAuth<FuelIntakeRecord[]>(url);
    return data;
  } catch (error) {
    console.error('Error fetching fuel intakes:', error);
    throw error;
  }
};

// --- Service Records API --- //

// Get all service records for a vehicle
export async function getVehicleServiceRecords(vehicleId: number | string): Promise<ServiceRecord[]> {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/service-records`);
}

// Get a specific service record
export async function getServiceRecordById(vehicleId: number | string, recordId: number | string): Promise<ServiceRecord> {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/service-records/${recordId}`);
}

// Create a new service record
export async function createServiceRecord(vehicleId: number | string, serviceData: CreateServiceRecordPayload): Promise<ServiceRecord> {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/service-records`, {
    method: 'POST',
    body: JSON.stringify(serviceData),
  });
}

// Update a service record
export async function updateServiceRecord(
  vehicleId: number | string, 
  recordId: number | string, 
  serviceData: Partial<ServiceRecord>
): Promise<ServiceRecord> {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/service-records/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify(serviceData),
  });
}

// Delete a service record
export async function deleteServiceRecord(vehicleId: number | string, recordId: number | string): Promise<{ message: string }> {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/service-records/${recordId}`, {
    method: 'DELETE',
  });
}

// --- Profile API --- //
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  return fetchWithAuth(`${API_BASE_URL}/api/profile/password`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// Upload a PDF document for a service record
export const uploadServiceRecordDocument = async (
  vehicleId: number | string, 
  recordId: number | string, 
  file: File
): Promise<{ documentUrl: string }> => {
  const formData = new FormData();
  formData.append('document', file);

  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/service-records/${recordId}/document`, {
    method: 'POST',
    body: formData,
  });
};

// Upload a PDF document when creating a service record (single request with both data and file)
export const createServiceRecordWithDocument = async (
  vehicleId: number | string, 
  serviceData: Omit<CreateServiceRecordPayload, 'documentUrl'>, 
  file?: File
): Promise<ServiceRecord> => {
  const formData = new FormData();
  
  // Add service data as JSON string in a field
  formData.append('data', JSON.stringify(serviceData));
  
  // Add file if provided
  if (file) {
    formData.append('document', file);
  }

  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/service-records/with-document`, {
    method: 'POST',
    body: formData,
  });
};

// Upload a technical document for a vehicle
export const uploadTechnicalDocument = async (
  vehicleId: number | string,
  title: string,
  documentType: string,
  file: File
): Promise<{ id: number; fileUrl: string; title: string; documentType: string; uploadedAt: string; vehicleId: number }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('documentType', documentType);

  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/technical-documents`, {
    method: 'POST',
    body: formData,
  });
};

// Delete a technical document
export const deleteTechnicalDocument = async (
  vehicleId: number | string,
  documentId: number | string
): Promise<{ message: string }> => {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/technical-documents/${documentId}`, {
    method: 'DELETE',
  });
};

// Upload a filter document for a vehicle
export const uploadFilterDocument = async (
  vehicleId: number | string,
  title: string,
  documentType: string,
  file: File
): Promise<{ id: number; fileUrl: string; title: string; documentType: string; uploadedAt: string; vehicleId: number }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('documentType', documentType);

  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/filter-documents`, {
    method: 'POST',
    body: formData,
  });
};

// Delete a filter document
export const deleteFilterDocument = async (
  vehicleId: number | string,
  documentId: number | string
): Promise<{ message: string }> => {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/filter-documents/${documentId}`, {
    method: 'DELETE',
  });
};

// Upload a hose document for a vehicle
export const uploadHoseDocument = async (
  vehicleId: number | string,
  title: string,
  documentType: string,
  file: File
): Promise<{ id: number; fileUrl: string; title: string; documentType: string; uploadedAt: string; vehicleId: number }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('documentType', documentType);

  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/hose-documents`, {
    method: 'POST',
    body: formData,
  });
};

// Delete a hose document
export const deleteHoseDocument = async (
  vehicleId: number | string,
  documentId: number | string
): Promise<{ message: string }> => {
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${vehicleId}/hose-documents/${documentId}`, {
    method: 'DELETE',
  });
};


// Tanks cache for /api/fuel/tanks endpoint
let tanksCache: { data: FuelTank[] | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

// Cached function for /api/fuel/tanks endpoint
// Cache duration for tanks API
const TANKS_CACHE_DURATION_MS = 30000; // Cache for 30 seconds

export const getCachedTanks = async (forceRefresh: boolean = false): Promise<FuelTank[]> => {
  const now = Date.now();
  if (!forceRefresh && tanksCache.data && (now - tanksCache.timestamp < TANKS_CACHE_DURATION_MS)) {
    console.log('Returning cached tanks data');
    return tanksCache.data;
  }
  console.log(forceRefresh ? 'Forcing refresh for tanks data' : 'Fetching fresh tanks data');
  const data = await fetchWithAuth<FuelTank[]>('/api/fuel/tanks');
  
  // Filtriramo cisterne označene kao obrisane (is_deleted: true)
  const filteredData = data.filter(tank => !tank.is_deleted);
  
  tanksCache = { data: filteredData, timestamp: now };
  return filteredData;
};

export const clearTanksCache = () => {
  console.log('Clearing tanks cache');
  tanksCache = { data: null, timestamp: 0 };
};

// Function to get total fuel amount from both fixed tanks and mobile tankers
export const getTotalFuelSummary = async (): Promise<{ fixedTanksTotal: number; mobileTanksTotal: number; grandTotal: number }> => {
  try {
    // Get fixed tanks data
    const fixedTanks = await getFixedTanks();
    
    // Get mobile tanks data - use cached function
    const mobileTanks = await getMobileTanks();
    
    // Calculate totals
    const fixedTanksTotal = fixedTanks.reduce((sum, tank) => {
      // Ensure values are converted to numbers before adding
      const amount = tank.current_quantity_liters !== undefined && tank.current_quantity_liters !== null
        ? parseFloat(tank.current_quantity_liters.toString())
        : 0;
      return sum + (Number.isNaN(amount) ? 0 : amount);
    }, 0);
    const mobileTanksTotal = mobileTanks.reduce((sum, tank) => {
      // Use current_liters since it's the standard property for mobile tanks
      // Ensure values are converted to numbers before adding
      let tankAmount = 0;
      if (tank.current_liters !== undefined && tank.current_liters !== null) {
        tankAmount = parseFloat(tank.current_liters.toString());
      }
      
      // Use Number.isNaN to ensure valid number
      return sum + (Number.isNaN(tankAmount) ? 0 : tankAmount);
    }, 0);
    
    return {
      fixedTanksTotal,
      mobileTanksTotal,
      grandTotal: fixedTanksTotal + mobileTanksTotal
    };
  } catch (error) {
    // If already redirecting due to an auth error, suppress further errors for this fetch chain
    if (isRedirecting) {
        console.log("Redirecting due to auth error, suppressing further errors for this fetch.");
        return new Promise(() => {}); // Suppress further processing if redirecting
    }
    console.error('Error fetching fuel summary:', error);
    throw error; // Re-throw other errors
  }
};

// Interface for mobile tanks (tankers)
export interface FuelTank {
  id: number;
  identifier: string;
  name: string;
  location: string;
  location_description?: string;
  capacity_liters: number;
  current_liters: number;
  current_quantity_liters?: number; // Added for compatibility
  is_deleted?: boolean; // Flag za soft delete funkcionalnost
  fuel_type: string;
  last_refill_date?: string;
  last_maintenance_date?: string;
  image_url?: string; // URL to the tank image
}

// --- Airline API --- //
// Cache for Airlines
let airlinesCache: Airline[] | null = null;
let airlinesCacheTimestamp: number | null = null;
const AIRLINE_CACHE_DURATION_MS = 5 * 60 * 1000; // Cache for 5 minutes

export const clearAirlinesCache = () => {
  airlinesCache = null;
  airlinesCacheTimestamp = null;
  console.log('Airlines cache cleared');
};

export async function getAirlines(forceRefresh: boolean = false): Promise<Airline[]> {
  const now = Date.now();
  if (!forceRefresh && airlinesCache && airlinesCacheTimestamp && (now - airlinesCacheTimestamp < AIRLINE_CACHE_DURATION_MS)) {
    console.log('Returning airlines from cache');
    return Promise.resolve(airlinesCache);
  }

  console.log(forceRefresh ? 'Forcing refresh for airlines' : 'Fetching airlines from API');
  // Corrected API endpoint to match what AirlineManagement.tsx uses
  const data = await fetchWithAuth<Airline[]>('/api/fuel/airlines'); 
  airlinesCache = data;
  airlinesCacheTimestamp = now;
  return data;
}

// --- Mobile Tank API --- //
export interface MobileTank {
  id: number;
  name: string;
  identifier: string;
  capacity_liters: number;
  current_liters: number;
  fuel_type: string;
  status: string;
  // Add other fields if necessary, based on actual API response
}

let mobileTanksCache: MobileTank[] | null = null;
let mobileTanksCacheTimestamp: number | null = null;
const MOBILE_TANK_CACHE_DURATION_MS = 5 * 60 * 1000; // Cache for 5 minutes

export const clearMobileTanksCache = () => {
  mobileTanksCache = null;
  mobileTanksCacheTimestamp = null;
  console.log('Mobile tanks cache cleared');
};

export async function getMobileTanks(forceRefresh: boolean = false): Promise<MobileTank[]> {
  const now = Date.now();
  if (!forceRefresh && mobileTanksCache && mobileTanksCacheTimestamp && (now - mobileTanksCacheTimestamp < MOBILE_TANK_CACHE_DURATION_MS)) {
    console.log('Returning mobile tanks from cache');
    return Promise.resolve(mobileTanksCache);
  }

  console.log(forceRefresh ? 'Forcing refresh for mobile tanks' : 'Fetching mobile tanks from API');
  const data = await fetchWithAuth<MobileTank[]>('/api/fuel/tanks');
  mobileTanksCache = data;
  mobileTanksCacheTimestamp = now;
  return data;
}

// --- Fuel Price Rules API --- //
let fuelPriceRulesCache: { data: FuelPriceRule[] | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

export async function getFuelPriceRules(): Promise<FuelPriceRule[]> {
  return fetchWithAuth<FuelPriceRule[]>(`${API_BASE_URL}/api/fuel-price-rules`);
}

// Cache duration for fuel price rules
const FUEL_PRICE_RULES_CACHE_DURATION_MS = 30000; // Cache for 30 seconds

export const getCachedFuelPriceRules = async (forceRefresh: boolean = false): Promise<FuelPriceRule[]> => {
  const now = Date.now();
  if (!forceRefresh && fuelPriceRulesCache.data && (now - fuelPriceRulesCache.timestamp < FUEL_PRICE_RULES_CACHE_DURATION_MS)) {
    console.log('Returning cached fuel price rules');
    return fuelPriceRulesCache.data;
  }
  console.log(forceRefresh ? 'Forcing refresh for fuel price rules' : 'Fetching fresh fuel price rules');
  const data = await getFuelPriceRules();
  fuelPriceRulesCache = { data, timestamp: now };
  return data;
};

export const clearFuelPriceRulesCache = () => {
  console.log('Clearing fuel price rules cache');
  fuelPriceRulesCache = { data: null, timestamp: 0 };
};

export async function createFuelPriceRule(payload: CreateFuelPriceRulePayload): Promise<FuelPriceRule> {
  return fetchWithAuth<FuelPriceRule>(`${API_BASE_URL}/api/fuel-price-rules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFuelPriceRule(id: number, payload: UpdateFuelPriceRulePayload): Promise<FuelPriceRule> {
  return fetchWithAuth<FuelPriceRule>(`${API_BASE_URL}/api/fuel-price-rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// --- Fueling Operations API --- //

// --- Excess Fuel API --- //

// Payload za procesiranje viška goriva
export interface ProcessExcessFuelPayload {
  mobileTankId: number;
  litersQuantity: number;
  notes?: string;
}

// Tip za excess fuel history zapis
export interface ExcessFuelRecord {
  id: number;
  tankId: number;
  tankName: string;
  excessLiters: number;
  processedAt: string;
  notes?: string;
  processedBy: string;
}

// Funkcija za procesiranje viška goriva
export function processExcessFuel(payload: ProcessExcessFuelPayload): Promise<{ success: boolean; message: string }> {
  return fetchWithAuth('/api/fuel/excess', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

// Funkcija za dohvaćanje povijesti obrade viška goriva
export function getExcessFuelHistory(): Promise<ExcessFuelRecord[]> {
  return fetchWithAuth('/api/fuel/excess/history');
}

// Update a fueling operation
export async function updateFuelingOperation(id: number, payload: Partial<FuelingOperation>): Promise<FuelingOperation> {
  return fetchWithAuth<FuelingOperation>(`${API_BASE_URL}/api/fuel/fueling-operations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// --- Reserve Fuel API --- //

// Cache for Reserve Fuel by Tank
const reserveFuelCache: { [key: string]: { data: ReserveFuelResponse, timestamp: number } } = {};
const RESERVE_FUEL_CACHE_DURATION_MS = 2 * 60 * 1000; // Cache for 2 minutes

export const clearReserveFuelCache = (tankId: number, tankType: 'fixed' | 'mobile') => {
  const cacheKey = `reserve-${tankType}-${tankId}`;
  if (reserveFuelCache[cacheKey]) {
    delete reserveFuelCache[cacheKey];
    console.log(`Cleared reserve fuel cache for key: ${cacheKey}`);
  }
};

export async function getReserveFuelByTank(tankId: number, tankType: 'fixed' | 'mobile' = 'fixed', forceRefresh: boolean = false): Promise<ReserveFuelResponse> {
  const cacheKey = `reserve-${tankType}-${tankId}`;
  const now = Date.now();
  if (!forceRefresh && reserveFuelCache[cacheKey] && (now - reserveFuelCache[cacheKey].timestamp < RESERVE_FUEL_CACHE_DURATION_MS)) {
    console.log('Returning reserve fuel from cache');
    return Promise.resolve(reserveFuelCache[cacheKey].data);
  }

  console.log(forceRefresh ? 'Forcing refresh for reserve fuel' : 'Fetching reserve fuel from API');
  const url = `${API_BASE_URL}/api/reserve-fuel/tank/${tankId}/${tankType}`;
  const data = await fetchWithAuth<ReserveFuelResponse>(url, {
    method: 'GET'
  });
  reserveFuelCache[cacheKey] = { data, timestamp: now };
  return data;
}

// Dispense reserve fuel from a tank
export async function dispenseReserveFuel(
  tankId: number, 
  tankType: 'fixed' | 'mobile' = 'fixed',
  payload: { 
    quantityLiters: number, 
    notes?: string, 
    referenceOperationId?: number | null 
  }
): Promise<{ success: boolean, message: string }> {
  return fetchWithAuth<{ success: boolean, message: string }>(`${API_BASE_URL}/api/reserve-fuel/dispense/${tankId}/${tankType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
