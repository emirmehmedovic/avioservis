import { Router } from 'express';
import {
  createFuelIntakeRecord,
  getAllFuelIntakeRecords,
  getFuelIntakeRecordById,
  updateFuelIntakeRecord,
  deleteFuelIntakeRecord,
} from '../controllers/fuelIntakeRecord.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Base path for these routes will be /api/fuel/intake-records

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.post('/', createFuelIntakeRecord);
router.get('/', getAllFuelIntakeRecords);
router.get('/:id', getFuelIntakeRecordById);
router.put('/:id', updateFuelIntakeRecord);
router.delete('/:id', deleteFuelIntakeRecord);

export default router;
