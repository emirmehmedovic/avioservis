import express from 'express';
import { createFuelDrainRecord, getAllFuelDrainRecords, getFuelDrainRecordById } from '../controllers/fuelDrain.controller';
import { reverseFuelDrainTransaction } from '../controllers/fuelDrainReverse.controller';
import { processFuelDrainSale } from '../controllers/fuelDrainSale.controller';
import { authenticateToken } from '../middleware/auth';
import { validateDrainRecord } from '../validators/fuelDrain.validator';
import { validateDrainReverseTransaction } from '../validators/fuelDrainReverse.validator';
import { validateDrainSaleTransaction } from '../validators/fuelDrainSale.validator';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Middleware to log request body
const logRequestBody = (req: Request, res: Response, next: NextFunction): void => {
  console.log('[fuelDrain.routes.ts] Request body:', req.body);
  next();
};

// POST /api/fuel/drains - Create a new fuel drain record (formerly /api/fuel/drain)
// Temporarily removed validateDrainRecord for debugging
router.post('/', logRequestBody, /* validateDrainRecord, */ createFuelDrainRecord);

// GET /api/fuel/drains/records - Get all fuel drain records (formerly /api/fuel/drain-records)
router.get('/records', getAllFuelDrainRecords);

// GET /api/fuel/drains/records/:id - Get a specific fuel drain record (formerly /api/fuel/drain-records/:id)
router.get('/records/:id', getFuelDrainRecordById);

// POST /api/fuel/drains/reverse - Process a reverse transaction for drained fuel
router.post('/reverse', logRequestBody, validateDrainReverseTransaction, reverseFuelDrainTransaction);

// POST /api/fuel/drains/sale - Process a sale transaction for drained fuel
router.post('/sale', logRequestBody, validateDrainSaleTransaction, processFuelDrainSale);

export default router;
