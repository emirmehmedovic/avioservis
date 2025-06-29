import express from 'express';
import * as densityController from '../controllers/densityReconciliation.controller';
import { authenticateToken, checkRole } from '../middleware/auth';

const router = express.Router();

// All routes require authentication and admin/kontrola role
router.use(authenticateToken);
router.use(checkRole(['ADMIN', 'KONTROLA']));

// Reconcile specific tank
router.post('/reconcile/tank/:tankId', densityController.reconcileSingleTank);

// Reconcile all tanks system-wide
router.post('/reconcile/all', densityController.reconcileAllTanks);

// Get density analysis report
router.get('/analysis/report', densityController.getDensityAnalysisReport);

// Analyze density variation for operation
router.post('/analysis/variation', densityController.analyzeDensityVariationForOperation);

// Get tank density info
router.get('/tank/:tankId/density-info', densityController.getTankDensityInfo);

export default router; 