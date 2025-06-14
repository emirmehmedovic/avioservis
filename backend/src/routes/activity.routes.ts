import { Router } from 'express';
import { reportingLimiter } from '../middleware/rateLimit';
import { getActivities, getActivityTypes } from '../controllers/activity.controller';
import { authenticateToken, checkRole } from '../middleware/auth';

const router = Router();

// Get all activities - accessible only to ADMIN and KONTROLA roles
router.get('/', reportingLimiter, authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getActivities);

// Get activity types for filtering - accessible only to ADMIN and KONTROLA roles
router.get('/types', reportingLimiter, authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getActivityTypes);

export default router;
