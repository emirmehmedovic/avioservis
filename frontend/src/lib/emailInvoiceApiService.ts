import { fetchWithAuth } from './apiService';

export interface EmailInvoiceDispatch {
  id: number;
  fuelingOperationId: number;
  airlineId: number;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
  lastError?: string;
  emailTo: string;
  emailSubject: string;
  emailBody?: string;
  pdfFileName: string;
  pdfSha256: string;
  dispatchedAt?: string;
  paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'EXPIRED';
  paymentReceivedAt?: string | null;
  paymentNote?: string | null;
  createdAt: string;
  updatedAt: string;
  airline: {
    id: number;
    name: string;
    contact_details?: string;
  };
  fuelingOperation: {
    id: number;
    dateTime: string;
    aircraft_registration: string;
    quantity_liters: number;
    quantity_kg?: number;
    price_per_kg?: number;
    total_amount: number;
    currency?: string;
    delivery_note_number?: string;
    flight_number?: string;
    destination?: string;
  };
}

export interface EmailInvoiceStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  byAirline: Array<{
    airlineId: number;
    airlineName: string;
    count: number;
    totalAttempts: number;
  }>;
}

export interface EmailDispatchResponse {
  dispatches: EmailInvoiceDispatch[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const listEmailDispatches = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  airlineId?: number;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  deliveryNote?: string;
}): Promise<EmailInvoiceDispatch[]> => {
  const query = new URLSearchParams();
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.status) query.append('status', params.status);
  if (params?.airlineId) query.append('airlineId', String(params.airlineId));
  if (params?.paymentStatus) query.append('paymentStatus', params.paymentStatus);
  if (params?.deliveryNote) query.append('deliveryNote', params.deliveryNote);
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  
  const response = await fetchWithAuth<EmailDispatchResponse>(`/api/invoices/email?${query.toString()}`);
  return response.dispatches;
};

export const manualDispatchEmailDay = async (date: string) => {
  return fetchWithAuth(`/api/invoices/email/dispatch/day/${date}`, {
    method: 'POST',
  });
};

export const manualDispatchEmailOperation = async (operationId: number, force = false) => {
  return fetchWithAuth(`/api/invoices/email/dispatch/operation/${operationId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ force }),
  });
};

export const manualDispatchEmailRange = async (startDate: string, endDate: string) => {
  return fetchWithAuth('/api/invoices/email/dispatch/range', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ startDate, endDate }),
  });
};

export const prepareEmailInvoicesForDay = async (date: string) => {
  return fetchWithAuth(`/api/invoices/email/prepare/day/${date}`, {
    method: 'POST',
  });
};

export const prepareEmailInvoicesForRange = async (startDate: string, endDate: string): Promise<ApiResponse> => {
  return fetchWithAuth('/api/invoices/email/prepare/range', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ startDate, endDate }),
  });
};

export const getEmailInvoiceStats = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<EmailInvoiceStats> => {
  const response = await fetchWithAuth<{ stats: EmailInvoiceStats }>('/api/invoices/email/stats', {
    params,
  });
  return response.stats;
};

export interface EmailPreview {
  to: string | null;
  subject: string;
  body: string;
  hasValidEmail: boolean;
  airline: string;
  operationDate: string;
  deliveryNumber: string | number;
}

export const previewEmailTemplate = async (operationId: number): Promise<EmailPreview> => {
  const response = await fetchWithAuth<{ preview: EmailPreview }>(`/api/invoices/email/preview/${operationId}`);
  return response.preview;
};

// Payment Status Functions
export const updateEmailInvoicePaymentStatus = async (
  dispatchId: number, 
  paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'EXPIRED', 
  paymentNote?: string
): Promise<{ success: boolean; message: string; dispatch: EmailInvoiceDispatch }> => {
  return fetchWithAuth(`/api/invoices/email/payment/${dispatchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentStatus, paymentNote }),
  });
};

export const externalEmailPaymentUpdate = async (
  invoiceNumber: string,
  paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'EXPIRED',
  paymentDate?: string,
  referenceNumber?: string,
  note?: string
): Promise<{ success: boolean; message: string; dispatch: EmailInvoiceDispatch }> => {
  return fetchWithAuth('/api/invoices/email/external-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      invoiceNumber, 
      paymentStatus, 
      paymentDate, 
      referenceNumber, 
      note 
    }),
  });
};
