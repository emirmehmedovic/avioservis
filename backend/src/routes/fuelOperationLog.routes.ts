import express from 'express';
import { authenticateToken, checkRole } from '../middleware/auth';
import { 
  getAllFuelOperationLogs, 
  getFuelOperationLogById,
  getFuelOperationsSummary,
  getFuelOperationsTrend,
  getFailedFuelOperations
} from '../controllers/fuelOperationLog.controller';

const router = express.Router();

// Pristup logovima operacija goriva samo za administratore
router.use(authenticateToken);
router.use(checkRole(['ADMIN']));

// GET /api/fuel-operation-logs - dohvaća sve logove operacija s gorivom
router.get('/', getAllFuelOperationLogs);

// GET /api/fuel-operation-logs/summary - dohvaća sumarni izvještaj
router.get('/summary', getFuelOperationsSummary);

// GET /api/fuel-operation-logs/trend - dohvaća trend operacija kroz vrijeme
router.get('/trend', getFuelOperationsTrend);

// GET /api/fuel-operation-logs/failed - dohvaća neuspjele operacije
router.get('/failed', getFailedFuelOperations);

// GET /api/fuel-operation-logs/:id - dohvaća detalje jedne operacije
router.get('/:id', getFuelOperationLogById);

export default router;
