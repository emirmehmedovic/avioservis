import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { 
  createTransfer, 
  getTransfers, 
  getTransferById, 
  deleteTransfer 
} from '../controllers/physicalTankTransfer.controller';

const router = Router();

// GET /api/physical-tank-transfers - Get all transfers
router.get('/', authenticateToken, requireRole('ADMIN'), getTransfers);

// GET /api/physical-tank-transfers/:id - Get transfer by ID
router.get('/:id', authenticateToken, requireRole('ADMIN'), getTransferById);

// POST /api/physical-tank-transfers - Create new transfer
router.post('/', authenticateToken, requireRole('ADMIN'), createTransfer);

// DELETE /api/physical-tank-transfers/:id - Delete transfer (reverse)
router.delete('/:id', authenticateToken, requireRole('ADMIN'), deleteTransfer);

export default router;
