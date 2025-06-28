export interface OstalaOprema {
  id: number;
  naziv: string;
  mesto_koristenja: string | null;
  vlasnik: string | null;
  standard_opreme: string | null;
  snaga: string | null;
  protok_kapacitet: string | null;
  sigurnosne_sklopke: string | null;
  prinudno_zaustavljanje: string | null;
  napomena: string | null;
  dokument_url: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOstalaOpremaData {
  naziv: string;
  mesto_koristenja?: string;
  vlasnik?: string;
  standard_opreme?: string;
  snaga?: string;
  protok_kapacitet?: string;
  sigurnosne_sklopke?: string;
  prinudno_zaustavljanje?: string;
  napomena?: string;
  dokument_url?: string;
}

export interface UpdateOstalaOpremaData extends CreateOstalaOpremaData {
  id: number;
}

export interface OstalaOpremaResponse {
  oprema: OstalaOprema[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    ukupno: number;
  };
}

export interface OstalaOpremaSearchParams {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface DocumentUploadResponse {
  message: string;
  dokument_url: string;
  oprema: OstalaOprema;
} 