import { Rezervoar, CreateRezervoarRequest, UpdateRezervoarRequest } from '@/types/rezervoar';
import { fetchWithAuth } from '@/lib/apiService';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

export const rezervoarService = {
  async getAll(): Promise<Rezervoar[]> {
    return fetchWithAuth<Rezervoar[]>(`${BASE_URL}/rezervoari`);
  },

  async getById(id: number): Promise<Rezervoar> {
    return fetchWithAuth<Rezervoar>(`${BASE_URL}/rezervoari/${id}`);
  },

  async create(data: CreateRezervoarRequest): Promise<Rezervoar> {
    const formData = new FormData();
    
    // Add all form fields
    Object.keys(data).forEach(key => {
      const value = (data as any)[key];
      if (value !== undefined && value !== null) {
        if (key === 'dokument' && value instanceof File) {
          formData.append('dokument', value);
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    return fetchWithAuth<Rezervoar>(`${BASE_URL}/rezervoari`, {
      method: 'POST',
      body: formData,
    });
  },

  async update(id: number, data: UpdateRezervoarRequest): Promise<Rezervoar> {
    const formData = new FormData();
    
    // Add all form fields
    Object.keys(data).forEach(key => {
      const value = (data as any)[key];
      if (value !== undefined && value !== null) {
        if (key === 'dokument' && value instanceof File) {
          formData.append('dokument', value);
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    return fetchWithAuth<Rezervoar>(`${BASE_URL}/rezervoari/${id}`, {
      method: 'PUT',
      body: formData,
    });
  },

  async delete(id: number): Promise<void> {
    await fetchWithAuth<void>(`${BASE_URL}/rezervoari/${id}`, {
      method: 'DELETE',
    });
  },

  async generatePDF(id: number): Promise<Blob> {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${BASE_URL}/rezervoari/${id}/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Greška pri generiranju PDF-a: ${errorText}`);
    }

    return response.blob();
  },

  downloadPDF(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async generateFullReport(rezervoarIds: number[]): Promise<void> {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${BASE_URL}/rezervoari/full-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ rezervoarIds }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Greška pri generiranju ukupnog izvještaja: ${errorText}`);
    }

    const blob = await response.blob();
    const reportDate = new Date().toLocaleDateString('bs-BA').replace(/\./g, '');
    const filename = `ukupni-izvjestaj-rezervoari-${reportDate}.pdf`;
    
    this.downloadPDF(blob, filename);
  }
}; 