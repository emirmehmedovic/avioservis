import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { 
  getRetrofitPreview, 
  executeRetrofit, 
  getRetrofitStatus 
} from '../controllers/physicalTankRetrofit.controller';

const router = Router();

// GET /api/physical-tanks/retrofit/preview - Get retrofit preview
router.get('/preview', authenticateToken, requireRole('ADMIN'), getRetrofitPreview);

// POST /api/physical-tanks/retrofit/execute - Execute retrofit
router.post('/execute', authenticateToken, requireRole('ADMIN'), executeRetrofit);

// GET /api/physical-tanks/retrofit/status - Get retrofit status
router.get('/status', authenticateToken, requireRole('ADMIN'), getRetrofitStatus);

export default router;
