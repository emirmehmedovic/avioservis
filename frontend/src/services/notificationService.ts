import { 
  ExpirationNotification, 
  NotificationStats, 
  NotificationFilters, 
  NotificationResponse 
} from '@/types/notification';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

class NotificationService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Check both possible token storage locations (same as apiService)
    let token = localStorage.getItem('authToken');
    
    // If token not found in 'authToken', try 'token' as fallback
    if (!token) {
      token = localStorage.getItem('token');
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Check for token expiration (401 Unauthorized)
      if (response.status === 401) {
        // Token is invalid or expired
        console.warn('Notification service: Token expired or invalid');
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        // Don't redirect here as it might interfere with other components
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get all expiration notifications with optional filters
  async getExpirationNotifications(filters: NotificationFilters = {}): Promise<NotificationResponse> {
    const params = new URLSearchParams();
    
    if (filters.vehicleId) params.append('vehicleId', filters.vehicleId.toString());
    if (filters.notificationType) params.append('notificationType', filters.notificationType);
    if (filters.isRead !== undefined) params.append('isRead', filters.isRead.toString());
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const endpoint = `/api/notifications/expirations${queryString ? `?${queryString}` : ''}`;
    
    return this.request<NotificationResponse>(endpoint);
  }

  // Get notifications for a specific vehicle
  async getVehicleNotifications(vehicleId: number): Promise<{ notifications: ExpirationNotification[] }> {
    return this.request<{ notifications: ExpirationNotification[] }>(`/api/notifications/expirations/vehicle/${vehicleId}`);
  }

  // Get notification statistics
  async getNotificationStats(): Promise<NotificationStats> {
    return this.request<NotificationStats>('/api/notifications/expirations/stats');
  }

  // Mark notification as read
  async markAsRead(notificationId: number): Promise<{ notification: ExpirationNotification }> {
    return this.request<{ notification: ExpirationNotification }>(`/api/notifications/expirations/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<{ message: string; updatedCount: number }> {
    return this.request<{ message: string; updatedCount: number }>('/api/notifications/expirations/read-all', {
      method: 'PUT',
    });
  }

  // Dismiss notification (mark as inactive)
  async dismissNotification(notificationId: number): Promise<{ notification: ExpirationNotification }> {
    return this.request<{ notification: ExpirationNotification }>(`/api/notifications/expirations/${notificationId}/dismiss`, {
      method: 'PUT',
    });
  }
}

export const notificationService = new NotificationService();
