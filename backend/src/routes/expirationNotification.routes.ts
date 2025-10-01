import { Router } from 'express';
import {
  getExpirationNotifications,
  getVehicleExpirationNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  getNotificationStats,
} from '../controllers/expirationNotification.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all expiration notifications with optional filters
router.get('/', getExpirationNotifications);

// Get notification statistics
router.get('/stats', getNotificationStats);

// Get notifications for a specific vehicle
router.get('/vehicle/:vehicleId', getVehicleExpirationNotifications);

// Mark notification as read
router.put('/:id/read', markNotificationAsRead);

// Mark all notifications as read
router.put('/read-all', markAllNotificationsAsRead);

// Dismiss notification (mark as inactive)
router.put('/:id/dismiss', dismissNotification);

export default router;








