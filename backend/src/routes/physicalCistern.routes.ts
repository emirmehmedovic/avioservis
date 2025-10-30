import express from 'express';
import {
  getPhysicalCisterns,
  getPhysicalCisternById,
  createPhysicalCistern,
  updatePhysicalCistern,
  deletePhysicalCistern,
  getCisternMrnBreakdown,
  getCisternsSummary,
  manualUpdateCistern,
  recalculateCumulativeCisternDensity
} from '../controllers/physicalCistern.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// GET /api/physical-cisterns - Get all physical cisterns
router.get('/', authenticateToken, requireRole('ADMIN'), getPhysicalCisterns);

// GET /api/physical-cisterns/summary - Get cisterns summary
router.get('/summary', authenticateToken, requireRole('ADMIN'), getCisternsSummary);

// POST /api/physical-cisterns/recalculate-density - Recalculate density for all cumulative cisterns
// IMPORTANT: This must be BEFORE /:id routes to avoid matching "recalculate-density" as an ID
router.post('/recalculate-density', authenticateToken, requireRole('ADMIN'), recalculateCumulativeCisternDensity);

// GET /api/physical-cisterns/:id - Get cistern by ID
router.get('/:id', authenticateToken, requireRole('ADMIN'), getPhysicalCisternById);

// POST /api/physical-cisterns - Create new cistern
router.post('/', authenticateToken, requireRole('ADMIN'), createPhysicalCistern);

// PUT /api/physical-cisterns/:id - Update cistern
router.put('/:id', authenticateToken, requireRole('ADMIN'), updatePhysicalCistern);

// DELETE /api/physical-cisterns/:id - Delete cistern (soft delete)
router.delete('/:id', authenticateToken, requireRole('ADMIN'), deletePhysicalCistern);

// GET /api/physical-cisterns/:id/mrn-breakdown - Get cistern MRN breakdown
router.get('/:id/mrn-breakdown', authenticateToken, requireRole('ADMIN'), getCisternMrnBreakdown);

// POST /api/physical-cisterns/:id/manual-update - Manual update cistern quantities
router.post('/:id/manual-update', authenticateToken, requireRole('ADMIN'), manualUpdateCistern);

export default router;
