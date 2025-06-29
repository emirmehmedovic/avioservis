import { 
  OstalaOprema, 
  CreateOstalaOpremaData, 
  UpdateOstalaOpremaData, 
  OstalaOpremaResponse, 
  OstalaOpremaSearchParams,
  DocumentUploadResponse
} from '../types/ostalaOprema';
import { fetchWithAuth } from '../lib/apiService';

class OstalaOpremaService {
  // Get all ostala oprema with search/pagination
  async getAll(params: OstalaOpremaSearchParams = {}): Promise<OstalaOpremaResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.search) searchParams.append('search', params.search);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    return fetchWithAuth<OstalaOpremaResponse>(`/api/ostala-oprema?${searchParams.toString()}`);
  }

  // Get single ostala oprema by ID
  async getById(id: number): Promise<OstalaOprema> {
    return fetchWithAuth<OstalaOprema>(`/api/ostala-oprema/${id}`);
  }

  // Create new ostala oprema
  async create(data: CreateOstalaOpremaData): Promise<OstalaOprema> {
    return fetchWithAuth<OstalaOprema>('/api/ostala-oprema', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update existing ostala oprema
  async update(id: number, data: UpdateOstalaOpremaData): Promise<OstalaOprema> {
    return fetchWithAuth<OstalaOprema>(`/api/ostala-oprema/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete ostala oprema
  async delete(id: number): Promise<void> {
    return fetchWithAuth<void>(`/api/ostala-oprema/${id}`, {
      method: 'DELETE',
    });
  }

  // Upload document for ostala oprema
  async uploadDocument(id: number, file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('document', file);

    return fetchWithAuth<DocumentUploadResponse>(`/api/ostala-oprema/${id}/upload`, {
      method: 'POST',
      body: formData,
    });
  }

  // Generate PDF report for single ostala oprema
  async generatePDF(id: number): Promise<Blob> {
    // For PDF generation, we need to handle the response differently
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') || localStorage.getItem('token') : null;
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/ostala-oprema/${id}/pdf`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate PDF: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // Generate full report for all ostala oprema
  async generateFullReport(): Promise<Blob> {
    // For PDF generation, we need to handle the response differently
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') || localStorage.getItem('token') : null;
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/ostala-oprema/full-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({}), // Send empty object for all oprema
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate full report: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // Helper method to download PDF
  downloadPDF(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const ostalaOpremaService = new OstalaOpremaService(); 