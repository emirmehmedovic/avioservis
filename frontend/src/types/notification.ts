export enum NotificationType {
  WARNING_30_DAYS = 'WARNING_30_DAYS',
  WARNING_15_DAYS = 'WARNING_15_DAYS',
  CRITICAL_7_DAYS = 'CRITICAL_7_DAYS',
  EXPIRED = 'EXPIRED',
}

export interface ExpirationNotification {
  id: number;
  vehicleId: number;
  fieldName: string;
  fieldDisplayName: string;
  expirationDate: string;
  notificationType: NotificationType;
  daysUntilExpiration: number;
  isActive: boolean;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  vehicle: {
    id: number;
    vehicle_name: string;
    license_plate: string;
    status: string;
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    WARNING_30_DAYS: number;
    WARNING_15_DAYS: number;
    CRITICAL_7_DAYS: number;
    EXPIRED: number;
  };
}

export interface NotificationFilters {
  vehicleId?: number;
  notificationType?: NotificationType;
  isRead?: boolean;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationResponse {
  notifications: ExpirationNotification[];
  totalCount: number;
  limit: number;
  offset: number;
}



