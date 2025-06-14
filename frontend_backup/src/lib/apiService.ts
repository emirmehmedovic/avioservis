import {
  User,
  LoginResponse,
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

// Type for login credentials, can also be moved to @/types if used elsewhere
interface LoginCredentials {
  username: string;
  password: string;
}

// API_BASE_URL should be the pure base, e.g., http://localhost:3001
// The '/api' part will be added in each function call or within fetchWithAuth if preferred.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Modifikovana fetchWithAuth da bude generička
async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  
  // Podrazumevani headeri
  const defaultHeaders: HeadersInit = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const headers = {
    ...defaultHeaders,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // If response is not JSON, use status text
      errorData = { message: response.statusText };
    }
    console.error('API Error:', errorData);
    throw new Error(errorData.message || `Error ${response.status}`);
  }
  return response.json();
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
  return fetchWithAuth(`${API_BASE_URL}/api/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(vehicleData),
  });
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
  name: string;
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
