import express from 'express';
import * as mrnCleanupController from '../controllers/mrnCleanup.controller';
import { authenticateToken, checkRole } from '../middleware/auth';

const router = express.Router();

// All routes require authentication and admin/kontrola role
router.use(authenticateToken);
router.use(checkRole(['ADMIN', 'KONTROLA']));

// Manual cleanup routes
router.post('/fixed-tank/:tankId', mrnCleanupController.cleanupFixedTank);
router.post('/mobile-tank/:tankId', mrnCleanupController.cleanupMobileTank);
router.post('/all-tanks', mrnCleanupController.cleanupAllTanks);

// Information and statistics
router.get('/info', mrnCleanupController.getCleanupInfo);

export default router; 