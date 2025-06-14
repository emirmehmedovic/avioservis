import { Router } from 'express';
import {
  createFuelingOperation,
  getAllFuelingOperations,
  getFuelingOperationById,
  updateFuelingOperation,
  deleteFuelingOperation,
} from '../controllers/fuelingOperation.controller';
import { createFuelingOperationRules, updateFuelingOperationRules, validate } from '../validators/fuelingOperation.validators';
import { uploadMultipleFuelingDocuments } from '../middleware/fuelingDocumentUpload';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// const debugMiddleware = (req: Request, res: Response, next: NextFunction) => {
//   console.log('After Multer - req.body:', req.body);
//   console.log('After Multer - req.file:', req.file);
//   next();
// };

// Base path for these routes will be /api/fuel/fueling-operations

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.post('/', 
  uploadMultipleFuelingDocuments, 
  // debugMiddleware, // Removed debug middleware
  createFuelingOperationRules, 
  validate, 
  createFuelingOperation
);
router.get('/', getAllFuelingOperations);
router.get('/:id', getFuelingOperationById);
router.put('/:id', updateFuelingOperationRules, validate, updateFuelingOperation);
router.delete('/:id', deleteFuelingOperation);

export default router;
