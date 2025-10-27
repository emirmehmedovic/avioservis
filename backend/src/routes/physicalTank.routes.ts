import { Router } from 'express';
import {
  getPhysicalTanks,
  getPhysicalTankById,
  createPhysicalTank,
  updatePhysicalTank,
  deletePhysicalTank,
  getPhysicalTankMrnBreakdown,
  getPhysicalTanksSummary,
  manualUpdatePhysicalTank
} from '../controllers/physicalTank.controller';
import { authenticateToken, checkRole } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply role-based access control for all routes
router.use(checkRole(['ADMIN', 'KONTROLA', 'FUEL_OPERATOR']));

// ============================================================================
// PHYSICAL TANKS ROUTES
// Base path: /api/physical-tanks
// ============================================================================

// GET /api/physical-tanks/summary - Ukupan pregled (mora biti prije /:id rute)
router.get('/summary', getPhysicalTanksSummary);

// GET /api/physical-tanks - Lista svih fizičkih tankova
router.get('/', getPhysicalTanks);

// GET /api/physical-tanks/:id - Detalji jednog tanka
router.get('/:id', getPhysicalTankById);

// POST /api/physical-tanks - Kreiraj novi tank
router.post('/', createPhysicalTank);

// PUT /api/physical-tanks/:id - Ažuriraj tank
router.put('/:id', updatePhysicalTank);

// DELETE /api/physical-tanks/:id - Obriši (deaktiviraj) tank
router.delete('/:id', deletePhysicalTank);

// GET /api/physical-tanks/:id/mrn-breakdown - MRN breakdown za tank
router.get('/:id/mrn-breakdown', getPhysicalTankMrnBreakdown);

// POST /api/physical-tanks/:id/manual-update - Ručno ažuriranje stanja
router.post('/:id/manual-update', manualUpdatePhysicalTank);

export default router;



