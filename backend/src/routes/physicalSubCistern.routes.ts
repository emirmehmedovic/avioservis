import { Router } from 'express';
import {
  getAllSubCisternsHandler,
  createSubCisternsHandler,
  getSubCisternsHandler,
  updateSubCisternHandler,
  manualUpdateHandler,
  transferHandler,
  deleteSubCisternHandler
} from '../controllers/physicalSubCistern.controller';
import { authenticateToken, checkRole } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply role-based access control for all routes
router.use(checkRole(['ADMIN', 'KONTROLA', 'FUEL_OPERATOR']));

// ============================================================================
// PHYSICAL SUB-CISTERN ROUTES
// Base path: /api/physical-sub-cisterns
// ============================================================================

// GET /api/physical-sub-cisterns - Get all sub-cisterns
router.get('/', getAllSubCisternsHandler);

// GET /api/physical-sub-cisterns/:parentCisternId - Get sub-cisterns for a parent
router.get('/:parentCisternId', getSubCisternsHandler);

// POST /api/physical-sub-cisterns - Create sub-cisterns
router.post('/', createSubCisternsHandler);

// PUT /api/physical-sub-cisterns/:subCisternId - Update sub-cistern
router.put('/:subCisternId', updateSubCisternHandler);

// POST /api/physical-sub-cisterns/:subCisternId/manual-update - Manual reconciliation
router.post('/:subCisternId/manual-update', manualUpdateHandler);

// POST /api/physical-sub-cisterns/transfer - Transfer between sub-cisterns
router.post('/transfer', transferHandler);

// DELETE /api/physical-sub-cisterns/:subCisternId - Delete sub-cistern
router.delete('/:subCisternId', deleteSubCisternHandler);

export default router;
