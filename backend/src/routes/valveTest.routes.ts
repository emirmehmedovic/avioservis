import { Router } from 'express';
import { 
  getValveTestRecords, 
  getValveTestRecordById, 
  createValveTestRecord, 
  updateValveTestRecord, 
  deleteValveTestRecord 
} from '../controllers/valveTest.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all valve test records for a specific vehicle
router.get('/vehicle/:vehicleId', getValveTestRecords as any);

// Get a specific valve test record by ID
router.get('/:id', getValveTestRecordById as any);

// Create a new valve test record
router.post('/', createValveTestRecord as any);

// Update an existing valve test record
router.put('/:id', updateValveTestRecord as any);

// Delete a valve test record
router.delete('/:id', deleteValveTestRecord as any);

export default router;
