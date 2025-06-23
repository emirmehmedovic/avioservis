import { Router } from 'express';
import {
  createFuelIntakeRecord,
  getAllFuelIntakeRecords,
  getFuelIntakeRecordById,
  updateFuelIntakeRecord,
  deleteFuelIntakeRecord,
  getMrnReport
} from '../controllers/fuelIntakeRecord.controller';
import { authenticateToken, checkRole } from '../middleware/auth';

const router = Router();

// Base path for these routes will be /api/fuel/intake-records

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply role-based access control for all routes
router.use(checkRole(['ADMIN', 'KONTROLA', 'FUEL_OPERATOR']));

router.post('/', createFuelIntakeRecord);
router.get('/', getAllFuelIntakeRecords);
router.get('/mrn-report/:mrn', getMrnReport);
router.get('/:id', getFuelIntakeRecordById);
router.put('/:id', updateFuelIntakeRecord);
router.delete('/:id', deleteFuelIntakeRecord);

export default router;
