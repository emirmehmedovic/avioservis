'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  X, 
  Filter, 
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  ExpirationNotification, 
  NotificationType, 
  NotificationStats, 
  NotificationFilters 
} from '@/types/notification';
import { notificationService } from '@/services/notificationService';
import { toast } from 'react-toastify';

const NotificationPanel: React.FC = () => {
  const [notifications, setNotifications] = useState<ExpirationNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<NotificationFilters>({
    limit: 50,
    offset: 0,
    isActive: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const [notificationsResponse, statsResponse] = await Promise.all([
        notificationService.getExpirationNotifications(filters),
        notificationService.getNotificationStats()
      ]);
      
      setNotifications(notificationsResponse.notifications);
      setTotalCount(notificationsResponse.totalCount);
      setStats(statsResponse);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Greška pri učitavanju obavještenja');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filters]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.EXPIRED:
        return <X className="w-5 h-5 text-red-500" />;
      case NotificationType.CRITICAL_7_DAYS:
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case NotificationType.WARNING_15_DAYS:
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case NotificationType.WARNING_30_DAYS:
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.EXPIRED:
        return 'bg-red-100 border-red-300 text-red-800';
      case NotificationType.CRITICAL_7_DAYS:
        return 'bg-red-100 border-red-300 text-red-800';
      case NotificationType.WARNING_15_DAYS:
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case NotificationType.WARNING_30_DAYS:
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getNotificationText = (type: NotificationType, days: number) => {
    switch (type) {
      case NotificationType.EXPIRED:
        return 'ISTEKLO';
      case NotificationType.CRITICAL_7_DAYS:
        return `KRITIČNO - ${days} dana`;
      case NotificationType.WARNING_15_DAYS:
        return `Upozorenje - ${days} dana`;
      case NotificationType.WARNING_30_DAYS:
        return `Upozorenje - ${days} dana`;
      default:
        return 'Obavještenje';
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      if (stats) {
        setStats(prev => prev ? { ...prev, unread: prev.unread - 1 } : null);
      }
      toast.success('Obavještenje označeno kao pročitano');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Greška pri označavanju obavještenja');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      if (stats) {
        setStats(prev => prev ? { ...prev, unread: 0 } : null);
      }
      toast.success('Sva obavještenja su označena kao pročitana');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Greška pri označavanju obavještenja');
    }
  };

  const handleDismiss = async (notificationId: number) => {
    try {
      await notificationService.dismissNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      if (stats) {
        setStats(prev => prev ? { ...prev, total: prev.total - 1 } : null);
      }
      toast.success('Obavještenje otkazano');
    } catch (error) {
      console.error('Error dismissing notification:', error);
      toast.error('Greška pri otkazivanju obavještenja');
    }
  };

  const handleFilterChange = (key: keyof NotificationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset offset when filters change
    }));
  };

  const loadMore = () => {
    setFilters(prev => ({
      ...prev,
      offset: (prev.offset || 0) + (prev.limit || 50),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Obavještenja o isteku</h1>
              <p className="mt-2 text-gray-600">
                Upravljanje obavještenjima o datumu isteka vozila i opreme
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                Filtri
              </button>
              
              {stats && stats.unread > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Označi sve kao pročitano
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <Bell className="w-8 h-8 text-gray-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Ukupno</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <Eye className="w-8 h-8 text-blue-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Nepročitano</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Kritično</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats.byType.CRITICAL_7_DAYS + stats.byType.EXPIRED}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Upozorenja</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.byType.WARNING_30_DAYS + stats.byType.WARNING_15_DAYS}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tip obavještenja
                </label>
                <select
                  value={filters.notificationType || ''}
                  onChange={(e) => handleFilterChange('notificationType', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Svi tipovi</option>
                  <option value={NotificationType.EXPIRED}>Isteklo</option>
                  <option value={NotificationType.CRITICAL_7_DAYS}>Kritično (7 dana)</option>
                  <option value={NotificationType.WARNING_15_DAYS}>Upozorenje (15 dana)</option>
                  <option value={NotificationType.WARNING_30_DAYS}>Upozorenje (30 dana)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.isRead === undefined ? '' : filters.isRead.toString()}
                  onChange={(e) => handleFilterChange('isRead', e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Svi</option>
                  <option value="false">Nepročitano</option>
                  <option value="true">Pročitano</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Broj po stranici
                </label>
                <select
                  value={filters.limit || 50}
                  onChange={(e) => handleFilterChange('limit', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ limit: 50, offset: 0, isActive: true })}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                >
                  Resetuj filtre
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Učitavanje obavještenja...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nema obavještenja</h3>
              <p className="text-gray-500">Nema obavještenja koja odgovaraju vašim filterima.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {getNotificationIcon(notification.notificationType)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getNotificationColor(notification.notificationType)}`}>
                          {getNotificationText(notification.notificationType, notification.daysUntilExpiration)}
                        </span>
                        
                        {!notification.isRead && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Nepročitano
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {notification.fieldDisplayName}
                      </h3>
                      
                      <p className="text-gray-600 mb-2">
                        <span className="font-medium">Vozilo:</span> {notification.vehicle.vehicle_name} ({notification.vehicle.license_plate})
                      </p>
                      
                      <p className="text-sm text-gray-500 mb-3">
                        <span className="font-medium">Datum isteka:</span> {new Date(notification.expirationDate).toLocaleDateString('bs-BA')}
                        <span className="ml-4">
                          <span className="font-medium">Kreirano:</span> {new Date(notification.createdAt).toLocaleDateString('bs-BA')}
                        </span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200"
                        >
                          <Eye className="w-4 h-4" />
                          Označi kao pročitano
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDismiss(notification.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        <EyeOff className="w-4 h-4" />
                        Otkaži
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Load More Button */}
          {notifications.length < totalCount && (
            <div className="p-4 border-t border-gray-200 text-center">
              <button
                onClick={loadMore}
                className="px-6 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200"
              >
                Učitaj više ({totalCount - notifications.length} preostalo)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
