import { Router } from 'express';
import { sensitiveOperationsLimiter } from '../middleware/rateLimit';
import { authenticateToken } from '../middleware/auth';
import {
  createFixedTankTransfer,
  getAllFixedTankTransfers,
  getFixedTankTransferById,
  updateFixedTankTransfer,
  deleteFixedTankTransfer,
} from '../controllers/fixedTankTransfer.controller';

const router = Router();

// Base path for these routes will be /api/fuel/transfers

router.post('/', sensitiveOperationsLimiter, authenticateToken, createFixedTankTransfer);
router.get('/', sensitiveOperationsLimiter, authenticateToken, getAllFixedTankTransfers);
router.get('/:id', sensitiveOperationsLimiter, authenticateToken, getFixedTankTransferById);
router.put('/:id', sensitiveOperationsLimiter, authenticateToken, updateFixedTankTransfer);
router.delete('/:id', sensitiveOperationsLimiter, authenticateToken, deleteFixedTankTransfer);

export default router;
