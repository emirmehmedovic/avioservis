'use client';

import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, AlertCircle, Clock, X } from 'lucide-react';
import { ExpirationNotification, NotificationType, NotificationStats } from '@/types/notification';
import { notificationService } from '@/services/notificationService';
import { toast } from 'react-toastify';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ExpirationNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Add custom CSS for scrollbar
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .notification-scroll::-webkit-scrollbar {
        width: 8px;
      }
      .notification-scroll::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 4px;
      }
      .notification-scroll::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 4px;
      }
      .notification-scroll::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch notifications and stats
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [notificationsResponse, statsResponse] = await Promise.all([
        notificationService.getExpirationNotifications({ limit: 10, isActive: true }),
        notificationService.getNotificationStats()
      ]);
      
      setNotifications(notificationsResponse.notifications);
      setStats(statsResponse);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Greška pri učitavanju obavještenja');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.EXPIRED:
        return <X className="w-4 h-4 text-red-500" />;
      case NotificationType.CRITICAL_7_DAYS:
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case NotificationType.WARNING_15_DAYS:
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case NotificationType.WARNING_30_DAYS:
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.EXPIRED:
        return 'bg-red-50 border-red-200 text-red-800';
      case NotificationType.CRITICAL_7_DAYS:
        return 'bg-red-50 border-red-200 text-red-800';
      case NotificationType.WARNING_15_DAYS:
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case NotificationType.WARNING_30_DAYS:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setShowScrollIndicator(!isAtBottom);
  };

  const unreadCount = stats?.unread || 0;

  return (
    <div className={`relative ${className}`}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Obavještenja o isteku
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Označi sve kao pročitano
                  </button>
                )}
              </div>
              
              {/* Stats */}
              {stats && (
                <div className="mt-2 flex gap-4 text-sm">
                  <span className="text-gray-600">
                    Ukupno: <span className="font-medium">{stats.total}</span>
                  </span>
                  <span className="text-red-600">
                    Nepročitano: <span className="font-medium">{stats.unread}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div 
              className="max-h-[350px] overflow-y-auto notification-scroll"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db #f3f4f6'
              }}
              onScroll={handleScroll}
            >
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Učitavanje obavještenja...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nema obavještenja
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.notificationType)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getNotificationColor(notification.notificationType)}`}>
                            {getNotificationText(notification.notificationType, notification.daysUntilExpiration)}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {notification.fieldDisplayName}
                        </p>
                        
                        <p className="text-sm text-gray-600 mb-1">
                          {notification.vehicle.vehicle_name} ({notification.vehicle.license_plate})
                        </p>
                        
                        <p className="text-xs text-gray-500">
                          Ističe: {new Date(notification.expirationDate).toLocaleDateString('bs-BA')}
                        </p>
                      </div>
                      
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Označi kao pročitano
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Scroll Indicator */}
            {showScrollIndicator && (
              <div className="px-4 py-2 bg-gradient-to-t from-white to-transparent border-t border-gray-100 text-center">
                <div className="text-xs text-gray-500 flex items-center justify-center gap-2">
                  <div className="animate-bounce">↓</div>
                  <span>Skroluj za više obavještenja</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page
                  window.location.href = '/dashboard/notifications';
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {notifications.length > 0 ? 'Prikaži sva obavještenja' : 'Prikaži sve obavještenja'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
